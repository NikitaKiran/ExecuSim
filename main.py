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








# # main.py

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
#     start="2025-12-30",
#     end="2026-02-26",
#     interval="1d"
# )

# print("\n--- Raw Market Data ---")
# print(market_data.head())

# # ==============================
# # 2️⃣ Define Parent Order
# # ==============================

# order = ParentOrder(
#     ticker="AAPL",
#     side="BUY",
#     quantity=50000,
#     start_time=pd.Timestamp("2026-01-30 10:00:00", tz="UTC"),
#     end_time=pd.Timestamp("2026-02-10 12:00:00", tz="UTC")
# )

# # ==============================
# # 3️⃣ Run Execution Engine
# # ==============================

# engine = ExecutionEngine(market_data)

# # ---- TWAP Strategy ----
# twap = TWAPStrategy()
# twap_schedule = twap.generate_schedule(order, market_data)
# twap_logs = engine.run(order, twap_schedule, "TWAP")
# df_twap = pd.DataFrame([vars(l) for l in twap_logs])

# # print("\n--- TWAP Execution Logs ---")
# # print(df_twap.head())

# # ---- VWAP Strategy ----
# vwap = VWAPStrategy()
# vwap_schedule = vwap.generate_schedule(order, market_data)
# vwap_logs = engine.run(order, vwap_schedule, "VWAP")
# df_vwap = pd.DataFrame([vars(l) for l in vwap_logs])
# # print("\n--- VWAP Execution Logs ---")

# # ==============================
# # 4️⃣ Compute Phase 3 Cost Metrics
# # ==============================

# # --- TWAP Metrics ---
# arrival_price_twap = compute_arrival_price(
#     market_data.reset_index().rename(columns={"index": "datetime", "Close": "close"}),
#     order.start_time
# )
# avg_price_twap = compute_average_execution_price(df_twap)
# total_qty_twap = df_twap["filled_qty"].sum()
# slippage_twap = compute_slippage(avg_price_twap, arrival_price_twap, order.side)
# shortfall_twap = compute_implementation_shortfall(avg_price_twap, arrival_price_twap, total_qty_twap, order.side)
# df_twap = add_participation_rate(df_twap)

# print("\n--- TWAP COST METRICS ---")
# print("Arrival Price:", arrival_price_twap)
# print("Average Execution Price:", avg_price_twap)
# print("Slippage:", slippage_twap)
# print("Implementation Shortfall:", shortfall_twap)

# # --- VWAP Metrics ---
# arrival_price_vwap = compute_arrival_price(
#     market_data.reset_index().rename(columns={"index": "datetime", "Close": "close"}),
#     order.start_time
# )
# avg_price_vwap = compute_average_execution_price(df_vwap)
# total_qty_vwap = df_vwap["filled_qty"].sum()
# slippage_vwap = compute_slippage(avg_price_vwap, arrival_price_vwap, order.side)
# shortfall_vwap = compute_implementation_shortfall(avg_price_vwap, arrival_price_vwap, total_qty_vwap, order.side)
# df_vwap = add_participation_rate(df_vwap)

# print("\n--- VWAP COST METRICS ---")
# print("Arrival Price:", arrival_price_vwap)
# print("Average Execution Price:", avg_price_vwap)
# print("Slippage:", slippage_vwap)
# print("Implementation Shortfall:", shortfall_vwap)

# # ==============================
# # 5️⃣ Optional: View Participation Rates
# # ==============================

# print("\n--- TWAP logs ---")
# print(df_twap[['timestamp','filled_qty','market_volume','participation_rate','strategy_name']])

# print("\n--- VWAP logs ---")
# print(df_vwap[['timestamp','filled_qty','market_volume','participation_rate','strategy_name']])

# # ==============================
# # 6️⃣ Phase 5 — GA Optimization
# # ==============================

# from optimization.ga_optimizer import GAOptimizer


# # -----------------------------------
# # Define Evaluation Function
# # -----------------------------------

# def execution_cost_function(params):
#     """
#     This function will be called by GA.
#     It must return implementation shortfall (lower is better).
#     """

