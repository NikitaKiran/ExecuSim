from .downloader import download_market_data
from .preprocess import preprocess_market_data, add_derived_metrics
from .storage import load_from_parquet, save_to_parquet

import pandas as pd
from zoneinfo import ZoneInfo
import pandas as pd

ET = ZoneInfo("America/New_York")

INTRADAY_INTERVALS = {"1m", "5m", "15m", "30m", "1h"}

# Map period-style selections → number of daily bars to keep (most recent)
PERIOD_TO_MAX_BARS = {
    "1d":   30,      # reasonable max for daily view
    "5d":   7,       # ~5 trading days + buffer for weekends
    "1wk":  12,      # ~2 weeks of daily bars
    "1mo":  25,      # ~1 month
    # "3mo" removed - yfinance practical limit ~60 trading days for reliable data
}

def get_market_data(ticker, start, end, interval="5m"):

    # ── Decide if we should treat this as period-style (limit recent daily bars) ──
    original_interval = interval
    force_daily = original_interval in PERIOD_TO_MAX_BARS
    max_bars = PERIOD_TO_MAX_BARS.get(original_interval)

    # Use "1d" for all period-style requests
    effective_interval = "1d" if force_daily else interval

    # ── Load or download data ────────────────────────────────────────────────
    df = load_from_parquet(ticker, effective_interval)

    if df is None:
        print("No cache found. Downloading full data...")
        df = download_market_data(ticker, start, end, effective_interval)
        df = preprocess_market_data(df)
        df = add_derived_metrics(df)
        df["datetime"] = pd.to_datetime(df["datetime"], utc=True)
        save_to_parquet(df, ticker, effective_interval)
    else:
        print("Cache found. Checking coverage...")

    df["datetime"] = pd.to_datetime(df["datetime"], utc=True)

    stored_start = df["datetime"].min()
    stored_end   = df["datetime"].max()

    requested_start_input = pd.to_datetime(start)
    requested_end_input   = pd.to_datetime(end)

    # ── Define requested range ───────────────────────────────────────────────
    if original_interval in INTRADAY_INTERVALS:
        # Strict regular session hours
        requested_start = requested_start_input.replace(
            hour=9, minute=30, second=0, tzinfo=ET
        ).tz_convert("UTC")
        requested_end = requested_end_input.replace(
            hour=16, minute=0, second=0, tzinfo=ET
        ).tz_convert("UTC")
    else:
        # Full calendar days for daily / period views
        requested_start = requested_start_input.tz_localize(ET).tz_convert("UTC").floor("D")
        requested_end   = requested_end_input.tz_localize(ET).tz_convert("UTC").ceil("D") - pd.Timedelta(seconds=1)

    print(f"Effective requested range: {requested_start} to {requested_end}")

    # ── Update cache if needed ───────────────────────────────────────────────
    if requested_start < stored_start or requested_end > stored_end:
        print("Requested range outside cache. Updating cache...")
        download_start = min(requested_start, stored_start)
        download_end   = max(requested_end, stored_end)

        new_df = download_market_data(ticker, download_start, download_end, effective_interval)
        new_df = preprocess_market_data(new_df)
        new_df = add_derived_metrics(new_df)
        new_df["datetime"] = pd.to_datetime(new_df["datetime"], utc=True)

        df = pd.concat([df, new_df]).drop_duplicates(subset="datetime")
        df = df.sort_values("datetime").reset_index(drop=True)
        save_to_parquet(df, ticker, effective_interval)
    else:
        print("Requested range fully covered by cache.")

    # ── Apply time range filter ──────────────────────────────────────────────
    mask = (df["datetime"] >= requested_start) & (df["datetime"] <= requested_end)
    df = df.loc[mask].copy()

    # ── For period-style requests: keep only the most recent N bars ──────────
    if force_daily and max_bars is not None:
        df = df.tail(max_bars)

    df = df.set_index("datetime").sort_index()

    print(df.head())
    print(f"Returned {len(df)} rows for interval={original_interval}")

    return df