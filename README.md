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

---

## 📡 API Reference

Base URL: `http://127.0.0.1:8000`

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Basic status check |
| `GET` | `/api/health` | Health check, returns version |

---

### Market Data

#### `POST /api/data/market`
Fetch OHLCV candle data for a ticker. Missing date ranges are auto-downloaded and cached in Parquet.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `ticker` | string | No | `"AAPL"` | Ticker symbol |
| `start` | string | Yes | — | Start date (`YYYY-MM-DD`) |
| `end` | string | Yes | — | End date (`YYYY-MM-DD`) |
| `interval` | string | No | `"5m"` | Candle interval (`1m`, `5m`, `1d`, etc.) |

---

### Execution Simulation

#### `GET /api/execution/strategies`
List all available execution strategies (TWAP, VWAP).

#### `POST /api/execution/simulate`
Run a simulation for a single strategy.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `ticker` | string | No | `"AAPL"` | Ticker symbol |
| `side` | string | Yes | — | `"BUY"` or `"SELL"` |
| `quantity` | int | Yes | — | Total shares to execute |
| `start_time` | string | Yes | — | Execution window start (ISO 8601) |
| `end_time` | string | Yes | — | Execution window end (ISO 8601) |
| `strategy` | string | No | `"TWAP"` | `"TWAP"` or `"VWAP"` |
| `data_start` | string | Yes | — | Market data fetch start (`YYYY-MM-DD`) |
| `data_end` | string | Yes | — | Market data fetch end (`YYYY-MM-DD`) |
| `interval` | string | No | `"5m"` | Candle interval |

Returns execution logs, fill prices, slippage, and implementation shortfall.

#### `POST /api/execution/compare`
Compare TWAP vs VWAP on the same order. Returns metrics for both and a recommendation on which performed better.

---

### Optimization

#### `GET /api/optimization/params`
List tunable VWAP parameters with their bounds (`slice_frequency`, `participation_cap`, `aggressiveness`).

#### `POST /api/optimization/optimize`
Run the Genetic Algorithm optimizer to find the best VWAP parameters that minimize implementation shortfall.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `population_size` | int | No | `30` | GA population size (≥ 5) |
| `generations` | int | No | `20` | Number of GA generations (≥ 1) |
| `seed` | int | No | `42` | Random seed for reproducibility |
| *(+ all simulate fields)* | | | | Same order fields as `/simulate` |

#### `POST /api/optimization/evaluate`
Evaluate a specific set of VWAP parameters without running the full GA. Useful for manual tuning.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `slice_frequency` | int | No | `1` | Sample every N candles (≥ 1) |
| `participation_cap` | float | No | `1.0` | Max participation rate per candle (0–1] |
| `aggressiveness` | float | No | `1.0` | Volume weight multiplier (0–2] |

---

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