#     # Create VWAP strategy with tunable parameters
#     vwap_strategy = VWAPStrategy(
#         slice_frequency=params["slice_frequency"],
#         participation_cap=params["participation_cap"],
#         aggressiveness=params["aggressiveness"]
#     )

#     schedule = vwap_strategy.generate_schedule(order, market_data)
#     if not schedule:
#         return 1e12  # Large penalty
#     logs = engine.run(order, schedule, "GA_OPTIMIZED")
#     if not logs:
#         return 1e12
    
#     df = pd.DataFrame([vars(l) for l in logs])

#     arrival_price = compute_arrival_price(
#         market_data.reset_index().rename(columns={"index": "datetime", "Close": "close"}),
#         order.start_time
#     )

#     avg_price = compute_average_execution_price(df)
#     total_qty = df["filled_qty"].sum()
#     if total_qty == 0:
#         return 1e12

#     shortfall = compute_implementation_shortfall(
#         avg_price,
#         arrival_price,
#         total_qty,
#         order.side
#     )

#     return shortfall


# # -----------------------------------
# # Define Parameter Bounds
# # -----------------------------------

# param_bounds = {
#     "slice_frequency": (5, 60, "int"),
#     "participation_cap": (0.01, 0.25, "float"),
#     "aggressiveness": (0.8, 1.5, "float"),
# }


# # -----------------------------------
# # Run Genetic Algorithm
# # -----------------------------------

# optimizer = GAOptimizer(
#     evaluation_function=execution_cost_function,
#     param_bounds=param_bounds,
#     population_size=20,
#     generations=10,
# )

# ga_result = optimizer.optimize()

# print("\n--- GA OPTIMIZATION RESULT ---")
# print("Best Parameters:", ga_result["best_parameters"])
# print("Best Shortfall:", ga_result["best_cost"])


# # -----------------------------------
# # Compare Against VWAP Baseline
# # -----------------------------------

# improvement = ((shortfall_vwap - ga_result["best_cost"]) / shortfall_vwap) * 100

# print("\n--- IMPROVEMENT OVER VWAP ---")
# print(f"Improvement: {improvement:.2f}%")

# from optimization.ga_optimizer import GAOptimizer

# # Dummy evaluation function (simple test)
# def test_evaluation(params):
#     # We want to minimize (x-3)^2 + (y-5)^2
#     x = params["x"]
#     y = params["y"]
#     return (x - 3)**2 + (y - 5)**2


# if __name__ == "__main__":

#     param_bounds = {
#         "x": (0, 10, "float"),
#         "y": (0, 10, "float"),
#     }

#     optimizer = GAOptimizer(
#         evaluation_function=test_evaluation,
#         param_bounds=param_bounds,
#         population_size=20,
#         generations=15,
#     )

#     result = optimizer.optimize()

#     print("\nOptimization Result:")
#     print(result)










# # main.py
# from data.data_layer.pipeline import get_market_data
# from data.data_layer.preprocess import preprocess_market_data, add_derived_metrics

# from execution.engine import ExecutionEngine, ParentOrder
# from execution.strategies import TWAPStrategy, VWAPStrategy
# from execution.cost_model import *

# import pandas as pd
# import time
# import numpy as np
# from typing import Dict, Any, Optional

# # ---------------------------
# # Module-level config & cache
# # ---------------------------
# DATA_TICKER = "AAPL"
# # Start with "1d" for fast debugging; switch to "5m" for realistic VWAP tuning later.
# DATA_INTERVAL = "5m"
# DATA_PERIOD = "90d"  # ensure this covers baseline window
# PARENT_ORDER_QUANTITY = 50000
# PARENT_ORDER_SIDE = "BUY"

# # Worker-local cache for market data (each worker process will have its own copy)
# _CACHED_MARKET: Optional[pd.DataFrame] = None

# # ---------------------------
# # Module-level GA evaluator (picklable)
# # ---------------------------
# def execution_cost_function(params):

#     try:

#         vwap_strategy = VWAPStrategy(
#             slice_frequency=params["slice_frequency"],
#             participation_cap=params["participation_cap"],
#             aggressiveness=params["aggressiveness"]
#         )

#         schedule = vwap_strategy.generate_schedule(order, market_data)

#         if len(schedule) == 0:
#             return 1e12

