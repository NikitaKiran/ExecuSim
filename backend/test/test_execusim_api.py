"""
Comprehensive test suite for ExecuSim API and DB layer.

Usage:
    pytest scripts/test_execusim_api.py -v
    pytest scripts/test_execusim_api.py -v -k "test_health"   # run a single test

Requires the server to be running at BASE_URL (default http://localhost:8000).
"""

import os
import sys
import uuid
import time
import json
import logging
import requests
import pytest
from datetime import datetime, timedelta, timezone

# ---------------------------------------------------------------------------
# Allow imports from the backend package when running from /backend
# ---------------------------------------------------------------------------
BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BASE_URL = os.getenv("EXECUSIM_BASE_URL", "http://localhost:8000")
API_URL = f"{BASE_URL}/api"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ExecuSimTest")


# ========================================================================
# Fixtures
# ========================================================================

@pytest.fixture(scope="session", autouse=True)
def ensure_server_running():
    """Fail fast if the server is not reachable."""
    try:
        r = requests.get(f"{API_URL}/health", timeout=5)
        r.raise_for_status()
    except requests.ConnectionError:
        pytest.exit(
            f"ExecuSim server not reachable at {BASE_URL}. "
            "Start it with `python server.py` before running tests.",
            returncode=1,
        )


@pytest.fixture(scope="session")
def test_dates():
    """
    Return a dict of date strings guaranteed to cover recent market data
    and a 2-hour execution window inside a trading day.
    """
    now = datetime.now(timezone.utc)

    # Walk backwards to find the most recent weekday (Mon=0 .. Fri=4)
    candidate = now - timedelta(days=1)
    while candidate.weekday() >= 5:  # 5=Sat, 6=Sun
        candidate -= timedelta(days=1)

    # Go back one more day to be safe (data may not be available for today-1 yet)
    candidate -= timedelta(days=1)
    while candidate.weekday() >= 5:
        candidate -= timedelta(days=1)

    data_start = candidate - timedelta(days=6)
    data_end = candidate + timedelta(days=1)  # end is exclusive in yfinance

    # Use US market hours: 14:30–16:30 UTC (≈ 9:30–11:30 AM ET)
    execution_start = candidate.replace(hour=14, minute=30, second=0, microsecond=0)
    execution_end = candidate.replace(hour=16, minute=30, second=0, microsecond=0)

    dates = {
        "data_start": data_start.strftime("%Y-%m-%d"),
        "data_end": data_end.strftime("%Y-%m-%d"),
        "start_time": execution_start.strftime("%Y-%m-%d %H:%M:%S"),
        "end_time": execution_end.strftime("%Y-%m-%d %H:%M:%S"),
    }

    logger.info(f"Test dates: {dates}")
    return dates


@pytest.fixture(scope="session")
def base_order_payload(test_dates):
    """Reusable order payload (no strategy field)."""
    return {
        "ticker": "AAPL",
        "side": "BUY",
        "quantity": 20000,
        "start_time": test_dates["start_time"],
        "end_time": test_dates["end_time"],
        "data_start": test_dates["data_start"],
        "data_end": test_dates["data_end"],
        "interval": "5m",
    }


@pytest.fixture(scope="session", autouse=True)
def verify_market_data_available(ensure_server_running, test_dates):
    """Pre-check that market data is available for the chosen dates."""
    payload = {
        "ticker": "AAPL",
        "start": test_dates["data_start"],
        "end": test_dates["data_end"],
        "interval": "5m",
    }
    r = requests.post(f"{API_URL}/data/market", json=payload)
    if r.status_code != 200 or r.json().get("num_candles", 0) == 0:
        pytest.exit(
            f"No market data available for test dates {test_dates}. "
            f"Response: {r.status_code} {r.text}",
            returncode=1,
        )
    logger.info(
        f"Pre-check OK: {r.json()['num_candles']} candles available for "
        f"{test_dates['data_start']} to {test_dates['data_end']}"
    )


@pytest.fixture(scope="session")
def db_session():
    """
    Provide a raw SQLAlchemy session for direct DB verification.
    Yields the session and closes it after all tests.
    """
    from db.database import SessionLocal
    session = SessionLocal()
    yield session
    session.close()


# ========================================================================
# 1. HEALTH / ROOT
# ========================================================================

class TestHealthAndRoot:

    def test_root_endpoint(self):
        r = requests.get(f"{BASE_URL}/")
        assert r.status_code == 200
        body = r.json()
        assert "message" in body
        logger.info("Root endpoint OK")

    def test_health_endpoint(self):
        r = requests.get(f"{API_URL}/health")
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "ok"
        assert "version" in body
        logger.info(f"Health OK — version {body['version']}")


