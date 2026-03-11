import pandas as pd

def preprocess_market_data(df):

    print("COLUMNS BEFORE PROCESSING:", df.columns)
    print("INDEX TYPE:", type(df.index))
    print("INDEX NAME:", df.index.name)
    # df["datetime"] = pd.to_datetime(df["datetime"], utc=True)

    # If datetime is in index (yfinance case), bring it into a column
    if isinstance(df.index, pd.DatetimeIndex):
       df = df.reset_index()

    # Handle 1d vs intraday column names
    if "Date" in df.columns:
       df.rename(columns={"Date": "datetime"}, inplace=True)
    elif "Datetime" in df.columns:
       df.rename(columns={"Datetime": "datetime"}, inplace=True)
    elif "date" in df.columns:
       df.rename(columns={"date": "datetime"}, inplace=True)

    df["datetime"] = pd.to_datetime(df["datetime"], utc=True)


    df = df.dropna()
    
    df = df.sort_values("datetime")
    df.columns = [col.lower() for col in df.columns]
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