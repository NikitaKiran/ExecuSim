"""
Pydantic models for API request/response validation.
"""

from pydantic import BaseModel, Field
from typing import List, Literal, Optional
from datetime import datetime


# ==========================================
# REQUEST MODELS
# ==========================================

class MarketDataRequest(BaseModel):
    """Request body for fetching market data."""
    ticker: str = Field(default="AAPL", description="Ticker symbol (e.g., AAPL)")
    start: str = Field(..., description="Start date string (YYYY-MM-DD)")
    end: str = Field(..., description="End date string (YYYY-MM-DD)")
    interval: str = Field(default="5m", description="Candle interval (e.g., 5m, 1m, 1d)")


class SimulationRequest(BaseModel):
    """Request body for running an execution simulation."""
    ticker: str = Field(default="AAPL", description="Ticker symbol")
    side: Literal["BUY", "SELL"] = Field(..., description="Order side: BUY or SELL")
    quantity: int = Field(..., gt=0, description="Total shares to execute")
    start_time: str = Field(..., description="Execution window start (ISO 8601 / YYYY-MM-DD HH:MM:SS)")
    end_time: str = Field(..., description="Execution window end (ISO 8601 / YYYY-MM-DD HH:MM:SS)")
    strategy: Literal["TWAP", "VWAP"] = Field(default="TWAP", description="Execution strategy")
    # Market data range — typically wider than execution window
    data_start: str = Field(..., description="Market data fetch start date (YYYY-MM-DD)")
    data_end: str = Field(..., description="Market data fetch end date (YYYY-MM-DD)")
    interval: str = Field(default="5m", description="Candle interval")


class CompareRequest(BaseModel):
    """Request body for comparing TWAP vs VWAP on the same order."""
    ticker: str = Field(default="AAPL", description="Ticker symbol")
    side: Literal["BUY", "SELL"] = Field(..., description="Order side: BUY or SELL")
    quantity: int = Field(..., gt=0, description="Total shares to execute")
    start_time: str = Field(..., description="Execution window start (ISO 8601)")
    end_time: str = Field(..., description="Execution window end (ISO 8601)")
    data_start: str = Field(..., description="Market data fetch start date (YYYY-MM-DD)")
    data_end: str = Field(..., description="Market data fetch end date (YYYY-MM-DD)")
    interval: str = Field(default="5m", description="Candle interval")


# ==========================================
# RESPONSE MODELS
# ==========================================

class CandleData(BaseModel):
    """Single OHLCV candle."""
    datetime: str
    open: float
    high: float
    low: float
    close: float
    volume: float
    typical_price: Optional[float] = None
    candle_vwap: Optional[float] = None


class MarketDataResponse(BaseModel):
    """Response for market data endpoint."""
    ticker: str
    interval: str
    num_candles: int
    candles: List[CandleData]


class ExecutionLogEntry(BaseModel):
    """Single execution log entry."""
    timestamp: str
    requested_qty: int
    filled_qty: int
    execution_price: float
    market_volume: int
    strategy_name: str
    participation_rate: Optional[float] = None


class CostMetrics(BaseModel):
    """Computed cost metrics for an execution."""
    arrival_price: float
    average_execution_price: float
    slippage: float
    implementation_shortfall: float
    total_filled_qty: int


class SimulationResponse(BaseModel):
    """Full simulation result."""
    order: dict
    strategy: str
    metrics: CostMetrics
    execution_logs: List[ExecutionLogEntry]


class StrategyComparison(BaseModel):
    """Side-by-side comparison of two strategies."""
    strategy: str
    metrics: CostMetrics


class CompareResponse(BaseModel):
    """Response for strategy comparison endpoint."""
    order: dict
    comparisons: List[StrategyComparison]
    recommendation: str




class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    version: str
