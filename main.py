from data.data_layer.downloader import download_market_data
from data.data_layer.preprocess import preprocess_market_data
from data.data_layer.preprocess import add_derived_metrics
from data.data_layer.pipeline import get_market_data

df = get_market_data(
    ticker="AAPL",
    start="2026-01-20",
    end="2026-02-05",
    interval="5m"
)

df = preprocess_market_data(df)
df = add_derived_metrics(df)
print(df.head())



print(df.head())
