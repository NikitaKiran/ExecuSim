"""
ExecuSim — FastAPI Backend Application
REST API layer exposing the execution simulation engine.
"""

import sys
import os

# Ensure project root is importable
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.models import HealthResponse
from api.routes.data import router as data_router
from api.routes.execution import router as execution_router
from api.routes.optimization import router as optimization_router
from api.routes.experiments import router as experiments_router

# ==========================================
# APP SETUP
# ==========================================

app = FastAPI(
    title="ExecuSim API",
    description=(
        "REST API for the ExecuSim execution simulation engine. "
        "Supports TWAP/VWAP strategy simulation, cost metric computation, "
        "and strategy comparison."
    ),
    version="0.1.0",
)

# Ensure DB tables exist on startup
@app.on_event("startup")
def on_startup():
    from db.bootstrap import bootstrap_database
    bootstrap_database()

# CORS — allow React frontend (Phase 8) to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# REGISTER ROUTERS
# ==========================================

app.include_router(data_router, prefix="/api")
app.include_router(execution_router, prefix="/api")
app.include_router(optimization_router, prefix="/api")
app.include_router(experiments_router, prefix="/api")

# ==========================================
# ROOT & HEALTH
# ==========================================


@app.get("/", tags=["Root"])
def root():
    return {"message": "ExecuSim API is running."}


@app.get("/api/health", response_model=HealthResponse, tags=["Health"])
def health_check():
    return HealthResponse(status="ok", version="0.1.0")
