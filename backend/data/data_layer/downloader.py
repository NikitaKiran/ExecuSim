import yfinance as yf
import pandas as pd


def download_market_data(ticker, start, end, interval="5m"):

    df = yf.download(
        ticker,
        start=start,
        end=end,
        interval=interval,
        progress=False
    )

    # Check if download failed
    if df is None or df.empty:
        raise ValueError(
            f"No data returned for {ticker} with interval={interval}. "
            "If using intraday intervals, ensure date range is within last 60 days."
        )

    df = df.reset_index()

    # Handle possible multiindex columns safely
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = [col[0].lower() for col in df.columns]
    else:
        df.columns = [col.lower() for col in df.columns]

    return df