# ========================================================================
# 2. MARKET DATA
# ========================================================================

class TestMarketData:

    def test_fetch_valid_ticker(self, test_dates):
        payload = {
            "ticker": "AAPL",
            "start": test_dates["data_start"],
            "end": test_dates["data_end"],
            "interval": "5m",
        }
        r = requests.post(f"{API_URL}/data/market", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert "num_candles" in data
        assert data["num_candles"] > 0
        logger.info(f"Fetched {data['num_candles']} candles for AAPL")

    def test_fetch_different_intervals(self, test_dates):
        for interval in ["1m", "5m", "15m", "1h", "1d"]:
            payload = {
                "ticker": "AAPL",
                "start": test_dates["data_start"],
                "end": test_dates["data_end"],
                "interval": interval,
            }
            r = requests.post(f"{API_URL}/data/market", json=payload)
            # Some intervals may not be supported; just ensure no 500
            assert r.status_code in (200, 400, 422), f"Unexpected status {r.status_code} for interval={interval}"
            logger.info(f"Interval {interval}: status {r.status_code}")

    def test_fetch_multiple_tickers(self, test_dates):
        for ticker in ["AAPL", "MSFT", "GOOGL"]:
            payload = {
                "ticker": ticker,
                "start": test_dates["data_start"],
                "end": test_dates["data_end"],
                "interval": "5m",
            }
            r = requests.post(f"{API_URL}/data/market", json=payload)
            assert r.status_code == 200
            data = r.json()
            assert data["num_candles"] > 0
            logger.info(f"{ticker}: {data['num_candles']} candles")

    def test_fetch_invalid_ticker(self, test_dates):
        payload = {
            "ticker": "INVALIDTICKER99999",
            "start": test_dates["data_start"],
            "end": test_dates["data_end"],
            "interval": "5m",
        }
        r = requests.post(f"{API_URL}/data/market", json=payload)
        # Should be 400 or 404 or return 0 candles — never 500
        assert r.status_code in (200, 400, 404)
        if r.status_code == 200:
            assert r.json().get("num_candles", 0) == 0
        logger.info("Invalid ticker handled correctly")

    def test_fetch_missing_fields(self):
        """Omit required fields — expect 422 Unprocessable Entity."""
        r = requests.post(f"{API_URL}/data/market", json={"ticker": "AAPL"})
        assert r.status_code == 422
        logger.info("Missing fields rejected with 422")

    def test_fetch_empty_body(self):
        r = requests.post(f"{API_URL}/data/market", json={})
        assert r.status_code == 422

    def test_fetch_start_after_end(self, test_dates):
        payload = {
            "ticker": "AAPL",
            "start": test_dates["data_end"],
            "end": test_dates["data_start"],
            "interval": "5m",
        }
        r = requests.post(f"{API_URL}/data/market", json=payload)
        # Should fail gracefully
        assert r.status_code in (200, 400, 404)
        if r.status_code == 200:
            assert r.json().get("num_candles", 0) == 0
        logger.info("Start-after-end handled correctly")


# ========================================================================
# 3. EXECUTION — STRATEGIES LIST
# ========================================================================

class TestExecutionStrategiesList:

    def test_list_strategies(self):
        r = requests.get(f"{API_URL}/execution/strategies")
        assert r.status_code == 200
        data = r.json()
        assert "strategies" in data
        names = [s["name"] for s in data["strategies"]]
        assert "TWAP" in names
        assert "VWAP" in names
        logger.info(f"Available strategies: {names}")


# ========================================================================
# 4. EXECUTION — SIMULATE
# ========================================================================

class TestExecutionSimulate:

    def test_simulate_twap(self, base_order_payload):
        payload = {**base_order_payload, "strategy": "TWAP"}
        r = requests.post(f"{API_URL}/execution/simulate", json=payload)
        if r.status_code != 200:
            logger.error(f"TWAP simulate failed: {r.status_code} {r.text}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        self._assert_simulation_response(data, "TWAP")
        logger.info("TWAP simulation passed")

    def test_simulate_vwap(self, base_order_payload):
        payload = {**base_order_payload, "strategy": "VWAP"}
        r = requests.post(f"{API_URL}/execution/simulate", json=payload)
        if r.status_code != 200:
            logger.error(f"VWAP simulate failed: {r.status_code} {r.text}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        self._assert_simulation_response(data, "VWAP")
        logger.info("VWAP simulation passed")

    def test_simulate_sell_side(self, base_order_payload):
        payload = {**base_order_payload, "strategy": "TWAP", "side": "SELL"}
        r = requests.post(f"{API_URL}/execution/simulate", json=payload)
        if r.status_code != 200:
            logger.error(f"SELL simulate failed: {r.status_code} {r.text}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "metrics" in data
        logger.info("SELL side simulation passed")

    def test_simulate_invalid_strategy(self, base_order_payload):
        payload = {**base_order_payload, "strategy": "NONEXISTENT"}
        r = requests.post(f"{API_URL}/execution/simulate", json=payload)
        assert r.status_code in (400, 422)
        logger.info("Invalid strategy rejected correctly")

    def test_simulate_zero_quantity(self, base_order_payload):
        payload = {**base_order_payload, "strategy": "TWAP", "quantity": 0}
        r = requests.post(f"{API_URL}/execution/simulate", json=payload)
        assert r.status_code in (400, 422)
        logger.info("Zero quantity rejected correctly")

    def test_simulate_negative_quantity(self, base_order_payload):
        payload = {**base_order_payload, "strategy": "TWAP", "quantity": -100}
        r = requests.post(f"{API_URL}/execution/simulate", json=payload)
        assert r.status_code in (400, 422)
        logger.info("Negative quantity rejected correctly")

    def test_simulate_missing_fields(self):
        r = requests.post(f"{API_URL}/execution/simulate", json={"ticker": "AAPL"})
        assert r.status_code == 422
        logger.info("Missing fields rejected with 422")

    def test_simulate_returns_experiment_id(self, base_order_payload):
        payload = {**base_order_payload, "strategy": "TWAP"}
        r = requests.post(f"{API_URL}/execution/simulate", json=payload)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "experiment_id" in data
        # Should be a valid UUID
        uuid.UUID(data["experiment_id"])
        logger.info(f"Experiment ID returned: {data['experiment_id']}")

    def test_simulate_metrics_values_reasonable(self, base_order_payload):
        payload = {**base_order_payload, "strategy": "TWAP"}
        r = requests.post(f"{API_URL}/execution/simulate", json=payload)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        metrics = r.json()["metrics"]

        assert metrics["arrival_price"] > 0
        assert metrics["average_execution_price"] > 0
        assert metrics["total_filled_qty"] > 0
        assert metrics["total_filled_qty"] <= base_order_payload["quantity"]
        # Slippage should be a small fraction of arrival price
        assert abs(metrics["slippage"]) < metrics["arrival_price"]
        logger.info("Metrics values are within reasonable ranges")

    def test_simulate_execution_logs_structure(self, base_order_payload):
        payload = {**base_order_payload, "strategy": "TWAP"}
        r = requests.post(f"{API_URL}/execution/simulate", json=payload)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        logs = r.json()["execution_logs"]
        assert len(logs) > 0

        for log in logs:
            assert "timestamp" in log
            assert "requested_qty" in log
            assert "filled_qty" in log
            assert "execution_price" in log
            assert "market_volume" in log
            assert "strategy_name" in log
            assert log["filled_qty"] >= 0
            assert log["execution_price"] > 0
            assert log["market_volume"] >= 0
        logger.info(f"All {len(logs)} execution log entries have correct structure")

    def test_simulate_total_filled_matches_logs(self, base_order_payload):
        payload = {**base_order_payload, "strategy": "TWAP"}
        r = requests.post(f"{API_URL}/execution/simulate", json=payload)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        total_from_logs = sum(log["filled_qty"] for log in data["execution_logs"])
        assert data["metrics"]["total_filled_qty"] == total_from_logs
        logger.info("Total filled qty matches sum of execution logs")

    def test_simulate_large_order(self, base_order_payload):
        payload = {**base_order_payload, "strategy": "VWAP", "quantity": 1_000_000}
        r = requests.post(f"{API_URL}/execution/simulate", json=payload)
        # Should succeed or return a meaningful error, never 500
        assert r.status_code in (200, 400)
        logger.info(f"Large order test: status {r.status_code}")

    def test_simulate_small_order(self, base_order_payload):
        payload = {**base_order_payload, "strategy": "TWAP", "quantity": 1}
        r = requests.post(f"{API_URL}/execution/simulate", json=payload)
        assert r.status_code in (200, 400)
        logger.info(f"Small order (qty=1) test: status {r.status_code}")

    # ---- helpers ----

    def _assert_simulation_response(self, data: dict, strategy: str):
        assert "order" in data
        assert "strategy" in data
        assert data["strategy"] == strategy
        assert "metrics" in data
        assert "execution_logs" in data

        metrics = data["metrics"]
        assert "arrival_price" in metrics
        assert "average_execution_price" in metrics
        assert "slippage" in metrics
        assert "implementation_shortfall" in metrics
        assert "total_filled_qty" in metrics

        assert len(data["execution_logs"]) > 0


# ========================================================================
# 5. EXECUTION — COMPARE
# ========================================================================

class TestExecutionCompare:

    def test_compare_returns_both_strategies(self, base_order_payload):
        r = requests.post(f"{API_URL}/execution/compare", json=base_order_payload)
        assert r.status_code == 200
        data = r.json()
        assert "comparisons" in data
        assert len(data["comparisons"]) == 2
        strategy_names = {c["strategy"] for c in data["comparisons"]}
        assert strategy_names == {"TWAP", "VWAP"}
        logger.info("Compare returned both TWAP and VWAP")

    def test_compare_has_recommendation(self, base_order_payload):
        r = requests.post(f"{API_URL}/execution/compare", json=base_order_payload)
        assert r.status_code == 200
        data = r.json()
        assert "recommendation" in data
        assert len(data["recommendation"]) > 0
        logger.info(f"Recommendation: {data['recommendation']}")

    def test_compare_metrics_structure(self, base_order_payload):
        r = requests.post(f"{API_URL}/execution/compare", json=base_order_payload)
        assert r.status_code == 200
        for comp in r.json()["comparisons"]:
            m = comp["metrics"]
            assert "arrival_price" in m
            assert "average_execution_price" in m
            assert "slippage" in m
            assert "implementation_shortfall" in m
            assert "total_filled_qty" in m
            assert m["arrival_price"] > 0
            assert m["total_filled_qty"] > 0
        logger.info("Compare metrics structure valid for both strategies")

    def test_compare_order_echo(self, base_order_payload):
        r = requests.post(f"{API_URL}/execution/compare", json=base_order_payload)
        assert r.status_code == 200
        order = r.json()["order"]
        assert order["ticker"] == base_order_payload["ticker"]
        assert order["side"] == base_order_payload["side"]
        assert order["quantity"] == base_order_payload["quantity"]
        logger.info("Compare echoes order details correctly")

    def test_compare_sell_side(self, base_order_payload):
        payload = {**base_order_payload, "side": "SELL"}
        r = requests.post(f"{API_URL}/execution/compare", json=payload)
        assert r.status_code == 200
        assert len(r.json()["comparisons"]) == 2
        logger.info("Compare works for SELL side")

    def test_compare_missing_fields(self):
        r = requests.post(f"{API_URL}/execution/compare", json={"ticker": "AAPL"})
        assert r.status_code == 422
        logger.info("Compare rejects missing fields with 422")


# ========================================================================
# 6. OPTIMIZATION — PARAMS
# ========================================================================

class TestOptimizationParams:

    def test_list_params(self):
        r = requests.get(f"{API_URL}/optimization/params")
        assert r.status_code == 200
        data = r.json()
        assert "parameters" in data
        params = data["parameters"]
        assert len(params) > 0

        param_names = {p["name"] for p in params}
        assert "slice_frequency" in param_names
        assert "participation_cap" in param_names
        assert "aggressiveness" in param_names

        for p in params:
            assert "min_value" in p
            assert "max_value" in p
            assert "dtype" in p
            assert p["min_value"] < p["max_value"]
            assert p["dtype"] in ("int", "float")
        logger.info(f"Optimizer parameters: {[p['name'] for p in params]}")


# ========================================================================
# 7. OPTIMIZATION — EVALUATE
# ========================================================================

class TestOptimizationEvaluate:

    def test_evaluate_default_params(self, base_order_payload):
        payload = {
            **base_order_payload,
            "slice_frequency": 3,
            "participation_cap": 0.2,
            "aggressiveness": 1.0,
        }
        r = requests.post(f"{API_URL}/optimization/evaluate", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert "parameters" in data
        assert "cost" in data
        assert "metrics" in data
        assert data["cost"] >= 0
        assert data["metrics"]["total_filled_qty"] > 0
        logger.info(f"Evaluate cost: {data['cost']}")

    def test_evaluate_different_params(self, base_order_payload):
        configs = [
            {"slice_frequency": 1, "participation_cap": 0.05, "aggressiveness": 0.5},
            {"slice_frequency": 5, "participation_cap": 0.5, "aggressiveness": 1.5},
            {"slice_frequency": 10, "participation_cap": 1.0, "aggressiveness": 2.0},
        ]
        costs = []
        for params in configs:
            payload = {**base_order_payload, **params}
            r = requests.post(f"{API_URL}/optimization/evaluate", json=payload)
            assert r.status_code == 200
            data = r.json()
            costs.append(data["cost"])
            logger.info(f"Params {params} -> cost {data['cost']}")

        # Costs should vary across different configurations
        logger.info(f"Costs across configs: {costs}")

    def test_evaluate_returns_metrics(self, base_order_payload):
        payload = {
            **base_order_payload,
            "slice_frequency": 3,
            "participation_cap": 0.2,
            "aggressiveness": 1.0,
        }
        r = requests.post(f"{API_URL}/optimization/evaluate", json=payload)
        assert r.status_code == 200
        metrics = r.json()["metrics"]
        assert metrics["arrival_price"] > 0
        assert metrics["average_execution_price"] > 0
        assert metrics["total_filled_qty"] > 0
        logger.info("Evaluate returns valid metrics")

    def test_evaluate_missing_param_fields(self, base_order_payload):
        """Omit optimization-specific fields — should either reject (422) or use defaults (200)."""
        r = requests.post(f"{API_URL}/optimization/evaluate", json=base_order_payload)
        assert r.status_code in (200, 422)
        if r.status_code == 200:
            data = r.json()
            assert "cost" in data
            assert "metrics" in data
            logger.info("Evaluate accepted request with default optimization params")
        else:
            logger.info("Evaluate rejects missing optimization params with 422")


# ========================================================================
# 8. OPTIMIZATION — GA OPTIMIZE
# ========================================================================

class TestOptimizationGA:

    def test_ga_basic(self, base_order_payload):
        payload = {
            **base_order_payload,
            "population_size": 6,
            "generations": 2,
            "seed": 42,
        }
        r = requests.post(f"{API_URL}/optimization/optimize", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert "best_parameters" in data
        assert "best_cost" in data
        assert "best_strategy_metrics" in data
        assert data["best_cost"] >= 0
        logger.info(f"GA best params: {data['best_parameters']}, cost: {data['best_cost']}")

    def test_ga_best_params_in_bounds(self, base_order_payload):
        payload = {
            **base_order_payload,
            "population_size": 6,
            "generations": 2,
            "seed": 123,
        }
        r = requests.post(f"{API_URL}/optimization/optimize", json=payload)
        assert r.status_code == 200
        best = r.json()["best_parameters"]

        assert 1 <= best["slice_frequency"] <= 10
        assert 0.01 <= best["participation_cap"] <= 1.0
        assert 0.1 <= best["aggressiveness"] <= 2.0
        logger.info("GA best parameters are within declared bounds")

    def test_ga_returns_experiment_id(self, base_order_payload):
        payload = {
            **base_order_payload,
            "population_size": 6,
            "generations": 2,
            "seed": 42,
        }
        r = requests.post(f"{API_URL}/optimization/optimize", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert "experiment_id" in data
        uuid.UUID(data["experiment_id"])
        logger.info(f"GA experiment ID: {data['experiment_id']}")

    def test_ga_deterministic_with_seed(self, base_order_payload):
        payload = {
            **base_order_payload,
            "population_size": 6,
            "generations": 2,
            "seed": 999,
        }
        r1 = requests.post(f"{API_URL}/optimization/optimize", json=payload)
        r2 = requests.post(f"{API_URL}/optimization/optimize", json=payload)
        assert r1.status_code == 200
        assert r2.status_code == 200
        d1, d2 = r1.json(), r2.json()
        assert d1["best_parameters"] == d2["best_parameters"]
        assert d1["best_cost"] == d2["best_cost"]
        logger.info("GA is deterministic with same seed")

    def test_ga_different_seeds_may_differ(self, base_order_payload):
        results = {}
        for seed in [1, 2]:
            payload = {
                **base_order_payload,
                "population_size": 6,
                "generations": 3,
                "seed": seed,
            }
            r = requests.post(f"{API_URL}/optimization/optimize", json=payload)
            assert r.status_code == 200
            results[seed] = r.json()["best_cost"]
        logger.info(f"Costs by seed: {results}")

    def test_ga_metrics_structure(self, base_order_payload):
        payload = {
            **base_order_payload,
            "population_size": 6,
            "generations": 2,
            "seed": 42,
        }
        r = requests.post(f"{API_URL}/optimization/optimize", json=payload)
        assert r.status_code == 200
        metrics = r.json()["best_strategy_metrics"]
        assert "arrival_price" in metrics
        assert "average_execution_price" in metrics
        assert "slippage" in metrics
        assert "implementation_shortfall" in metrics
        assert "total_filled_qty" in metrics
        assert metrics["total_filled_qty"] > 0
        logger.info("GA best_strategy_metrics structure valid")

    def test_ga_response_metadata(self, base_order_payload):
        payload = {
            **base_order_payload,
            "population_size": 6,
            "generations": 3,
            "seed": 42,
        }
        r = requests.post(f"{API_URL}/optimization/optimize", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert data["generations_run"] == 3
        assert data["population_size"] == 6
        logger.info("GA response metadata matches request")

    def test_ga_missing_fields(self, base_order_payload):
        """GA-specific fields have defaults, so omitting them should either use defaults (200) or reject (422)."""
        r = requests.post(f"{API_URL}/optimization/optimize", json=base_order_payload)
        assert r.status_code in (200, 422)
        if r.status_code == 200:
            data = r.json()
            assert "best_parameters" in data
            assert "best_cost" in data
            logger.info("GA accepted request with default hyper-parameters")
        else:
            logger.info("GA rejects missing fields with 422")


# ========================================================================
# 9. EXPERIMENTS — LIST & DETAIL
# ========================================================================

class TestExperiments:

    def test_list_experiments(self):
        r = requests.get(f"{API_URL}/experiments")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        logger.info(f"{len(data)} experiments in DB")

    def test_list_experiments_after_simulation(self, base_order_payload):
        """Run a simulation, then confirm the experiment appears in the list."""
        # Count before
        r = requests.get(f"{API_URL}/experiments")
        count_before = len(r.json())

        # Run simulation
        payload = {**base_order_payload, "strategy": "TWAP"}
        r = requests.post(f"{API_URL}/execution/simulate", json=payload)
        assert r.status_code == 200
        exp_id = r.json()["experiment_id"]

        # Count after
        r = requests.get(f"{API_URL}/experiments")
        assert r.status_code == 200
        experiments = r.json()
        assert len(experiments) > count_before
        all_ids = [str(e["id"]) for e in experiments]
        assert exp_id in all_ids
        logger.info(f"Experiment {exp_id} appears in list after simulation")

    def test_get_experiment_detail(self, base_order_payload):
        """Run a simulation, then fetch the experiment by ID."""
        payload = {**base_order_payload, "strategy": "VWAP"}
        r = requests.post(f"{API_URL}/execution/simulate", json=payload)
        assert r.status_code == 200
        exp_id = r.json()["experiment_id"]

        r = requests.get(f"{API_URL}/experiments/{exp_id}")
        assert r.status_code == 200
        exp = r.json()
        assert str(exp["id"]) == exp_id
        assert exp["instrument"] == "AAPL"
        assert exp["strategy"] == "VWAP"
        assert exp["order_side"] == "BUY"
        assert exp["quantity"] == base_order_payload["quantity"]
        assert exp["status"] == "completed"
        logger.info(f"Experiment detail fetched: {exp_id}")

    def test_get_experiment_not_found(self):
        fake_id = str(uuid.uuid4())
        r = requests.get(f"{API_URL}/experiments/{fake_id}")
        # Should return 200 with null or 404
        assert r.status_code in (200, 404)
        if r.status_code == 200:
            assert r.json() is None
        logger.info("Non-existent experiment handled correctly")

    def test_experiments_ordered_by_created_at(self):
        r = requests.get(f"{API_URL}/experiments")
        assert r.status_code == 200
        experiments = r.json()
        if len(experiments) >= 2:
            dates = [e["created_at"] for e in experiments]
            # Should be descending (most recent first)
            assert dates == sorted(dates, reverse=True)
            logger.info("Experiments are ordered by created_at descending")
        else:
            logger.info("Not enough experiments to verify ordering")


# ========================================================================
# 10. DB PERSISTENCE VERIFICATION
# ========================================================================

class TestDBPersistence:

    def test_simulation_persists_experiment(self, base_order_payload, db_session):
        """Verify that a simulation creates an Experiment row in the DB."""
        from db.models import Experiment

        payload = {**base_order_payload, "strategy": "TWAP"}
        r = requests.post(f"{API_URL}/execution/simulate", json=payload)
        assert r.status_code == 200
        exp_id = r.json()["experiment_id"]

        exp = db_session.query(Experiment).filter(Experiment.id == exp_id).first()
        assert exp is not None
        assert exp.instrument == "AAPL"
        assert exp.strategy == "TWAP"
        assert exp.order_side == "BUY"
        assert exp.quantity == base_order_payload["quantity"]
        assert exp.status == "completed"
        assert exp.arrival_price > 0
        assert exp.avg_execution_price > 0
        assert exp.num_slices > 0
        logger.info(f"DB: Experiment {exp_id} persisted correctly")

    def test_simulation_persists_execution_logs(self, base_order_payload, db_session):
        """Verify that execution log rows are persisted."""
        from db.models import ExecutionLogModel

        payload = {**base_order_payload, "strategy": "VWAP"}
        r = requests.post(f"{API_URL}/execution/simulate", json=payload)
        assert r.status_code == 200
        exp_id = r.json()["experiment_id"]

        logs = (
            db_session.query(ExecutionLogModel)
            .filter(ExecutionLogModel.experiment_id == exp_id)
            .order_by(ExecutionLogModel.sequence_number)
            .all()
        )
        assert len(logs) > 0

        for log in logs:
            assert log.filled_qty >= 0
            assert log.execution_price > 0
            assert log.market_volume >= 0
        logger.info(f"DB: {len(logs)} execution logs persisted for {exp_id}")

    def test_ga_persists_experiment_and_params(self, base_order_payload, db_session):
        """Verify that GA optimization persists experiment + strategy parameters."""
        from db.models import Experiment, StrategyParameter

        payload = {
            **base_order_payload,
            "population_size": 6,
            "generations": 2,
            "seed": 42,
        }
        r = requests.post(f"{API_URL}/optimization/optimize", json=payload)
        assert r.status_code == 200
        exp_id = r.json()["experiment_id"]

        exp = db_session.query(Experiment).filter(Experiment.id == exp_id).first()
        assert exp is not None
        assert exp.strategy == "VWAP_GA"
        assert exp.seed == 42
        logger.info(f"DB: GA experiment {exp_id} persisted")

        params = (
            db_session.query(StrategyParameter)
            .filter(StrategyParameter.experiment_id == exp_id)
            .all()
        )
        param_names = {p.parameter_name for p in params}
        assert "slice_frequency" in param_names
        assert "participation_cap" in param_names
        assert "aggressiveness" in param_names
        logger.info(f"DB: {len(params)} strategy parameters persisted for GA experiment")

    def test_experiment_fields_not_null(self, base_order_payload, db_session):
        """Critical fields should never be null."""
        from db.models import Experiment

        payload = {**base_order_payload, "strategy": "TWAP"}
        r = requests.post(f"{API_URL}/execution/simulate", json=payload)
        assert r.status_code == 200
        exp_id = r.json()["experiment_id"]

        exp = db_session.query(Experiment).filter(Experiment.id == exp_id).first()
        assert exp.instrument is not None
        assert exp.strategy is not None
        assert exp.order_side is not None
        assert exp.quantity is not None
        assert exp.start_time is not None
        assert exp.end_time is not None
        assert exp.arrival_price is not None
        assert exp.avg_execution_price is not None
        assert exp.shortfall is not None
        assert exp.total_filled_qty is not None
        assert exp.num_slices is not None
        assert exp.status is not None
        assert exp.created_at is not None
        logger.info("DB: All critical experiment fields are non-null")


# ========================================================================
# 11. END-TO-END WORKFLOW
# ========================================================================

class TestEndToEnd:

    def test_full_workflow(self, base_order_payload, test_dates):
        """
        Full user journey:
        1. Fetch market data
        2. Simulate TWAP
        3. Simulate VWAP
        4. Compare strategies
        5. Evaluate custom params
        6. Run GA optimization
        7. Verify experiments exist in history
        """
        logger.info("=== E2E Workflow Start ===")

        # 1. Market data
        r = requests.post(f"{API_URL}/data/market", json={
            "ticker": "AAPL",
            "start": test_dates["data_start"],
            "end": test_dates["data_end"],
            "interval": "5m",
        })
        assert r.status_code == 200
        assert r.json()["num_candles"] > 0
        logger.info("E2E: Market data fetched")

        # 2. TWAP simulation
        twap_payload = {**base_order_payload, "strategy": "TWAP"}
        r = requests.post(f"{API_URL}/execution/simulate", json=twap_payload)
        assert r.status_code == 200
        twap_id = r.json()["experiment_id"]
        twap_shortfall = r.json()["metrics"]["implementation_shortfall"]
        logger.info(f"E2E: TWAP simulated (shortfall={twap_shortfall})")

        # 3. VWAP simulation
        vwap_payload = {**base_order_payload, "strategy": "VWAP"}
        r = requests.post(f"{API_URL}/execution/simulate", json=vwap_payload)
        assert r.status_code == 200
        vwap_id = r.json()["experiment_id"]
        vwap_shortfall = r.json()["metrics"]["implementation_shortfall"]
        logger.info(f"E2E: VWAP simulated (shortfall={vwap_shortfall})")

        # 4. Compare
        r = requests.post(f"{API_URL}/execution/compare", json=base_order_payload)
        assert r.status_code == 200
        recommendation = r.json()["recommendation"]
        logger.info(f"E2E: Comparison recommendation: {recommendation}")

        # 5. Manual param evaluation
        r = requests.post(f"{API_URL}/optimization/evaluate", json={
            **base_order_payload,
            "slice_frequency": 5,
            "participation_cap": 0.3,
            "aggressiveness": 1.2,
        })
        assert r.status_code == 200
        manual_cost = r.json()["cost"]
        logger.info(f"E2E: Manual param cost = {manual_cost}")

        # 6. GA optimization
        r = requests.post(f"{API_URL}/optimization/optimize", json={
            **base_order_payload,
            "population_size": 6,
            "generations": 2,
            "seed": 42,
        })
        assert r.status_code == 200
        ga_data = r.json()
        ga_cost = ga_data["best_cost"]
        ga_id = ga_data["experiment_id"]
        logger.info(f"E2E: GA best cost = {ga_cost}, params = {ga_data['best_parameters']}")

        # 7. Verify experiments in history
        r = requests.get(f"{API_URL}/experiments")
        assert r.status_code == 200
        all_ids = [str(e["id"]) for e in r.json()]
        assert twap_id in all_ids
        assert vwap_id in all_ids
        assert ga_id in all_ids
        logger.info("E2E: All experiments found in history")

        # Verify individual experiment detail
        for eid in [twap_id, vwap_id, ga_id]:
            r = requests.get(f"{API_URL}/experiments/{eid}")
            assert r.status_code == 200
            assert r.json() is not None
        logger.info("E2E: All experiment details accessible")

        logger.info("=== E2E Workflow Complete ===")


# ========================================================================
# 12. EDGE CASES & ERROR HANDLING
# ========================================================================

class TestEdgeCases:

    def test_invalid_json_body(self):
        r = requests.post(
            f"{API_URL}/execution/simulate",
            data="not json",
            headers={"Content-Type": "application/json"},
        )
        assert r.status_code == 422
        logger.info("Invalid JSON body handled correctly")

    def test_extra_fields_ignored(self, base_order_payload):
        payload = {**base_order_payload, "strategy": "TWAP", "unknown_field": "value"}
        r = requests.post(f"{API_URL}/execution/simulate", json=payload)
        # Should either succeed or reject — not crash
        assert r.status_code in (200, 422)
        logger.info(f"Extra fields: status {r.status_code}")

    def test_wrong_http_method_on_simulate(self):
        r = requests.get(f"{API_URL}/execution/simulate")
        assert r.status_code == 405
        logger.info("GET on POST-only endpoint returns 405")

    def test_wrong_http_method_on_health(self):
        r = requests.post(f"{API_URL}/health")
        assert r.status_code == 405
        logger.info("POST on GET-only health endpoint returns 405")

    def test_nonexistent_route(self):
        r = requests.get(f"{API_URL}/nonexistent")
        assert r.status_code == 404
        logger.info("Non-existent route returns 404")

    def test_concurrent_simulations(self, base_order_payload):
        """Run multiple simulations concurrently to check thread safety."""
        import concurrent.futures

        payload = {**base_order_payload, "strategy": "TWAP"}

        def run_sim():
            return requests.post(f"{API_URL}/execution/simulate", json=payload)

        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            futures = [executor.submit(run_sim) for _ in range(3)]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]

        for r in results:
            assert r.status_code == 200
        logger.info(f"Concurrent simulations: all {len(results)} succeeded")


# ========================================================================
# Main — run via: python scripts/test_execusim_api.py
# ========================================================================

if __name__ == "__main__":
    exit_code = pytest.main([__file__, "-v", "--tb=short", "-x"])
    sys.exit(exit_code)
