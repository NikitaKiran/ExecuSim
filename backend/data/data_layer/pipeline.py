from .downloader import download_market_data
from .preprocess import preprocess_market_data, add_derived_metrics
from .storage import load_from_parquet, save_to_parquet

import pandas as pd


# def get_market_data(ticker, start, end, interval="5m"):

#     df = load_from_parquet(ticker, interval)
    

#     if df is None:
#         print("No cache found. Downloading full data...")
#         df = download_market_data(ticker, start, end, interval)
#         df = preprocess_market_data(df)
#         df = add_derived_metrics(df)
#         df["datetime"] = pd.to_datetime(df["datetime"], utc=True)
#         save_to_parquet(df, ticker, interval)

#     else:
#         print("Cache found. Checking coverage...")

#     df["datetime"] = pd.to_datetime(df["datetime"], utc=True)

#     stored_start = df["datetime"].min()
#     stored_end = df["datetime"].max()

#     requested_start = pd.to_datetime(start, utc=True)
#     requested_end = pd.to_datetime(end, utc=True)


#     if requested_start < stored_start.replace(hour=0, minute=0) or requested_end > stored_end.replace(hour=0,minute=0):
#         print("Requested range outside cache. Updating cache...")

#         # Only download missing parts instead of entire range
#         download_start = min(requested_start, stored_start)
#         download_end = max(requested_end, stored_end)

#         new_df = download_market_data(ticker, download_start, download_end, interval)
#         new_df = preprocess_market_data(new_df)
#         new_df = add_derived_metrics(new_df)
#         new_df["datetime"] = pd.to_datetime(new_df["datetime"], utc=True)


#         df = pd.concat([df, new_df]).drop_duplicates(subset="datetime")
#         df = df.sort_values("datetime").reset_index(drop=True)

#         save_to_parquet(df, ticker, interval)
#     else:
#         print("Requested range fully covered by cache.")

#     requested_start = pd.to_datetime(start, utc=True)
#     requested_end = pd.to_datetime(end, utc=True)

#     mask = (df["datetime"] >= requested_start) & \
#        (df["datetime"] <= requested_end)

#     df = df.loc[mask].copy()
#     df["datetime"] = pd.to_datetime(df["datetime"], utc=True)

#     df = df.set_index("datetime")

# # Sort index (important for .loc slicing)
#     df = df.sort_index()

#     return df
from zoneinfo import ZoneInfo

ET = ZoneInfo("America/New_York")

def get_market_data(ticker, start, end, interval="5m"):

    df = load_from_parquet(ticker, interval)

    if df is None:
        print("No cache found. Downloading full data...")
        df = download_market_data(ticker, start, end, interval)
        df = preprocess_market_data(df)
        df = add_derived_metrics(df)
        df["datetime"] = pd.to_datetime(df["datetime"], utc=True)
        save_to_parquet(df, ticker, interval)
    else:
        print("Cache found. Checking coverage...")

    df["datetime"] = pd.to_datetime(df["datetime"], utc=True)

    stored_start = df["datetime"].min()
    stored_end   = df["datetime"].max()

    # ── Parse requested range as 9:30 AM → 4:00 PM ET ──────────────────────
    requested_start = pd.Timestamp(start).replace(
        hour=9, minute=30, second=0, tzinfo=ET
    ).tz_convert("UTC")

    requested_end = pd.Timestamp(end).replace(
        hour=16, minute=0, second=0, tzinfo=ET
    ).tz_convert("UTC")
    # ────────────────────────────────────────────────────────────────────────

    if requested_start < stored_start or requested_end > stored_end:
        print("Requested range outside cache. Updating cache...")

        download_start = min(requested_start, stored_start)
        download_end   = max(requested_end,   stored_end)

        new_df = download_market_data(ticker, download_start, download_end, interval)
        new_df = preprocess_market_data(new_df)
        new_df = add_derived_metrics(new_df)
        new_df["datetime"] = pd.to_datetime(new_df["datetime"], utc=True)

        df = pd.concat([df, new_df]).drop_duplicates(subset="datetime")
        df = df.sort_values("datetime").reset_index(drop=True)
        save_to_parquet(df, ticker, interval)
    else:
        print("Requested range fully covered by cache.")

    mask = (df["datetime"] >= requested_start) & (df["datetime"] <= requested_end)
    df = df.loc[mask].copy()
    df = df.set_index("datetime").sort_index()

    print(df)

    return df