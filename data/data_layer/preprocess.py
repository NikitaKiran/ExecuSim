import pandas as pd

def preprocess_market_data(df):
    df["datetime"] = pd.to_datetime(df["datetime"], utc=True)
    df = df.dropna()
    
    df = df.sort_values("datetime")

    numeric_cols = ["open", "high", "low", "close", "volume"]
    df[numeric_cols] = df[numeric_cols].astype(float)

    df = df[df["volume"] > 0]

    df = df.reset_index(drop=True)

    return df

def add_derived_metrics(df):
    df["typical_price"] = (df["high"] + df["low"] + df["close"]) / 3
    df["candle_vwap"] = df["typical_price"]
    df["cumulative_volume"] = df["volume"].cumsum()

    return df