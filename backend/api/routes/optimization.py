"""
Optimization API routes — GA-based parameter tuning for execution strategies.
"""

import sys
import os
import pytz

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

import pandas as pd
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from api.models import (
    OptimizationRequest,
    OptimizationResultResponse,
    OptimizationParamsResponse,
    OptimizationParamBound,
    EvaluateParamsRequest,
    EvaluateParamsResponse,
    CostMetrics,
)

from data.data_layer.pipeline import get_market_data
from execution.engine import ExecutionEngine, ParentOrder
from execution.strategies import VWAPStrategy
from execution.cost_model import (
    compute_arrival_price,
    compute_average_execution_price,
    compute_slippage,
    compute_implementation_shortfall,
    add_participation_rate,
)
from optimization.ga_optimizer import GAOptimizer

from sqlalchemy.orm import Session
from fastapi import Depends

from db.database import get_db
from db.repository import save_experiment

router = APIRouter(prefix="/optimization", tags=["Optimization"])

# ==========================================
# DEFAULT PARAMETER BOUNDS
# ==========================================

DEFAULT_PARAM_BOUNDS = {
    "slice_frequency": (1, 10, "int"),
    "volume_participation_cap": (0.01, 1.0, "float"),
    "aggressiveness": (0.1, 2.0, "float"),
}

# ==========================================
# HELPERS
# ==========================================




def _build_order(req, market_data) -> ParentOrder:

    first_day = market_data.index[0].date()

    market_tz = pytz.timezone("US/Eastern")

    # Interpret user input as market time
    start_local = market_tz.localize(pd.Timestamp(f"{first_day} {req.start_time}"))
    end_local = market_tz.localize(pd.Timestamp(f"{first_day} {req.end_time}"))

    # Convert to UTC (matches market_data index)
    start_time = start_local.astimezone(pytz.UTC)
    end_time = end_local.astimezone(pytz.UTC)

    return ParentOrder(
        ticker=req.ticker,
        side=req.side,
        quantity=req.quantity,
        start_time=start_time,
        end_time=end_time,
    )


def _make_vwap_strategy(params: dict):
    """
    Instantiate VWAPStrategy with optional tuning parameters.
    Falls back to no-arg constructor if the class doesn't support them.
    """
    kwargs = {
        "slice_frequency": int(params.get("slice_frequency", 1)),
        "participation_cap": float(params.get("participation_cap", 1.0)),
        "aggressiveness": float(params.get("aggressiveness", 1.0)),
    }
    try:
        return VWAPStrategy(**kwargs)
    except TypeError:
        # VWAPStrategy doesn't accept these kwargs — use default constructor
        # and store params as attributes for schedule generation
        strategy = VWAPStrategy()
        strategy.slice_frequency = kwargs["slice_frequency"]
        strategy.participation_cap = kwargs["participation_cap"]
        strategy.aggressiveness = kwargs["aggressiveness"]
        return strategy


def _compute_cost(params: dict, market_data: pd.DataFrame, order: ParentOrder) -> float:
    """
    Evaluate a set of VWAP parameters.
    Returns cost = absolute implementation shortfall (lower is better).
    """
    strategy = _make_vwap_strategy(params)

    engine = ExecutionEngine(market_data)
    schedule = strategy.generate_schedule(order, market_data)

    if not schedule:
        return float("inf")

    logs = engine.run(order, schedule, "VWAP")
    df_logs = pd.DataFrame([vars(l) for l in logs])

    if df_logs.empty or df_logs["filled_qty"].sum() == 0:
        return float("inf")

    market_reset = market_data.reset_index()
    rename_map = {}
    if "datetime" not in market_reset.columns:
        for col in market_reset.columns:
            if "date" in col.lower() or "time" in col.lower():
                rename_map[col] = "datetime"
                break
    if "close" not in market_reset.columns and "Close" in market_reset.columns:
        rename_map["Close"] = "close"
    if rename_map:
        market_reset = market_reset.rename(columns=rename_map)

    arrival_price = compute_arrival_price(market_reset, order.start_time)
    avg_price = compute_average_execution_price(df_logs)
    total_qty = int(df_logs["filled_qty"].sum())
    shortfall = compute_implementation_shortfall(avg_price, arrival_price, total_qty, order.side)
    

    return abs(shortfall)