#         logs = engine.run(order, schedule, "GA_OPTIMIZED")

#         df = pd.DataFrame([vars(l) for l in logs])

#         arrival_price = compute_arrival_price(
#             market_data.reset_index().rename(columns={"index": "datetime", "Close": "close"}),
#             order.start_time
#         )

#         avg_price = compute_average_execution_price(df)

#         total_qty = df["filled_qty"].sum()

#         shortfall = compute_implementation_shortfall(
#             avg_price,
#             arrival_price,
#             total_qty,
#             order.side
#         )

#         return shortfall

#     except Exception as e:
#         print("GA evaluation failed:", e)
#         return 1e12

# # def execution_cost_function(params: Dict[str, Any]) -> float:
# #     """
# #     Module-level evaluation function for GA.
# #     Builds ParentOrder, strategy, and engine locally (worker-safe).
# #     Returns implementation shortfall (lower is better).
# #     Returns a large penalty on invalid runs and prints a short debug message.
# #     """
# #     global _CACHED_MARKET
# #     LARGE_PENALTY = 1e12

# #     try:
# #         # load or reuse market data inside worker (per-process caching)
# #         if _CACHED_MARKET is None:
# #             _CACHED_MARKET = get_market_data(
# #                 ticker=DATA_TICKER,
# #                 start="2026-01-15",
# #                 end="2026-02-26",
# #                 interval=DATA_INTERVAL
# #             )
# #         md = _CACHED_MARKET

# #         # Use the *baseline order window* (same as main) to ensure comparability
# #         baseline_start = pd.Timestamp("2026-01-30 10:00:00", tz="UTC")
# #         baseline_end = pd.Timestamp("2026-02-10 12:00:00", tz="UTC")

# #         po = ParentOrder(
# #             ticker=DATA_TICKER,
# #             side=PARENT_ORDER_SIDE,
# #             quantity=int(params.get("quantity", PARENT_ORDER_QUANTITY)),
# #             start_time=baseline_start,
# #             end_time=baseline_end,
# #         )

# #         # Build VWAP strategy from params
# #         slice_freq = int(params.get("slice_frequency", 5))
# #         participation_cap = float(params.get("participation_cap", 0.1))
# #         aggressiveness = float(params.get("aggressiveness", 1.0))

# #         vwap_strategy = VWAPStrategy(
# #             slice_frequency=slice_freq,
# #             participation_cap=participation_cap,
# #             aggressiveness=aggressiveness
# #         )

# #         # Local engine
# #         engine = ExecutionEngine(md)

# #         # Generate schedule and run
# #         schedule = vwap_strategy.generate_schedule(po, md)
# #         if not schedule or len(schedule) == 0:
# #             # quick debug - keep these prints short
# #             print("DEBUG: Empty schedule ->", {k: params[k] for k in ('slice_frequency','participation_cap','aggressiveness') if k in params})
# #             return float(LARGE_PENALTY)

# #         logs = engine.run(po, schedule, "GA_OPTIMIZED")
# #         if not logs or len(logs) == 0:
# #             print("DEBUG: No logs returned ->", {k: params[k] for k in ('slice_frequency','participation_cap','aggressiveness') if k in params})
# #             return float(LARGE_PENALTY)

# #         df = pd.DataFrame([vars(l) for l in logs])

# #         # Ensure expected column exists
# #         if "filled_qty" not in df.columns:
# #             # unexpected engine output
# #             print("DEBUG: 'filled_qty' missing in logs ->", params)
# #             return float(LARGE_PENALTY)

# #         total_qty = df["filled_qty"].sum()
# #         if total_qty <= 0:
# #             print("DEBUG: Zero filled quantity ->", {k: params[k] for k in ('slice_frequency','participation_cap','aggressiveness') if k in params})
# #             return float(LARGE_PENALTY)

# #         # Compute cost metrics (arrival & avg exec)
# #         arrival_price = compute_arrival_price(
# #             md.reset_index().rename(columns={"index": "datetime", "Close": "close"}),
# #             po.start_time
# #         )
# #         avg_price = compute_average_execution_price(df)

# #         shortfall = compute_implementation_shortfall(avg_price, arrival_price, total_qty, po.side)

