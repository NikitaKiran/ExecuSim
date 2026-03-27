"""
Market data API routes.
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from fastapi import APIRouter, HTTPException
from fastapi import Depends
from sqlalchemy.orm import Session
from api.models import MarketDataRequest, MarketDataResponse, CandleData
from api.auth import verify_firebase_token_optional
from api.operation_logging import record_failed_operation, record_completed_operation

from data.data_layer.pipeline import get_market_data
from db.database import get_db

router = APIRouter(prefix="/data", tags=["Market Data"])


@router.post("/market", response_model=MarketDataResponse)
def fetch_market_data(
    req: MarketDataRequest,
    db: Session = Depends(get_db),
    user: dict | None = Depends(verify_firebase_token_optional),
):
    """
    Fetch OHLCV market data for a ticker and date range.
    Data is cached in Parquet; missing ranges are downloaded automatically.
    """
    try:
        df = get_market_data(
            ticker=req.ticker,
            start=req.start,
            end=req.end,
            interval=req.interval
        )
    except Exception as e:
        detail = f"Data fetch failed: {str(e)}"
        if user:
            record_failed_operation(
                db=db,
                firebase_uid=user["uid"],
                operation_type="market_data",
                request_payload=req.dict(),
                detail=detail,
                status_code=400,
            )
        raise HTTPException(status_code=400, detail=detail)

    if df.empty:
        detail = "No market data found for the given parameters."
        if user:
            record_failed_operation(
                db=db,
                firebase_uid=user["uid"],
                operation_type="market_data",
                request_payload=req.dict(),
                detail=detail,
                status_code=404,
            )
        raise HTTPException(status_code=404, detail=detail)

    df_out = df.reset_index()
    df_out.rename(columns={"index": "datetime"}, inplace=True)

    if "datetime" not in df_out.columns:
        for col in df_out.columns:
            if "date" in col.lower() or "time" in col.lower():
                df_out.rename(columns={col: "datetime"}, inplace=True)
                break

    candles = []
    for _, row in df_out.iterrows():
        candles.append(CandleData(
            datetime=str(row["datetime"]),
            open=float(row["open"]),
            high=float(row["high"]),
            low=float(row["low"]),
            close=float(row["close"]),
            volume=float(row["volume"]),
            typical_price=float(row["typical_price"]) if "typical_price" in row else None,
            candle_vwap=float(row["candle_vwap"]) if "candle_vwap" in row else None,
        ))

    response_payload = {
        "ticker": req.ticker,
        "interval": req.interval,
        "num_candles": len(candles),
        "candles": [c.dict() for c in candles],
    }

    operation_id = None
    if user:
        operation = record_completed_operation(
            db=db,
            firebase_uid=user["uid"],
            operation_type="market_data",
            request_payload=req.dict(),
            response_payload=response_payload,
        )
        operation_id = str(operation.id)

    return MarketDataResponse(
        ticker=req.ticker,
        interval=req.interval,
        num_candles=len(candles),
        candles=candles,
        operation_id=operation_id,
    )
