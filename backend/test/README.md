# ExecuSim Backend Integration Tests

This folder contains the end-to-end API integration suite in `test_execusim_api.py`.

## Prerequisites

- Python environment available
- Backend dependencies installed
- A running backend server on `http://localhost:8000` (or set `EXECUSIM_BASE_URL`)
- Firebase auth configured for test requests

## Install Test Dependencies

From this folder (`backend/test`):

```bash
pip install -r requirements.txt
```

## Start Backend Server

From `backend` folder:

```bash
python3 server.py
```

## Confirm Server Is Online

```bash
curl http://localhost:8000/api/health
```

Expected response includes:

```json
{"status":"ok","version":"0.1.0"}
```

## Configure Authentication

These tests call protected `/api/*` endpoints and require a Firebase bearer token.

Use one of the following methods:

### Option A: Provide ID Token Directly

```bash
export EXECUSIM_TEST_BEARER_TOKEN="<firebase_id_token>"
```

### Option B: Let Test Suite Fetch Token via Firebase Identity Toolkit

```bash
export EXECUSIM_FIREBASE_API_KEY="<web_api_key>"
export EXECUSIM_TEST_EMAIL="<test_user_email>"
export EXECUSIM_TEST_PASSWORD="<test_user_password>"
```

If both are provided, `EXECUSIM_TEST_BEARER_TOKEN` is used first.

## Run Tests

Run full suite:

```bash
pytest test_execusim_api.py -v
```

Run a subset:

```bash
pytest test_execusim_api.py -v -k "test_health"
```

## Optional Environment Variables

- `EXECUSIM_BASE_URL` (default: `http://localhost:8000`)

Example:

```bash
export EXECUSIM_BASE_URL="http://localhost:8000"
pytest test_execusim_api.py -v
```
