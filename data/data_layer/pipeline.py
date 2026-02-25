from .downloader import download_market_data
from .preprocess import preprocess_market_data, add_derived_metrics
from .storage import load_from_parquet, save_to_parquet

import pandas as pd


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

        df["datetime"] = pd.to_datetime(df["datetime"])

        stored_start = df["datetime"].min()
        stored_end = df["datetime"].max()

        requested_start = pd.to_datetime(start,utc=True)
        requested_end = pd.to_datetime(end, utc=True)

        if requested_start < stored_start or requested_end > stored_end:
            print("Requested range outside cache. Updating cache...")

            new_df = download_market_data(ticker, start, end, interval)
            new_df = preprocess_market_data(new_df)
            new_df = add_derived_metrics(new_df)

            # Merge and remove duplicates
            df = pd.concat([df, new_df])
            df = df.drop_duplicates(subset="datetime")
            df = df.sort_values("datetime").reset_index(drop=True)

            save_to_parquet(df, ticker, interval)
        else:
            print("Requested range fully covered by cache.")

    requested_start = pd.to_datetime(start, utc=True)
    requested_end = pd.to_datetime(end, utc=True)

    mask = (df["datetime"] >= requested_start) & \
       (df["datetime"] <= requested_end)

    df = df.loc[mask].reset_index(drop=True)

    return df