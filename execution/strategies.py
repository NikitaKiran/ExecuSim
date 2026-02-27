
import pandas as pd
from typing import List
from execution.engine import ParentOrder, ChildOrder


# ==========================================
# STRATEGY BASE CLASS
# ==========================================

class Strategy:
    def generate_schedule(
        self,
        order: ParentOrder,
        market_data: pd.DataFrame
    ) -> List[ChildOrder]:
        raise NotImplementedError("Strategies must implement generate_schedule")


# ==========================================
# TWAP STRATEGY
# ==========================================

class TWAPStrategy(Strategy):
    """
    Time Weighted Average Price Strategy.
    Splits the order quantity evenly across all available time bars in the window.
    """

    def generate_schedule(
        self,
        order: ParentOrder,
        market_data: pd.DataFrame
    ) -> List[ChildOrder]:

        window_data = market_data.loc[order.start_time:order.end_time]
        timestamps = window_data.index.tolist()

        if not timestamps:
            return []

        num_slices = len(timestamps)

        base_slice_size = order.quantity // num_slices
        remainder = order.quantity % num_slices

        schedule = []

        for i, ts in enumerate(timestamps):
            qty = base_slice_size

            if i == num_slices - 1:
                qty += remainder

            schedule.append(ChildOrder(timestamp=ts, quantity=qty))

        return schedule


# ==========================================
# VWAP STRATEGY
# ==========================================

class VWAPStrategy(Strategy):
    """
    Volume Weighted Average Price Strategy.
    Allocates trade quantity proportional to the volume traded in each candle.
    """

    def generate_schedule(
        self,
        order: ParentOrder,
        market_data: pd.DataFrame
    ) -> List[ChildOrder]:

        window_data = market_data.loc[order.start_time:order.end_time]

        if window_data.empty:
            return []

        total_window_volume = window_data['volume'].sum()

        if total_window_volume == 0:
            return TWAPStrategy().generate_schedule(order, market_data)

        schedule = []
        cumulative_qty = 0
        timestamps = window_data.index.tolist()
        volumes = window_data['volume'].tolist()

        for i, (ts, vol) in enumerate(zip(timestamps, volumes)):

            weight = vol / total_window_volume

            if i == len(timestamps) - 1:
                qty = order.quantity - cumulative_qty
            else:
                qty = int(order.quantity * weight)

            cumulative_qty += qty
            schedule.append(ChildOrder(timestamp=ts, quantity=qty))

        return schedule