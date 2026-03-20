from datetime import datetime, timezone
import json
import uuid
from sqlalchemy.orm import Session

from .models import (
    Experiment,
    StrategyParameter,
    ExecutionLogModel,
    OperationRecord,
    OperationExplanation,
    OperationExplanationLink,
)


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
    workers=None,
    firebase_uid: str = "",
):

    exp = Experiment(
        firebase_uid=firebase_uid,
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
        created_at=datetime.now(timezone.utc),
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


def save_operation_record(
    db: Session,
    firebase_uid: str,
    operation_type: str,
    request_payload: dict,
    response_payload: dict,
    status: str = "completed",
    experiment_id=None,
):
    record = OperationRecord(
        firebase_uid=firebase_uid,
        operation_type=operation_type,
        status=status,
        request_payload=json.dumps(request_payload, default=str),
        response_payload=json.dumps(response_payload, default=str),
        created_at=datetime.now(timezone.utc),
        experiment_id=experiment_id,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def list_operation_explanations(
    db: Session,
    firebase_uid: str,
    mode: str | None = None,
    limit: int = 100,
):
    query = db.query(OperationExplanation).filter(OperationExplanation.firebase_uid == firebase_uid)
    if mode:
        query = query.filter(OperationExplanation.mode == mode)

    return query.order_by(OperationExplanation.created_at.desc()).limit(limit).all()


def list_operation_records(db: Session, firebase_uid: str, limit: int = 200):
    return (
        db.query(OperationRecord)
        .filter(OperationRecord.firebase_uid == firebase_uid)
        .order_by(OperationRecord.created_at.desc())
        .limit(limit)
        .all()
    )


def get_operation_records_by_ids(db: Session, operation_ids: list[str], firebase_uid: str):
    parsed_ids = []
    for op_id in operation_ids:
        parsed_ids.append(uuid.UUID(op_id))

    return (
        db.query(OperationRecord)
        .filter(OperationRecord.id.in_(parsed_ids), OperationRecord.firebase_uid == firebase_uid)
        .order_by(OperationRecord.created_at.asc())
        .all()
    )


def save_operation_explanation(
    db: Session,
    operation_ids: list[str],
    firebase_uid: str,
    mode: str,
    answer: str,
    question: str | None = None,
):
    explanation = OperationExplanation(
        firebase_uid=firebase_uid,
        mode=mode,
        question=question,
        answer=answer,
        created_at=datetime.now(timezone.utc),
    )
    db.add(explanation)
    db.flush()

    records = get_operation_records_by_ids(db, operation_ids, firebase_uid)
    for record in records:
        db.add(
            OperationExplanationLink(
                explanation_id=explanation.id,
                operation_id=record.id,
            )
        )

    db.commit()
    db.refresh(explanation)
    return explanation


def deserialize_payload(raw_payload: str) -> dict:
    try:
        payload = json.loads(raw_payload)
        if isinstance(payload, dict):
            return payload
        return {"value": payload}
    except (TypeError, json.JSONDecodeError):
        return {"raw": raw_payload}