# #         if not np.isfinite(shortfall):
# #             print("DEBUG: Non-finite shortfall ->", params)
# #             return float(LARGE_PENALTY)

# #         return float(shortfall)

# #     except Exception as e:
# #         # Print small debug line for exceptions in workers (avoid huge traces)
# #         print("DEBUG: Exception in GA eval ->", repr(e))
# #         return float(LARGE_PENALTY)


# # ---------------------------
# # main() — heavy script (only run when executed directly)
# # ---------------------------
# def main():
#     # 1) Load market data for baseline runs & to compute safe GA bounds
#     market_data = get_market_data(
#         ticker=DATA_TICKER,
#         start="2026-01-15",
#         end="2026-02-26",
#         interval=DATA_INTERVAL
#     )
#     print("\n--- Raw Market Data ---")
#     print(market_data.head())

#     # Baseline parent order (used for computing baseline metrics)
#     baseline_start = pd.Timestamp("2026-01-30 10:00:00", tz="UTC")
#     baseline_end = pd.Timestamp("2026-02-10 12:00:00", tz="UTC")

#     order = ParentOrder(
#         ticker=DATA_TICKER,
#         side=PARENT_ORDER_SIDE,
#         quantity=PARENT_ORDER_QUANTITY,
#         start_time=baseline_start,
#         end_time=baseline_end
#     )

#     # Baseline execution engine
#     engine = ExecutionEngine(market_data)

#     # TWAP baseline
#     twap = TWAPStrategy()
#     twap_schedule = twap.generate_schedule(order, market_data)
#     twap_logs = engine.run(order, twap_schedule, "TWAP")
#     df_twap = pd.DataFrame([vars(l) for l in twap_logs])

#     # VWAP baseline
#     vwap = VWAPStrategy()
#     vwap_schedule = vwap.generate_schedule(order, market_data)
#     vwap_logs = engine.run(order, vwap_schedule, "VWAP")
#     df_vwap = pd.DataFrame([vars(l) for l in vwap_logs])

#     # Phase 3 cost metrics (baseline)
#     arrival_price_twap = compute_arrival_price(
#         market_data.reset_index().rename(columns={"index": "datetime", "Close": "close"}),
#         order.start_time
#     )
#     avg_price_twap = compute_average_execution_price(df_twap)
#     total_qty_twap = df_twap["filled_qty"].sum()
#     slippage_twap = compute_slippage(avg_price_twap, arrival_price_twap, order.side)
#     shortfall_twap = compute_implementation_shortfall(avg_price_twap, arrival_price_twap, total_qty_twap, order.side)
#     df_twap = add_participation_rate(df_twap)

#     print("\n--- TWAP COST METRICS ---")
#     print("Arrival Price:", arrival_price_twap)
#     print("Average Execution Price:", avg_price_twap)
#     print("Slippage:", slippage_twap)
#     print("Implementation Shortfall:", shortfall_twap)

#     arrival_price_vwap = compute_arrival_price(
#         market_data.reset_index().rename(columns={"index": "datetime", "Close": "close"}),
#         order.start_time
#     )
#     avg_price_vwap = compute_average_execution_price(df_vwap)
#     total_qty_vwap = df_vwap["filled_qty"].sum()
#     slippage_vwap = compute_slippage(avg_price_vwap, arrival_price_vwap, order.side)
#     shortfall_vwap = compute_implementation_shortfall(avg_price_vwap, arrival_price_vwap, total_qty_vwap, order.side)
#     df_vwap = add_participation_rate(df_vwap)

#     print("\n--- VWAP COST METRICS ---")
#     print("Arrival Price:", arrival_price_vwap)
#     print("Average Execution Price:", avg_price_vwap)
#     print("Slippage:", slippage_vwap)
#     print("Implementation Shortfall:", shortfall_vwap)

#     print("\n--- TWAP logs ---")
#     print(df_twap[['timestamp','filled_qty','market_volume','participation_rate','strategy_name']])

#     print("\n--- VWAP logs ---")
#     print(df_vwap[['timestamp','filled_qty','market_volume','participation_rate','strategy_name']])

