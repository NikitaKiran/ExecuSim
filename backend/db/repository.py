from datetime import datetime
from sqlalchemy.orm import Session

from .models import Experiment, StrategyParameter, ExecutionLogModel


def _py_float(val):
    """Safely convert numpy/pandas floats to Python float."""
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


def _py_int(val):
    """Safely convert numpy/pandas ints to Python int."""
    try:
        return int(val)
    except (TypeError, ValueError):
        return None


def save_experiment(
    db: Session,
    order,
    strategy,
    metrics,
    df_logs,
    params=None,
    seed=None,
    workers=None
):

    exp = Experiment(
        instrument=order.ticker,
        strategy=strategy,
        order_side=order.side,
        quantity=int(order.quantity),
        start_time=order.start_time,
        end_time=order.end_time,
        arrival_price=_py_float(metrics.arrival_price),
        avg_execution_price=_py_float(metrics.average_execution_price),
        shortfall=_py_float(metrics.implementation_shortfall),
        total_filled_qty=_py_int(metrics.total_filled_qty),
        avg_participation_rate=_py_float(df_logs["participation_rate"].mean()),
        num_slices=int(len(df_logs)),
        seed=_py_int(seed),
        worker_count=_py_int(workers),
        status="completed",
        created_at=datetime.utcnow(),
    )

    db.add(exp)
    db.commit()
    db.refresh(exp)

    experiment_id = exp.id

    # save parameters
    if params:
        for k, v in params.items():
            p = StrategyParameter(
                experiment_id=experiment_id,
                parameter_name=k,
                parameter_value=str(v),
            )
            db.add(p)

    # save execution logs
    for i, row in df_logs.iterrows():

        log = ExecutionLogModel(
            experiment_id=experiment_id,
            sequence_number=int(i),
            timestamp=row["timestamp"],
            filled_qty=_py_int(row["filled_qty"]),
            market_volume=_py_int(row["market_volume"]),
            participation_rate=_py_float(row["participation_rate"]),
            execution_price=_py_float(row["execution_price"]),
        )

        db.add(log)

    db.commit()

    return experiment_id