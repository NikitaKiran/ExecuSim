

import pandas as pd


def compute_arrival_price(market_df: pd.DataFrame, start_time):
    """
    Get the first market price at or after the order start time.
    Assumes market_df has columns:
    ['datetime', 'close']
    """
    row = market_df[market_df["datetime"] >= start_time].iloc[0]
    return row["close"]


def compute_average_execution_price(execution_df: pd.DataFrame):
    """
    Weighted average execution price.
    Assumes execution_df has:
    ['execution_price', 'filled_qty']
    """
    total_value = (
        execution_df["execution_price"] *
        execution_df["filled_qty"]
    ).sum()

    total_qty = execution_df["filled_qty"].sum()

    if total_qty == 0:
        return 0

    return total_value / total_qty


def compute_slippage(avg_price, arrival_price, side):
    """
    Slippage calculation depending on BUY or SELL.
    """
    side = side.upper()

    if side == "BUY":
        return avg_price - arrival_price
    elif side == "SELL":
        return arrival_price - avg_price
    else:
        raise ValueError("Side must be BUY or SELL")


def compute_implementation_shortfall(avg_price, arrival_price, total_quantity, side):
    """
    Implementation shortfall in monetary terms.
    Direction-aware.
    """
    side = side.upper()

    if side == "BUY":
        return (avg_price - arrival_price) * total_quantity
    elif side == "SELL":
        return (arrival_price - avg_price) * total_quantity
    else:
        raise ValueError("Side must be BUY or SELL")


def add_participation_rate(execution_df: pd.DataFrame):
    """
    Adds participation rate column:
    filled_qty / market_volume
    """
    execution_df = execution_df.copy()

    execution_df["participation_rate"] = (
        execution_df["filled_qty"] /
        execution_df["market_volume"]
    )

    return execution_df