#     # ---------------------------
#     # Phase 5 — GA optimization
#     # ---------------------------
#     from optimization.ga_optimizer import GAOptimizer

#     # Compute safe slice_frequency upper bound from the baseline window length
#     # find number of timestamps in market_data that fall in the order window
#     try:
#         mask = (market_data.index >= baseline_start) & (market_data.index <= baseline_end)
#         window_len = int(mask.sum())
#         if window_len < 1:
#             window_len = max(1, len(market_data))
#     except Exception:
#         window_len = max(1, len(market_data))

#     # Conservative parameter bounds (prevent GA from trying impossible combos)
#     param_bounds = {
#         "slice_frequency": (1, 15, "int"),
#         "participation_cap": (0.05, 0.20, "float"),   # avoid extremely small caps that yield zero fills
#         "aggressiveness": (0.9, 1.1, "float"),
#     }

#     print("\nGA parameter bounds:", param_bounds)
#     print("Window length used for slicing:", window_len)


#     # Start GA — keep small while debugging (increase later)
#     optimizer = GAOptimizer(
#         evaluation_function=execution_cost_function,
#         param_bounds=param_bounds,
#         population_size=40,   # small while debugging
#         generations=25,
#         n_workers=4          # set >1 once eval function tested & picklable
#     )

#     print(f"\nRunning GA with {optimizer.n_workers} worker(s)")
#     print("\n--- Starting GA Optimization ---")
#     start_time = time.time()

#     ga_result = optimizer.optimize(verbose=True)

#     end_time = time.time()
#     print(f"\nGA Runtime: {end_time - start_time:.2f} seconds")

#     print("\n--- GA OPTIMIZATION RESULT ---")
#     print("Best Parameters:", ga_result["best_parameters"])
#     print("Best Shortfall:", ga_result["best_cost"])

#     # Compare against baseline VWAP (if baseline shortfall computed)
#     try:
#         improvement = ((shortfall_vwap - ga_result["best_cost"]) / shortfall_vwap) * 100
#     except Exception:
#         improvement = float("nan")
#     print("\n--- IMPROVEMENT OVER VWAP ---")
#     print(f"Improvement: {improvement:.2f}%")

#     # Small GA test (sanity-check)
#     from optimization.ga_optimizer import GAOptimizer as GAOptTester

#     def test_evaluation(params):
#         x = params["x"]
#         y = params["y"]
#         return (x - 3) ** 2 + (y - 5) ** 2

#     param_bounds_test = {
#         "x": (0, 10, "float"),
#         "y": (0, 10, "float"),
#     }

#     tester = GAOptTester(
#         evaluation_function=test_evaluation,
#         param_bounds=param_bounds_test,
#         population_size=8,
#         generations=8,
#         n_workers=1
#     )

#     result = tester.optimize()
#     print("\nOptimization Result (test):")
#     print(result)

#     # -----------------------------
#     # Run best GA strategy
#     # -----------------------------

#     best_params = ga_result["best_parameters"]

#     ga_strategy = VWAPStrategy(
#         slice_frequency=best_params["slice_frequency"],
#         participation_cap=best_params["participation_cap"],
#         aggressiveness=best_params["aggressiveness"]
#     )

#     ga_schedule = ga_strategy.generate_schedule(order, market_data)

#     ga_logs = engine.run(order, ga_schedule, "GA_OPTIMIZED")

#     df_ga = pd.DataFrame([vars(l) for l in ga_logs])

#     df_ga = add_participation_rate(df_ga)

#     print("\n--- GA logs ---")
#     print(df_ga[['timestamp','filled_qty','market_volume','participation_rate','strategy_name']])


# if __name__ == "__main__":
#     main()




# main.py
from data.data_layer.pipeline import get_market_data
from data.data_layer.preprocess import preprocess_market_data, add_derived_metrics

from execution.engine import ExecutionEngine, ParentOrder
from execution.strategies import TWAPStrategy, VWAPStrategy
from execution.cost_model import *

import pandas as pd
import time
import numpy as np
from typing import Dict, Any, Optional

