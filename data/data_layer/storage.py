import os
import pandas as pd

DATA_FOLDER = "data"

def get_file_path(ticker, interval):
    os.makedirs(DATA_FOLDER, exist_ok=True)
    return f"{DATA_FOLDER}/{ticker}_{interval}_full.parquet"


def save_to_parquet(df, ticker, interval):
    file_path = get_file_path(ticker, interval)
    df.to_parquet(file_path, index=False)


def load_from_parquet(ticker, interval):
    file_path = get_file_path(ticker, interval)
    if os.path.exists(file_path):
        return pd.read_parquet(file_path)
    return None