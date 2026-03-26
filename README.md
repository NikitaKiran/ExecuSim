# 🧠 ExecuSim — Decision Making Simulator

ExecuSim is an AI-powered trade execution and decision making simulator. Simulate institutional-grade order execution strategies (TWAP & VWAP), optimize them using a Genetic Algorithm, and get real market data — all backed by a FastAPI backend, PostgreSQL database, Firebase Auth, and Google Gemini AI.

---

## ✨ Features

- 🔐 **User Authentication** — Secure sign-up, login, and session management via Firebase Auth
- 🤖 **AI-Powered Analysis** — Scenario feedback and summaries powered by Google Gemini
- 📈 **Market Data** — Fetch real OHLCV data for any ticker via yFinance, cached locally in Parquet
- ⚖️ **Execution Strategies** — Simulate and compare TWAP & VWAP order execution
- 🧬 **GA Optimizer** — Genetic Algorithm that finds optimal VWAP parameters to minimize implementation shortfall
- 🗄️ **Data Persistence** — User data and results stored in PostgreSQL via SQLAlchemy
- ⚡ **Fast & Modern UI** — React + Vite frontend with Tailwind CSS

---

## 🛠️ Tech Stack

### Frontend
| Layer | Technology |
|-------|------------|
| Framework | React + Vite + TypeScript |
| Styling | Tailwind CSS |
| Authentication | Firebase Auth |
| AI | Google Gemini API |

### Backend
| Layer | Technology |
|-------|------------|
| API Server | FastAPI + Uvicorn |
| Database | PostgreSQL + SQLAlchemy + Psycopg2 |
| Market Data | yFinance + PyArrow (Parquet cache) |
| Optimization | DEAP (Genetic Algorithm) |
| Firebase Admin | firebase-admin |

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) v18 or higher
- [Python](https://www.python.org/) 3.10 or higher
- [pip](https://pip.pypa.io/)
- A running [PostgreSQL](https://www.postgresql.org/) instance
- A [Firebase](https://firebase.google.com/) project
- A [Google Gemini API](https://ai.google.dev/) key

---

### Installation

#### 1. Clone the repository

```bash
git clone https://github.com/your-username/ExecuSim.git
cd ExecuSim
```

#### 2. Frontend Setup

```bash
cd frontend
npm install
```

#### 3. Backend Setup

```bash
cd backend
```

Create and activate a Python virtual environment:

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python -m venv venv
source venv/bin/activate
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

#### 4. Set up environment variables

Both the frontend and backend have their own `.env` files. See [Environment Variables](#-environment-variables) below.

#### 5. Run the backend API server

```bash
# From the /backend directory
python server.py
```

The API will be available at `http://127.0.0.1:8000`.

#### 6. Run the frontend dev server

```bash
# From the /frontend directory
npm run dev
```

The app will be available at `http://localhost:8080`.

---

## 🔑 Environment Variables

This project uses **two separate `.env` files** — one for the frontend and one for the backend.

---

### 📁 `frontend/.env`

Create a `.env` file inside the `frontend/` folder:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

| Variable | Where to find it |
|----------|-----------------|
| `VITE_FIREBASE_*` | [Firebase Console](https://console.firebase.google.com/) → Your Project → Project Settings → General → Your apps |

---

### 📁 `backend/.env`

A `backend/.env.example` file is included. Copy it and fill in your values:

```bash
cp .env.example .env
```

```env
# PostgreSQL
DB_NAME=execusim
DB_USER=your_postgres_username
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432
DATABASE_URL=postgresql://<DB_USER>:<DB_PASSWORD>@<DB_HOST>:<DB_PORT>/<DB_NAME>

# Gemini API
GEMINI_API_KEY=your_gemini_api_key
```

| Variable | Where to find it |
|----------|-----------------|
| `DB_*` / `DATABASE_URL` | Your local or hosted PostgreSQL instance credentials |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/app/apikey) |

---

> ⚠️ **Never commit your `.env` files to version control.** Make sure both `frontend/.env` and `backend/.env` are listed in your `.gitignore`.

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


## 📁 Project Structure

```
ExecuSim/
├── frontend/                 # React + Vite app
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Page-level components
│   │   ├── lib/              # Firebase, Gemini config
│   │   └── main.tsx          # App entry point
│   ├── .env                  # Frontend env vars (not committed)
│   ├── vite.config.ts
│   └── package.json
├── backend/                  # FastAPI backend
│  
│   ├── api/               # API route handlers, SQLAlchemy models
│   ├── execution/            # Business logic (execution)
│   ├── explainability/       # Business logic (ai integration)
│   ├── optimization/         # Business logic (optimization)
│   ├── data/                 # Parquet market data cache and Business Logic(fetching data)
│   ├── .env                  # Backend env vars (not committed)
│   ├── .env.example          # Template — copy this to .env
│  
│   
└── requirements.txt      # Python dependencies
└── README.md
```

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you'd like to change.

---
