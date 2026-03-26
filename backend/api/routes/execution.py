"""
Execution simulation API routes.
"""

import sys
import os
import pytz

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

import pandas as pd
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from api.models import (
    SimulationRequest,
    SimulationResponse,
    CompareRequest,
    CompareResponse,
    ExecutionLogEntry,
    CostMetrics,
    StrategyComparison,
)

from data.data_layer.pipeline import get_market_data
from execution.engine import ExecutionEngine, ParentOrder
from execution.strategy_factory import StrategyFactory
from execution.cost_model import (
    compute_arrival_price,
    compute_average_execution_price,
    compute_slippage,
    compute_implementation_shortfall,
    add_participation_rate,
)

from sqlalchemy.orm import Session
from fastapi import Depends

from db.database import get_db
from db.repository import save_experiment
from api.auth import verify_firebase_token
from api.operation_logging import execute_with_failed_operation_logging, record_completed_operation

router = APIRouter(prefix="/execution", tags=["Execution"])

# ==========================================
# HELPERS
# ==========================================


def _build_parent_order(req, market_data) -> ParentOrder:
    market_tz = pytz.timezone("US/Eastern")

    start_date = pd.to_datetime(req.data_start).date()
    end_date   = pd.to_datetime(req.data_end).date()

    # Force regular market hours (9:30 – 16:00 ET)
    start_local = market_tz.localize(pd.Timestamp(f"{start_date} 09:30:00"))
    end_local   = market_tz.localize(pd.Timestamp(f"{end_date} 16:00:00"))

    start_time = start_local.astimezone(pytz.UTC)
    end_time   = end_local.astimezone(pytz.UTC)

    return ParentOrder(
        ticker=req.ticker,
        side=req.side.upper(),
        quantity=req.quantity,
        start_time=start_time,
        end_time=end_time,
    )


def _run_single_strategy(
    market_data: pd.DataFrame,
    order: ParentOrder,
    strategy_name: str,
) -> dict:
    """
    Run a single strategy and compute all cost metrics.
    Returns a dict with 'metrics', 'logs_df', 'log_entries'.
    """
    try:
        strategy = StrategyFactory.create(strategy_name)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    engine = ExecutionEngine(market_data)
    schedule = strategy.generate_schedule(order, market_data)

    if not schedule:
        raise HTTPException(
            status_code=400,
            detail="Strategy generated an empty schedule. Check that the execution window contains market data.",
        )

    logs = engine.run(order, schedule, strategy_name)
    df_logs = pd.DataFrame([vars(l) for l in logs])

    if df_logs.empty:
        raise HTTPException(
            status_code=400,
            detail="Execution produced no fills. Verify execution window and market data coverage.",
        )

    # Cost metrics
    market_reset = market_data.reset_index()
    # Normalize column names for compute_arrival_price
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
    df_logs = add_participation_rate(df_logs)

    metrics = CostMetrics(
        arrival_price=round(arrival_price, 4),
        average_execution_price=round(avg_price, 4),
        slippage=round(slippage_dollars_per_share * 10000, 1),           # bps
        slippage_dollars_per_share=round(slippage_dollars_per_share, 6),
        implementation_shortfall=round(shortfall, 2),
        total_filled_qty=total_qty,
    )
    print("logs are: ")
    print(df_logs)
    print(f"arrival price is: {arrival_price}")

    log_entries = []
    for _, row in df_logs.iterrows():
        log_entries.append(ExecutionLogEntry(
            timestamp=str(row["timestamp"]),
            requested_qty=int(row["requested_qty"]),
            filled_qty=int(row["filled_qty"]),
            execution_price=round(float(row["execution_price"]), 4),
            market_volume=int(row["market_volume"]),
            strategy_name=str(row["strategy_name"]),
            participation_rate=round(float(row["participation_rate"]), 6)
            if pd.notna(row.get("participation_rate")) else None,
        ))

    return {
        "metrics": metrics,
        "log_entries": log_entries,
        "df_logs": df_logs,
    }


