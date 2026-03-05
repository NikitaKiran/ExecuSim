# ExecuSim API Reference

Base URL: `http://127.0.0.1:8000`

---

## Root & Health

### `GET /`

Returns a basic status message.

**Response**
```json
{
  "message": "ExecuSim API is running."
}
```

---

### `GET /api/health`

Health check endpoint.

**Response**
```json
{
  "status": "ok",
  "version": "0.1.0"
}
```

---

## Market Data

### `POST /api/data/market`

Fetch OHLCV market data for a ticker and date range. Data is cached in Parquet; missing ranges are downloaded automatically.

**Request Body**
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `ticker` | string | No | `"AAPL"` | Ticker symbol |
| `start` | string | Yes | — | Start date (`YYYY-MM-DD`) |
| `end` | string | Yes | — | End date (`YYYY-MM-DD`) |
| `interval` | string | No | `"5m"` | Candle interval (e.g. `1m`, `5m`, `1d`) |

**Example Request**
```json
{
  "ticker": "AAPL",
  "start": "2026-03-01",
  "end": "2026-03-05",
  "interval": "5m"
}
```

**Response** (`200 OK`)
```json
{
  "ticker": "AAPL",
  "interval": "5m",
  "num_candles": 390,
  "candles": [
    {
      "datetime": "2026-03-02 09:30:00-05:00",
      "open": 150.12,
      "high": 150.45,
      "low": 150.01,
      "close": 150.30,
      "volume": 125000.0,
      "typical_price": 150.253,
      "candle_vwap": 150.22
    }
  ]
}
```

**Error Responses**
- `400` — Data fetch failed (invalid ticker, date range, etc.)
- `404` — No market data found for the given parameters

---

## Execution Simulation

### `GET /api/execution/strategies`

List available execution strategies.

**Response**
```json
{
  "strategies": [
    {
      "name": "TWAP",
      "description": "Time Weighted Average Price — splits order evenly across time."
    },
    {
      "name": "VWAP",
      "description": "Volume Weighted Average Price — allocates proportionally to volume."
    }
  ]
}
```

---

### `POST /api/execution/simulate`

Run an execution simulation for a single strategy (TWAP or VWAP).

**Request Body**
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `ticker` | string | No | `"AAPL"` | Ticker symbol |
| `side` | string | Yes | — | `"BUY"` or `"SELL"` |
| `quantity` | int | Yes | — | Total shares to execute (> 0) |
| `start_time` | string | Yes | — | Execution window start (ISO 8601) |
| `end_time` | string | Yes | — | Execution window end (ISO 8601) |
| `strategy` | string | No | `"TWAP"` | `"TWAP"` or `"VWAP"` |
| `data_start` | string | Yes | — | Market data fetch start (`YYYY-MM-DD`) |
| `data_end` | string | Yes | — | Market data fetch end (`YYYY-MM-DD`) |
| `interval` | string | No | `"5m"` | Candle interval |

**Example Request**
```json
{
  "ticker": "AAPL",
  "side": "BUY",
  "quantity": 1000,
  "start_time": "2026-03-05T09:00:00Z",
  "end_time": "2026-03-05T16:00:00Z",
  "strategy": "TWAP",
  "data_start": "2026-03-01",
  "data_end": "2026-03-05",
  "interval": "5m"
}
```

**Response** (`200 OK`)
```json
{
  "order": {
    "ticker": "AAPL",
    "side": "BUY",
    "quantity": 1000,
    "start_time": "2026-03-05 09:00:00+00:00",
    "end_time": "2026-03-05 16:00:00+00:00"
  },
  "strategy": "TWAP",
  "metrics": {
    "arrival_price": 150.12,
    "average_execution_price": 150.25,
    "slippage": 0.13,
    "implementation_shortfall": 130.0,
    "total_filled_qty": 1000
  },
  "execution_logs": [
    {
      "timestamp": "2026-03-05 09:30:00+00:00",
      "requested_qty": 13,
      "filled_qty": 13,
      "execution_price": 150.15,
      "market_volume": 50000,
      "strategy_name": "TWAP",
      "participation_rate": 0.00026
    }
  ]
}
```

**Error Responses**
- `400` — Market data error, empty schedule, or no fills
- `404` — No market data available for the specified range

---

### `POST /api/execution/compare`

Compare TWAP and VWAP on the same parent order. Returns metrics for both strategies and a recommendation.

**Request Body**
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `ticker` | string | No | `"AAPL"` | Ticker symbol |
| `side` | string | Yes | — | `"BUY"` or `"SELL"` |
| `quantity` | int | Yes | — | Total shares to execute (> 0) |
| `start_time` | string | Yes | — | Execution window start (ISO 8601) |
| `end_time` | string | Yes | — | Execution window end (ISO 8601) |
| `data_start` | string | Yes | — | Market data fetch start (`YYYY-MM-DD`) |
| `data_end` | string | Yes | — | Market data fetch end (`YYYY-MM-DD`) |
| `interval` | string | No | `"5m"` | Candle interval |

**Example Request**
```json
{
  "ticker": "AAPL",
  "side": "BUY",
  "quantity": 1000,
  "start_time": "2026-03-05T09:00:00Z",
  "end_time": "2026-03-05T16:00:00Z",
  "data_start": "2026-03-01",
  "data_end": "2026-03-05",
  "interval": "5m"
}
```

