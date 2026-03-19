from .downloader import download_market_data
from .preprocess import preprocess_market_data, add_derived_metrics
from .storage import load_from_parquet, save_to_parquet

import pandas as pd
from zoneinfo import ZoneInfo

ET = ZoneInfo("America/New_York")

INTRADAY_INTERVALS = {"1m", "5m", "15m", "30m", "1h"}

PERIOD_TO_MAX_BARS = {
    "1d":  30,
    "5d":  7,
    "1wk": 12,
    "1mo": 25,
}

# yfinance hard limit for intraday data
INTRADAY_MAX_DAYS = 59


def _sixty_days_ago() -> pd.Timestamp:
    """Returns a UTC timestamp for 59 days ago floored to midnight."""
    return (pd.Timestamp.now(tz="UTC") - pd.Timedelta(days=INTRADAY_MAX_DAYS)).floor("D")


def get_market_data(ticker, start, end, interval="5m"):

    original_interval = interval
    force_daily       = original_interval in PERIOD_TO_MAX_BARS
    max_bars          = PERIOD_TO_MAX_BARS.get(original_interval)
    effective_interval = "1d" if force_daily else interval
    is_intraday        = effective_interval in INTRADAY_INTERVALS

    # ── Load cache ───────────────────────────────────────────────────────────
    df = load_from_parquet(ticker, effective_interval)

    # ── Compute requested range ──────────────────────────────────────────────
    requested_start_input = pd.to_datetime(start)
    requested_end_input   = pd.to_datetime(end)

    if is_intraday:
        requested_start = requested_start_input.replace(
            hour=9, minute=30, second=0, tzinfo=ET
        ).tz_convert("UTC")
        requested_end = requested_end_input.replace(
            hour=16, minute=0, second=0, tzinfo=ET
        ).tz_convert("UTC")

        # ── CLAMP to yfinance 60-day hard limit ──────────────────────────────
        limit = _sixty_days_ago()
        if requested_start < limit:
            print(f"WARNING: Clamping start from {requested_start} to {limit} (yfinance 60-day limit)")
            requested_start = limit
        if requested_end > pd.Timestamp.now(tz="UTC"):
            requested_end = pd.Timestamp.now(tz="UTC")
    else:
        requested_start = requested_start_input.tz_localize(ET).tz_convert("UTC").floor("D")
        requested_end   = requested_end_input.tz_localize(ET).tz_convert("UTC").ceil("D") \
                          - pd.Timedelta(seconds=1)

    print(f"Effective requested range: {requested_start} to {requested_end}")

    # ── If no cache, download fresh ──────────────────────────────────────────
    if df is None:
        print("No cache found. Downloading full data...")
        df = download_market_data(ticker, requested_start, requested_end, effective_interval)
        df = preprocess_market_data(df)
        df = add_derived_metrics(df)
        df["datetime"] = pd.to_datetime(df["datetime"], utc=True)
        save_to_parquet(df, ticker, effective_interval)

    else:
        print("Cache found. Checking coverage...")
        df["datetime"] = pd.to_datetime(df["datetime"], utc=True)

        # ── Purge stale intraday rows older than 60 days from cache ──────────
        if is_intraday:
            limit = _sixty_days_ago()
            before = len(df)
            df = df[df["datetime"] >= limit].copy()
            purged = before - len(df)
            if purged > 0:
                print(f"Purged {purged} stale rows older than 60 days from cache.")
                save_to_parquet(df, ticker, effective_interval)

        stored_start = df["datetime"].min() if not df.empty else requested_start
        stored_end   = df["datetime"].max() if not df.empty else requested_start

        needs_update = (requested_start < stored_start) or (requested_end > stored_end)

        if needs_update:
            print("Requested range outside cache. Updating cache...")

            # ── Download only the MISSING parts, clamped to 60-day limit ────
            download_start = min(requested_start, stored_start)
            download_end   = max(requested_end,   stored_end)

            if is_intraday:
                download_start = max(download_start, _sixty_days_ago())

            print(f"Downloading: {download_start} → {download_end}")

            new_df = download_market_data(ticker, download_start, download_end, effective_interval)
            new_df = preprocess_market_data(new_df)
            new_df = add_derived_metrics(new_df)
            new_df["datetime"] = pd.to_datetime(new_df["datetime"], utc=True)

            df = pd.concat([df, new_df]).drop_duplicates(subset="datetime")
            df = df.sort_values("datetime").reset_index(drop=True)
            save_to_parquet(df, ticker, effective_interval)
        else:
            print("Requested range fully covered by cache.")

    # ── Filter to requested range ────────────────────────────────────────────
    df["datetime"] = pd.to_datetime(df["datetime"], utc=True)
    mask = (df["datetime"] >= requested_start) & (df["datetime"] <= requested_end)
    df   = df.loc[mask].copy()

    if force_daily and max_bars is not None:
        df = df.tail(max_bars)

    df = df.set_index("datetime").sort_index()

    print(df.head())
    print(f"Returned {len(df)} rows for interval={original_interval}")

    return df