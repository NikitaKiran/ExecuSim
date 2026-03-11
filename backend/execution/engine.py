
import pandas as pd
from dataclasses import dataclass
from typing import List, Literal


# ==========================================
# CORE DATA STRUCTURES
# ==========================================

@dataclass
class ParentOrder:
    """
    Represents the large institutional trade to be executed.
    """
    ticker: str
    side: Literal['BUY', 'SELL']
    quantity: int
    start_time: pd.Timestamp
    end_time: pd.Timestamp


@dataclass
class ChildOrder:
    """
    Represents a slice of the parent order scheduled for a specific time.
    """
    timestamp: pd.Timestamp
    quantity: int


@dataclass
class ExecutionLog:
    """
    Records the actual result of a child order execution.
    """
    timestamp: pd.Timestamp
    requested_qty: int
    filled_qty: int
    execution_price: float
    market_volume: int
    strategy_name: str


# ==========================================
# CORE EXECUTION ENGINE
# ==========================================

class ExecutionEngine:
    def __init__(self, market_data: pd.DataFrame):
        self.market_data = market_data

    def validate_window(self, order: ParentOrder):
        """Checks if data exists for the requested window."""
        window_data = self.market_data.loc[order.start_time:order.end_time]
        if window_data.empty:
            raise ValueError(
                f"No market data found between {order.start_time} and {order.end_time}"
            )
        return window_data

    def run(
        self,
        order: ParentOrder,
        strategy_schedule: List[ChildOrder],
        strategy_name: str
    ) -> List[ExecutionLog]:
        """
        Simulates the execution of the child orders.

        Logic:
        1. Iterate through the strategy schedule.
        2. Match the child order timestamp to the market data candle.
        3. Execute at the 'Close' price.
        4. Log the result.
        """
        logs = []

        for child in strategy_schedule:

            if child.timestamp not in self.market_data.index:
                print(f"Warning: No market data for {child.timestamp}. Skipping slice.")
                continue

            candle = self.market_data.loc[child.timestamp]

            fill_price = candle['close']
            filled_qty = child.quantity  # Assuming 100% fill rate

            log = ExecutionLog(
                timestamp=child.timestamp,
                requested_qty=child.quantity,
                filled_qty=filled_qty,
                execution_price=fill_price,
                market_volume=int(candle['volume']),
                strategy_name=strategy_name
            )

            logs.append(log)

        return logs