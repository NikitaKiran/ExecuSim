# # from data.data_layer.downloader import download_market_data
# # from data.data_layer.preprocess import preprocess_market_data
# # from data.data_layer.preprocess import add_derived_metrics
# # from data.data_layer.pipeline import get_market_data
# # from execution.cost_model import *
# # from execution.engine import ExecutionEngine, ParentOrder
# # from execution.strategies import TWAPStrategy, VWAPStrategy

# # df = get_market_data(
# #     ticker="AAPL",
# #     start="2026-01-20",
# #     end="2026-02-05",
# #     interval="5m"
# # )

# # df = preprocess_market_data(df)
# # df = add_derived_metrics(df)
# # print(df.head())



# # print(df.head())




# # # Example:
# # execution_df = df_twap   # from notebook output
# # market_df = market_data  # from Phase 1

# # arrival_price = compute_arrival_price(
# #     market_df,
# #     order.start_time
# # )

# # avg_price = compute_average_execution_price(execution_df)

# # total_qty = execution_df["filled_qty"].sum()

# # slippage = compute_slippage(
# #     avg_price,
# #     arrival_price,
# #     order.side
# # )

# # shortfall = compute_implementation_shortfall(
# #     avg_price,
# #     arrival_price,
# #     total_qty,
# #     order.side
# # )

# # execution_df = add_participation_rate(execution_df)

# # print("Arrival Price:", arrival_price)
# # print("Average Execution Price:", avg_price)
# # print("Slippage:", slippage)
# # print("Implementation Shortfall:", shortfall)
# from data.data_layer.pipeline import get_market_data
# from data.data_layer.preprocess import preprocess_market_data, add_derived_metrics

# from execution.engine import ExecutionEngine, ParentOrder
# from execution.strategies import TWAPStrategy, VWAPStrategy
# from execution.cost_model import *

# import pandas as pd


# # ==============================
# # 1️⃣ Load Market Data
# # ==============================

# market_data = get_market_data(
#     ticker="AAPL",
#     start="2026-01-01",
#     end="2026-02-24",
#     interval="5m"
# )

# print(market_data.head())


# # ==============================
# # 2️⃣ Define Parent Order
# # ==============================

# order = ParentOrder(
#     ticker="AAPL",
#     side="BUY",
#     quantity=50000,
#     # start_time=pd.Timestamp("2026-01-01 10:00:00"),
#     # end_time=pd.Timestamp("2026-02-25 12:00:00")
#     start_time=pd.Timestamp("2026-01-30 10:00:00", tz="UTC"),
#     end_time=pd.Timestamp("2026-02-10 12:00:00", tz="UTC")
# )


# # ==============================
# # 3️⃣ Run Execution Engine
# # ==============================

# engine = ExecutionEngine(market_data)

# # ---- TWAP ----
# twap = TWAPStrategy()
# twap_schedule = twap.generate_schedule(order, market_data)
# twap_logs = engine.run(order, twap_schedule, "TWAP")

# df_twap = pd.DataFrame([vars(l) for l in twap_logs])

# # ---- VWAP ----
# vwap = VWAPStrategy()
# vwap_schedule = vwap.generate_schedule(order, market_data)
# vwap_logs = engine.run(order, vwap_schedule, "VWAP")

# df_vwap = pd.DataFrame([vars(l) for l in vwap_logs])


# # ==============================
# # 4️⃣ Phase 3 Cost Model (Example: TWAP)
# # ==============================

# arrival_price = compute_arrival_price(
#     market_data.reset_index().rename(columns={"index": "datetime", "Close": "close"}),
#     order.start_time
# )

# avg_price = compute_average_execution_price(df_twap)

# total_qty = df_twap["filled_qty"].sum()

# slippage = compute_slippage(
#     avg_price,
#     arrival_price,
#     order.side
# )

# shortfall = compute_implementation_shortfall(
#     avg_price,
#     arrival_price,
#     total_qty,
#     order.side
# )

# df_twap = add_participation_rate(df_twap)

# print("\n--- TWAP COST METRICS ---")
# print("Arrival Price:", arrival_price)
# print("Average Execution Price:", avg_price)
# print("Slippage:", slippage)
# print("Implementation Shortfall:", shortfall)

# main.py

from data.data_layer.pipeline import get_market_data
from data.data_layer.preprocess import preprocess_market_data, add_derived_metrics

from execution.engine import ExecutionEngine, ParentOrder
from execution.strategies import TWAPStrategy, VWAPStrategy
from execution.cost_model import *

import pandas as pd

# ==============================
# 1️⃣ Load Market Data
# ==============================

market_data = get_market_data(
    ticker="AAPL",
    start="2025-12-30",
    end="2026-02-26",
    interval="1d"
)

print("\n--- Raw Market Data ---")
print(market_data.head())

# ==============================
# 2️⃣ Define Parent Order
# ==============================

order = ParentOrder(
    ticker="AAPL",
    side="BUY",
    quantity=50000,
    start_time=pd.Timestamp("2026-01-30 10:00:00", tz="UTC"),
    end_time=pd.Timestamp("2026-02-10 12:00:00", tz="UTC")
)

# ==============================
# 3️⃣ Run Execution Engine
# ==============================

engine = ExecutionEngine(market_data)

# ---- TWAP Strategy ----
twap = TWAPStrategy()
twap_schedule = twap.generate_schedule(order, market_data)
twap_logs = engine.run(order, twap_schedule, "TWAP")
df_twap = pd.DataFrame([vars(l) for l in twap_logs])