def _run_with_params(params: dict, market_data: pd.DataFrame, order: ParentOrder) -> CostMetrics:
    """
    Run VWAP with explicit parameters and return full CostMetrics.
    """
    strategy = _make_vwap_strategy(params)

    engine = ExecutionEngine(market_data)
    schedule = strategy.generate_schedule(order, market_data)

    if not schedule:
        raise HTTPException(
            status_code=400,
            detail="Strategy generated an empty schedule with the given parameters.",
        )

    logs = engine.run(order, schedule, "VWAP")
    df_logs = pd.DataFrame([vars(l) for l in logs])

    if df_logs.empty or df_logs["filled_qty"].sum() == 0:
        raise HTTPException(
            status_code=400,
            detail="Execution produced no fills with the given parameters.",
        )

    market_reset = market_data.reset_index()
    rename_map = {}
    if "datetime" not in market_reset.columns:
        for col in market_reset.columns:
            if "date" in col.lower() or "time" in col.lower():
                rename_map[col] = "datetime"
                break
    if "close" not in market_reset.columns and "Close" in market_reset.columns:
        rename_map["Close"] = "close"
    if rename_map:
        market_reset = market_reset.rename(columns=rename_map)

    arrival_price = compute_arrival_price(market_reset, order.start_time)
    avg_price = compute_average_execution_price(df_logs)
    total_qty = int(df_logs["filled_qty"].sum())
    slippage_dollars_per_share = compute_slippage(avg_price, arrival_price, order.side)

    shortfall = compute_implementation_shortfall(avg_price, arrival_price, total_qty, order.side)

    return CostMetrics(
        arrival_price=round(arrival_price, 4),
        average_execution_price=round(avg_price, 4),
        slippage=round(slippage_dollars_per_share * 10000, 1),           # bps
        slippage_dollars_per_share=round(slippage_dollars_per_share, 6),
        implementation_shortfall=round(shortfall, 2),
        total_filled_qty=total_qty,
    )


# ==========================================
# ENDPOINTS
# ==========================================


@router.get("/params", response_model=OptimizationParamsResponse)
def list_optimization_params():
    """
    List the VWAP parameters that the GA optimizer can tune,
    along with their bounds and data types.
    """
    params = []
    for name, (low, high, dtype) in DEFAULT_PARAM_BOUNDS.items():
        params.append(OptimizationParamBound(
            name=name,
            min_value=low,
            max_value=high,
            dtype=dtype,
        ))
    return OptimizationParamsResponse(parameters=params)


@router.post("/optimize")
def run_optimization(req: OptimizationRequest, db: Session = Depends(get_db)):
    """
    Run the Genetic Algorithm optimizer to find the best VWAP parameters
    (slice_frequency, volume_participation_cap, aggressiveness) that minimize
    implementation shortfall for the given order.

    Workflow:
    1. Fetch market data
    2. Build parent order
    3. Create evaluation function (closure over market data & order)
    4. Run GAOptimizer
    5. Return best parameters and resulting cost metrics
    """
    try:
        market_data = get_market_data(
            ticker=req.ticker,
            start=req.data_start,
            end=req.data_end,
            interval=req.interval,
        )
        market_data.index = market_data.index.tz_convert("UTC")
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Market data error: {str(e)}")

    if market_data.empty:
        raise HTTPException(status_code=404, detail="No market data available for the specified range.")

    order = _build_order(req,market_data)

    # Build evaluation closure for the GA
    def eval_fn(params: dict) -> float:
        return _compute_cost(params, market_data, order)

    optimizer = GAOptimizer(
        evaluation_function=eval_fn,
        param_bounds=DEFAULT_PARAM_BOUNDS,
        population_size=req.population_size,
        generations=req.generations,
        seed=req.seed,
    )

    try:
        result = optimizer.optimize()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)}")

    best_params = result["best_parameters"]
    best_cost = result["best_cost"]

    # Run once more with best params to get full metrics
    best_metrics = _run_with_params(best_params, market_data, order)

    # Run again to obtain logs for persistence
    strategy = _make_vwap_strategy(best_params)

    engine = ExecutionEngine(market_data)

    schedule = strategy.generate_schedule(order, market_data)

    logs = engine.run(order, schedule, "VWAP_GA")

    df_logs = pd.DataFrame([vars(l) for l in logs])

    df_logs = add_participation_rate(df_logs)

    experiment_id = save_experiment(
        db=db,
        order=order,
        strategy="VWAP_GA",
        metrics=best_metrics,
        df_logs=df_logs,
        params=best_params,
        seed=req.seed,
        workers=req.population_size,
    )

    response = OptimizationResultResponse(
        best_parameters=best_params,
        best_cost=round(best_cost, 4),
        generations_run=req.generations,
        population_size=req.population_size,
        best_strategy_metrics=best_metrics,
    )

    response_dict = response.dict()
    response_dict["experiment_id"] = str(experiment_id)

    return JSONResponse(content=response_dict)


@router.post("/evaluate", response_model=EvaluateParamsResponse)
def evaluate_params(req: EvaluateParamsRequest):
    """
    Evaluate a specific set of VWAP parameters without running the full GA.
    Useful for manual exploration or validating optimizer results.

    Returns the implementation shortfall cost and full metrics.
    """
    try:
        market_data = get_market_data(
            ticker=req.ticker,
            start=req.data_start,
            end=req.data_end,
            interval=req.interval,
        )
        market_data.index = market_data.index.tz_convert("UTC")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Market data error: {str(e)}")

    if market_data.empty:
        raise HTTPException(status_code=404, detail="No market data available for the specified range.")

    order = _build_order(req,market_data)

    params = {
        "slice_frequency": req.slice_frequency,
        "participation_cap": req.participation_cap,
        "aggressiveness": req.aggressiveness,
    }

    cost = _compute_cost(params, market_data, order)
    metrics = _run_with_params(params, market_data, order)

    print("metrics are")

    print(metrics)

    return EvaluateParamsResponse(
        parameters=params,
        cost=round(cost, 4),
        metrics=metrics,
    )