**Response** (`200 OK`)
```json
{
  "order": {
    "ticker": "AAPL",
    "side": "BUY",
    "quantity": 1000,
    "start_time": "2026-03-05 09:00:00+00:00",
    "end_time": "2026-03-05 16:00:00+00:00"
  },
  "comparisons": [
    {
      "strategy": "TWAP",
      "metrics": {
        "arrival_price": 150.12,
        "average_execution_price": 150.25,
        "slippage": 0.13,
        "implementation_shortfall": 130.0,
        "total_filled_qty": 1000
      }
    },
    {
      "strategy": "VWAP",
      "metrics": {
        "arrival_price": 150.12,
        "average_execution_price": 150.18,
        "slippage": 0.06,
        "implementation_shortfall": 60.0,
        "total_filled_qty": 1000
      }
    }
  ],
  "recommendation": "VWAP produced lower slippage ($0.0600) vs TWAP ($0.1300). VWAP is recommended for this execution window."
}
```

**Error Responses**
- `400` — Market data error, empty schedule, or no fills
- `404` — No market data available

---

## Optimization

### `GET /api/optimization/params`

List the VWAP parameters that the GA optimizer can tune, along with their bounds and data types.

**Response** (`200 OK`)
```json
{
  "parameters": [
    {
      "name": "slice_frequency",
      "min_value": 1.0,
      "max_value": 10.0,
      "dtype": "int"
    },
    {
      "name": "participation_cap",
      "min_value": 0.01,
      "max_value": 1.0,
      "dtype": "float"
    },
    {
      "name": "aggressiveness",
      "min_value": 0.1,
      "max_value": 2.0,
      "dtype": "float"
    }
  ]
}
```

---

### `POST /api/optimization/optimize`

Run the Genetic Algorithm optimizer to find the best VWAP parameters (`slice_frequency`, `participation_cap`, `aggressiveness`) that minimize implementation shortfall for the given order.

**Request Body**
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `ticker` | string | No | `"AAPL"` | Ticker symbol |
| `side` | string | Yes | — | `"BUY"` or `"SELL"` |
| `quantity` | int | Yes | — | Total shares to execute (> 0) |
| `start_time` | string | Yes | — | Execution window start (ISO 8601) |
| `end_time` | string | Yes | — | Execution window end (ISO 8601) |
| `data_start` | string | Yes | — | Market data fetch start (`YYYY-MM-DD`) |
| `data_end` | string | Yes | — | Market data fetch end (`YYYY-MM-DD`) |
| `interval` | string | No | `"5m"` | Candle interval |
| `population_size` | int | No | `30` | GA population size (≥ 5) |
| `generations` | int | No | `20` | Number of GA generations (≥ 1) |
| `seed` | int | No | `42` | Random seed for reproducibility |

**Example Request**
```json
{
  "ticker": "AAPL",
  "side": "BUY",
  "quantity": 1000,
  "start_time": "2026-03-05T09:00:00Z",
  "end_time": "2026-03-05T16:00:00Z",
  "data_start": "2026-03-01",
  "data_end": "2026-03-05",
  "interval": "5m",
  "population_size": 30,
  "generations": 20,
  "seed": 42
}
```

**Response** (`200 OK`)
```json
{
  "best_parameters": {
    "slice_frequency": 2,
    "participation_cap": 0.85,
    "aggressiveness": 1.35
  },
  "best_cost": 42.15,
  "generations_run": 20,
  "population_size": 30,
  "best_strategy_metrics": {
    "arrival_price": 150.12,
    "average_execution_price": 150.16,
    "slippage": 0.04,
    "implementation_shortfall": 42.15,
    "total_filled_qty": 1000
  }
}
```

**Error Responses**
- `400` — Market data error
- `404` — No market data available for the specified range
- `500` — Optimization failed (GA internal error)

---

### `POST /api/optimization/evaluate`

Evaluate a specific set of VWAP parameters without running the full GA. Useful for manual exploration or validating optimizer results.

**Request Body**
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `ticker` | string | No | `"AAPL"` | Ticker symbol |
| `side` | string | Yes | — | `"BUY"` or `"SELL"` |
| `quantity` | int | Yes | — | Total shares to execute (> 0) |
| `start_time` | string | Yes | — | Execution window start (ISO 8601) |
| `end_time` | string | Yes | — | Execution window end (ISO 8601) |
| `data_start` | string | Yes | — | Market data fetch start (`YYYY-MM-DD`) |
| `data_end` | string | Yes | — | Market data fetch end (`YYYY-MM-DD`) |
| `interval` | string | No | `"5m"` | Candle interval |
| `slice_frequency` | int | No | `1` | Sample every N candles (≥ 1) |
| `participation_cap` | float | No | `1.0` | Max participation rate per candle (0–1] |
| `aggressiveness` | float | No | `1.0` | Volume weight multiplier (0–2] |

**Example Request**
```json
{
  "ticker": "AAPL",
  "side": "BUY",
  "quantity": 1000,
  "start_time": "2026-03-05T09:00:00Z",
  "end_time": "2026-03-05T16:00:00Z",
  "data_start": "2026-03-01",
  "data_end": "2026-03-05",
  "interval": "5m",
  "slice_frequency": 2,
  "participation_cap": 0.85,
  "aggressiveness": 1.35
}
```

**Response** (`200 OK`)
```json
{
  "parameters": {
    "slice_frequency": 2,
    "participation_cap": 0.85,
    "aggressiveness": 1.35
  },
  "cost": 42.15,
  "metrics": {
    "arrival_price": 150.12,
    "average_execution_price": 150.16,
    "slippage": 0.04,
    "implementation_shortfall": 42.15,
    "total_filled_qty": 1000
  }
}
```

**Error Responses**
- `400` — Market data error, empty schedule, or no fills
- `404` — No market data available for the specified range