# ---------------------------
# Module-level config & cache
# ---------------------------
DATA_TICKER = "AAPL"
# Start with "1d" for fast debugging; switch to "5m" for realistic VWAP tuning later.
DATA_INTERVAL = "5m"
DATA_PERIOD = "90d"  # ensure this covers baseline window
PARENT_ORDER_QUANTITY = 50000
PARENT_ORDER_SIDE = "BUY"

# Worker-local cache for market data (each worker process will have its own copy)
_CACHED_MARKET: Optional[pd.DataFrame] = None

# ---------------------------
# Module-level GA evaluator (picklable, worker-safe)
# ---------------------------
def execution_cost_function(params: Dict[str, Any]) -> float:
    """
    Must be at module level so multiprocessing 'spawn' (macOS/Windows) can pickle it.
    Builds its own ParentOrder, ExecutionEngine, and VWAPStrategy — no dependency
    on anything defined inside main().
    Uses a per-process cache so each worker loads market data only once.
    """
    global _CACHED_MARKET
    LARGE_PENALTY = 1e12

    try:
        # Load market data once per worker process and cache it.
        if _CACHED_MARKET is None:
            _CACHED_MARKET = get_market_data(
                ticker=DATA_TICKER,
                start="2026-01-15",
                end="2026-02-26",
                interval=DATA_INTERVAL
            )
        md = _CACHED_MARKET

        # Same window as the baseline in main().
        baseline_start = pd.Timestamp("2026-01-30 14:30:00", tz="UTC")
        baseline_end   = pd.Timestamp("2026-02-10 12:00:00", tz="UTC")

        po = ParentOrder(
            ticker=DATA_TICKER,
            side=PARENT_ORDER_SIDE,
            quantity=PARENT_ORDER_QUANTITY,
            start_time=baseline_start,
            end_time=baseline_end,
        )

        # Build VWAP strategy from GA-proposed params (new split param names).
        slice_freq               = int(params.get("slice_frequency", 5))
        weight_cap               = float(params.get("weight_cap", 1.0))
        volume_participation_cap = float(params.get("volume_participation_cap", 0.2))
        aggressiveness           = float(params.get("aggressiveness", 1.0))

        vwap_strategy = VWAPStrategy(
            slice_frequency=slice_freq,
            weight_cap=weight_cap,
            volume_participation_cap=volume_participation_cap,
            aggressiveness=aggressiveness
        )

        local_engine = ExecutionEngine(md)

        schedule = vwap_strategy.generate_schedule(po, md)
        if not schedule or len(schedule) == 0:
            return float(LARGE_PENALTY)

        logs = local_engine.run(po, schedule, "GA_OPTIMIZED")
        if not logs or len(logs) == 0:
            return float(LARGE_PENALTY)

        df = pd.DataFrame([vars(l) for l in logs])

        if "filled_qty" not in df.columns:
            return float(LARGE_PENALTY)

        total_qty = df["filled_qty"].sum()
        if total_qty <= 0:
            return float(LARGE_PENALTY)

        arrival_price = compute_arrival_price(
            md.reset_index().rename(columns={"index": "datetime", "Close": "close"}),
            po.start_time
        )
        avg_price = compute_average_execution_price(df)

        shortfall = compute_implementation_shortfall(
            avg_price, arrival_price, total_qty, po.side
        )

        if not np.isfinite(shortfall):
            return float(LARGE_PENALTY)

        return float(shortfall)

    except Exception as e:
        print("GA evaluation failed:", e)
        return 1e12

# def execution_cost_function(params: Dict[str, Any]) -> float:
#     """
#     Module-level evaluation function for GA.
#     Builds ParentOrder, strategy, and engine locally (worker-safe).
#     Returns implementation shortfall (lower is better).
#     Returns a large penalty on invalid runs and prints a short debug message.
#     """
#     global _CACHED_MARKET
#     LARGE_PENALTY = 1e12

#     try:
#         # load or reuse market data inside worker (per-process caching)
#         if _CACHED_MARKET is None:
#             _CACHED_MARKET = get_market_data(
#                 ticker=DATA_TICKER,
#                 start="2026-01-15",
#                 end="2026-02-26",
#                 interval=DATA_INTERVAL
#             )
#         md = _CACHED_MARKET