# print("\n--- TWAP Execution Logs ---")
# print(df_twap.head())

# ---- VWAP Strategy ----
vwap = VWAPStrategy()
vwap_schedule = vwap.generate_schedule(order, market_data)
vwap_logs = engine.run(order, vwap_schedule, "VWAP")
df_vwap = pd.DataFrame([vars(l) for l in vwap_logs])
# print("\n--- VWAP Execution Logs ---")

# ==============================
# 4️⃣ Compute Phase 3 Cost Metrics
# ==============================

# --- TWAP Metrics ---
arrival_price_twap = compute_arrival_price(
    market_data.reset_index().rename(columns={"index": "datetime", "Close": "close"}),
    order.start_time
)
avg_price_twap = compute_average_execution_price(df_twap)
total_qty_twap = df_twap["filled_qty"].sum()
slippage_twap = compute_slippage(avg_price_twap, arrival_price_twap, order.side)
shortfall_twap = compute_implementation_shortfall(avg_price_twap, arrival_price_twap, total_qty_twap, order.side)
df_twap = add_participation_rate(df_twap)

print("\n--- TWAP COST METRICS ---")
print("Arrival Price:", arrival_price_twap)
print("Average Execution Price:", avg_price_twap)
print("Slippage:", slippage_twap)
print("Implementation Shortfall:", shortfall_twap)

# --- VWAP Metrics ---
arrival_price_vwap = compute_arrival_price(
    market_data.reset_index().rename(columns={"index": "datetime", "Close": "close"}),
    order.start_time
)
avg_price_vwap = compute_average_execution_price(df_vwap)
total_qty_vwap = df_vwap["filled_qty"].sum()
slippage_vwap = compute_slippage(avg_price_vwap, arrival_price_vwap, order.side)
shortfall_vwap = compute_implementation_shortfall(avg_price_vwap, arrival_price_vwap, total_qty_vwap, order.side)
df_vwap = add_participation_rate(df_vwap)

print("\n--- VWAP COST METRICS ---")
print("Arrival Price:", arrival_price_vwap)
print("Average Execution Price:", avg_price_vwap)
print("Slippage:", slippage_vwap)
print("Implementation Shortfall:", shortfall_vwap)

# ==============================
# 5️⃣ Optional: View Participation Rates
# ==============================

print("\n--- TWAP logs ---")
print(df_twap[['timestamp','filled_qty','market_volume','participation_rate','strategy_name']])

print("\n--- VWAP logs ---")
print(df_vwap[['timestamp','filled_qty','market_volume','participation_rate','strategy_name']])

# ==============================
# 6️⃣ Phase 5 — GA Optimization
# ==============================

from optimization.ga_optimizer import GAOptimizer


# -----------------------------------
# Define Evaluation Function
# -----------------------------------

def execution_cost_function(params):
    """
    This function will be called by GA.
    It must return implementation shortfall (lower is better).
    """

    # Create VWAP strategy with tunable parameters
    vwap_strategy = VWAPStrategy(
        slice_frequency=params["slice_frequency"],
        participation_cap=params["participation_cap"],
        aggressiveness=params["aggressiveness"]
    )

    schedule = vwap_strategy.generate_schedule(order, market_data)
    if not schedule:
        return 1e12  # Large penalty
    logs = engine.run(order, schedule, "GA_OPTIMIZED")
    if not logs:
        return 1e12
    
    df = pd.DataFrame([vars(l) for l in logs])

    arrival_price = compute_arrival_price(
        market_data.reset_index().rename(columns={"index": "datetime", "Close": "close"}),
        order.start_time
    )

    avg_price = compute_average_execution_price(df)
    total_qty = df["filled_qty"].sum()
    if total_qty == 0:
        return 1e12

    shortfall = compute_implementation_shortfall(
        avg_price,
        arrival_price,
        total_qty,
        order.side
    )

    return shortfall


# -----------------------------------
# Define Parameter Bounds
# -----------------------------------

param_bounds = {
    "slice_frequency": (5, 60, "int"),
    "participation_cap": (0.01, 0.25, "float"),
    "aggressiveness": (0.8, 1.5, "float"),
}


# -----------------------------------
# Run Genetic Algorithm
# -----------------------------------

optimizer = GAOptimizer(
    evaluation_function=execution_cost_function,
    param_bounds=param_bounds,
    population_size=20,
    generations=10,
)

ga_result = optimizer.optimize()

print("\n--- GA OPTIMIZATION RESULT ---")
print("Best Parameters:", ga_result["best_parameters"])
print("Best Shortfall:", ga_result["best_cost"])


# -----------------------------------
# Compare Against VWAP Baseline
# -----------------------------------

improvement = ((shortfall_vwap - ga_result["best_cost"]) / shortfall_vwap) * 100

print("\n--- IMPROVEMENT OVER VWAP ---")
print(f"Improvement: {improvement:.2f}%")

from optimization.ga_optimizer import GAOptimizer

# Dummy evaluation function (simple test)
def test_evaluation(params):
    # We want to minimize (x-3)^2 + (y-5)^2
    x = params["x"]
    y = params["y"]
    return (x - 3)**2 + (y - 5)**2


if __name__ == "__main__":

    param_bounds = {
        "x": (0, 10, "float"),
        "y": (0, 10, "float"),
    }

    optimizer = GAOptimizer(
        evaluation_function=test_evaluation,
        param_bounds=param_bounds,
        population_size=20,
        generations=15,
    )

    result = optimizer.optimize()

    print("\nOptimization Result:")
    print(result)