# ==========================================
# ENDPOINTS
# ==========================================


@router.get("/strategies")
def list_strategies():
    """List available execution strategies."""
    return {"strategies": StrategyFactory.list_strategies()}


@router.post("/simulate")
def run_simulation(
    req: SimulationRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(verify_firebase_token),  #auth
):
    """
    Run an execution simulation for a single strategy.

    Workflow:
    1. Fetch/load market data
    2. Build parent order
    3. Generate strategy schedule
    4. Execute and compute cost metrics
    """

    print("the requested data is: ")
    print(req)
    def _execute() -> JSONResponse:
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

        order = _build_parent_order(req,market_data)

        result = _run_single_strategy(market_data, order, req.strategy)

        df_logs = result["df_logs"]
        print(df_logs)
        experiment_id = save_experiment(
            db=db,
            order=order,
            strategy=req.strategy,
            metrics=result["metrics"],
            df_logs=df_logs,
            firebase_uid=user["uid"],
        )

        response = SimulationResponse(
            order={
                "ticker": order.ticker,
                "side": order.side,
                "quantity": order.quantity,
                "start_time": str(order.start_time),
                "end_time": str(order.end_time),
            },
            strategy=req.strategy,
            metrics=result["metrics"],
            execution_logs=result["log_entries"],
        )
        response_dict = response.dict()

        operation = record_completed_operation(
            db=db,
            firebase_uid=user["uid"],
            operation_type="simulate",
            request_payload=req.dict(),
            response_payload=response_dict,
            experiment_id=experiment_id,
        )
        response_dict["operation_id"] = str(operation.id)

        return JSONResponse(content=response_dict)

    return execute_with_failed_operation_logging(
        db=db,
        firebase_uid=user["uid"],
        operation_type="simulate",
        request_payload=req.dict(),
        executor=_execute,
    )


@router.post("/compare", response_model=CompareResponse)
def compare_strategies(
    req: CompareRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(verify_firebase_token),  #auth
):
    """
    Compare TWAP and VWAP on the same parent order.
    Returns metrics for both and a recommendation.
    """
    def _execute() -> CompareResponse:
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
            raise HTTPException(status_code=404, detail="No market data available.")

        order = _build_parent_order(req,market_data)

        comparisons = []
        results = {}

        for strat_name in ["TWAP", "VWAP"]:
            result = _run_single_strategy(market_data, order, strat_name)
            comparisons.append(StrategyComparison(
                strategy=strat_name,
                metrics=result["metrics"],
            ))
            results[strat_name] = result["metrics"]

        # Recommend the strategy with lower absolute slippage
        twap_slip = abs(results["TWAP"].slippage)
        vwap_slip = abs(results["VWAP"].slippage)

        if vwap_slip < twap_slip:
            recommendation = (
                f"VWAP produced lower slippage (${vwap_slip:.4f}) vs TWAP (${twap_slip:.4f}). "
                "VWAP is recommended for this execution window."
            )
        elif twap_slip < vwap_slip:
            recommendation = (
                f"TWAP produced lower slippage (${twap_slip:.4f}) vs VWAP (${vwap_slip:.4f}). "
                "TWAP is recommended for this execution window."
            )
        else:
            recommendation = "Both strategies produced equal slippage. Either is acceptable."

        response_payload = CompareResponse(
            order={
                "ticker": order.ticker,
                "side": order.side,
                "quantity": order.quantity,
                "start_time": str(order.start_time),
                "end_time": str(order.end_time),
            },
            comparisons=comparisons,
            recommendation=recommendation,
        )

        response_dict = response_payload.dict()
        operation = record_completed_operation(
            db=db,
            firebase_uid=user["uid"],
            operation_type="compare",
            request_payload=req.dict(),
            response_payload=response_dict,
        )
        response_dict["operation_id"] = str(operation.id)

        return CompareResponse(**response_dict)

    return execute_with_failed_operation_logging(
        db=db,
        firebase_uid=user["uid"],
        operation_type="compare",
        request_payload=req.dict(),
        executor=_execute,
    )