#         # Use the *baseline order window* (same as main) to ensure comparability
#         baseline_start = pd.Timestamp("2026-01-30 10:00:00", tz="UTC")
#         baseline_end = pd.Timestamp("2026-02-10 12:00:00", tz="UTC")

#         po = ParentOrder(
#             ticker=DATA_TICKER,
#             side=PARENT_ORDER_SIDE,
#             quantity=int(params.get("quantity", PARENT_ORDER_QUANTITY)),
#             start_time=baseline_start,
#             end_time=baseline_end,
#         )

#         # Build VWAP strategy from params
#         slice_freq = int(params.get("slice_frequency", 5))
#         participation_cap = float(params.get("participation_cap", 0.1))
#         aggressiveness = float(params.get("aggressiveness", 1.0))

#         vwap_strategy = VWAPStrategy(
#             slice_frequency=slice_freq,
#             participation_cap=participation_cap,
#             aggressiveness=aggressiveness
#         )

#         # Local engine
#         engine = ExecutionEngine(md)

#         # Generate schedule and run
#         schedule = vwap_strategy.generate_schedule(po, md)
#         if not schedule or len(schedule) == 0:
#             # quick debug - keep these prints short
#             print("DEBUG: Empty schedule ->", {k: params[k] for k in ('slice_frequency','participation_cap','aggressiveness') if k in params})
#             return float(LARGE_PENALTY)

#         logs = engine.run(po, schedule, "GA_OPTIMIZED")
#         if not logs or len(logs) == 0:
#             print("DEBUG: No logs returned ->", {k: params[k] for k in ('slice_frequency','participation_cap','aggressiveness') if k in params})
#             return float(LARGE_PENALTY)

#         df = pd.DataFrame([vars(l) for l in logs])

#         # Ensure expected column exists
#         if "filled_qty" not in df.columns:
#             # unexpected engine output
#             print("DEBUG: 'filled_qty' missing in logs ->", params)
#             return float(LARGE_PENALTY)

#         total_qty = df["filled_qty"].sum()
#         if total_qty <= 0:
#             print("DEBUG: Zero filled quantity ->", {k: params[k] for k in ('slice_frequency','participation_cap','aggressiveness') if k in params})
#             return float(LARGE_PENALTY)

#         # Compute cost metrics (arrival & avg exec)
#         arrival_price = compute_arrival_price(
#             md.reset_index().rename(columns={"index": "datetime", "Close": "close"}),
#             po.start_time
#         )
#         avg_price = compute_average_execution_price(df)

#         shortfall = compute_implementation_shortfall(avg_price, arrival_price, total_qty, po.side)

#         if not np.isfinite(shortfall):
#             print("DEBUG: Non-finite shortfall ->", params)
#             return float(LARGE_PENALTY)

#         return float(shortfall)

#     except Exception as e:
#         # Print small debug line for exceptions in workers (avoid huge traces)
#         print("DEBUG: Exception in GA eval ->", repr(e))
#         return float(LARGE_PENALTY)


# ---------------------------
# main() — heavy script (only run when executed directly)
# ---------------------------
def main():
    # 1) Load market data for baseline runs & to compute safe GA bounds
    market_data = get_market_data(
        ticker=DATA_TICKER,
        start="2026-01-15",
        end="2026-02-26",
        interval=DATA_INTERVAL
    )
    print("\n--- Raw Market Data ---")
    print(market_data.head())

    # Baseline parent order (used for computing baseline metrics)
    baseline_start = pd.Timestamp("2026-01-30 14:30:00", tz="UTC")
    baseline_end = pd.Timestamp("2026-02-10 12:00:00", tz="UTC")

    order = ParentOrder(
        ticker=DATA_TICKER,
        side=PARENT_ORDER_SIDE,
        quantity=PARENT_ORDER_QUANTITY,
        start_time=baseline_start,
        end_time=baseline_end
    )

    # Baseline execution engine
    engine = ExecutionEngine(market_data)

    # TWAP baseline
    twap = TWAPStrategy()
    twap_schedule = twap.generate_schedule(order, market_data)
    twap_logs = engine.run(order, twap_schedule, "TWAP")
    df_twap = pd.DataFrame([vars(l) for l in twap_logs])

    # VWAP baseline
    vwap = VWAPStrategy(weight_cap=1.0, volume_participation_cap=0.2)
    vwap_schedule = vwap.generate_schedule(order, market_data)
    vwap_logs = engine.run(order, vwap_schedule, "VWAP")
    df_vwap = pd.DataFrame([vars(l) for l in vwap_logs])

    # Phase 3 cost metrics (baseline)
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

    print("\n--- TWAP logs ---")
    print(df_twap[['timestamp','filled_qty','market_volume','participation_rate','strategy_name']])

    print("\n--- VWAP logs ---")
    print(df_vwap[['timestamp','filled_qty','market_volume','participation_rate','strategy_name']])

    # ---------------------------
    # Phase 5 — GA optimization
    # ---------------------------
    from optimization.ga_optimizer import GAOptimizer

    # Compute safe slice_frequency upper bound from the baseline window length
    # find number of timestamps in market_data that fall in the order window
    try:
        mask = (market_data.index >= baseline_start) & (market_data.index <= baseline_end)
        window_len = int(mask.sum())
        if window_len < 1:
            window_len = max(1, len(market_data))
    except Exception:
        window_len = max(1, len(market_data))

    # Conservative parameter bounds (prevent GA from trying impossible combos)
    param_bounds = {
        "slice_frequency":          (1,    15,  "int"),
        "weight_cap":               (0.1,  1.0, "float"),
        "volume_participation_cap": (0.01, 0.3, "float"),
        "aggressiveness":           (0.9,  1.1, "float"),
    }

    print("\nGA parameter bounds:", param_bounds)
    print("Window length used for slicing:", window_len)


    # Start GA — keep small while debugging (increase later)
    optimizer = GAOptimizer(
        evaluation_function=execution_cost_function,
        param_bounds=param_bounds,
        population_size=40,   # small while debugging
        generations=25,
        n_workers=4          # set >1 once eval function tested & picklable
    )

    print(f"\nRunning GA with {optimizer.n_workers} worker(s)")
    print("\n--- Starting GA Optimization ---")
    start_time = time.time()

    ga_result = optimizer.optimize(verbose=True)

    end_time = time.time()
    print(f"\nGA Runtime: {end_time - start_time:.2f} seconds")

    print("\n--- GA OPTIMIZATION RESULT ---")
    print("Best Parameters:", ga_result["best_parameters"])
    print("Best Shortfall:", ga_result["best_cost"])

    # Compare against baseline VWAP (if baseline shortfall computed)
    try:
        improvement = ((shortfall_vwap - ga_result["best_cost"]) / shortfall_vwap) * 100
    except Exception:
        improvement = float("nan")
    print("\n--- IMPROVEMENT OVER VWAP ---")
    print(f"Improvement: {improvement:.2f}%")

    # Small GA test (sanity-check)
    from optimization.ga_optimizer import GAOptimizer as GAOptTester

    def test_evaluation(params):
        x = params["x"]
        y = params["y"]
        return (x - 3) ** 2 + (y - 5) ** 2

    param_bounds_test = {
        "x": (0, 10, "float"),
        "y": (0, 10, "float"),
    }

    tester = GAOptTester(
        evaluation_function=test_evaluation,
        param_bounds=param_bounds_test,
        population_size=8,
        generations=8,
        n_workers=1
    )

    result = tester.optimize()
    print("\nOptimization Result (test):")
    print(result)

    # -----------------------------
    # Run best GA strategy
    # -----------------------------

    best_params = ga_result["best_parameters"]

    ga_strategy = VWAPStrategy(
        slice_frequency=best_params["slice_frequency"],
        weight_cap=best_params["weight_cap"],
        volume_participation_cap=best_params["volume_participation_cap"],
        aggressiveness=best_params["aggressiveness"]
    )

    ga_schedule = ga_strategy.generate_schedule(order, market_data)

    ga_logs = engine.run(order, ga_schedule, "GA_OPTIMIZED")

    df_ga = pd.DataFrame([vars(l) for l in ga_logs])

    df_ga = add_participation_rate(df_ga)

    print("\n--- GA logs ---")
    print(df_ga[['timestamp','filled_qty','market_volume','participation_rate','strategy_name']])


if __name__ == "__main__":
    main()