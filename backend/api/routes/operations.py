"""Operation history routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.models import OperationRecordResponse
from db.database import get_db
from db.models import OperationRecord
from db.repository import deserialize_payload, list_operation_records

router = APIRouter(prefix="/operations", tags=["Operations"])


@router.get("", response_model=list[OperationRecordResponse])
def get_operations(limit: int = 200, db: Session = Depends(get_db)):
    records = list_operation_records(db=db, limit=limit)
    payload = []
    for record in records:
        payload.append(
            OperationRecordResponse(
                id=str(record.id),
                operation_type=record.operation_type,
                status=record.status,
                created_at=record.created_at,
                request_payload=deserialize_payload(record.request_payload),
                response_payload=deserialize_payload(record.response_payload),
            )
        )
    return payload


@router.get("/{operation_id}", response_model=OperationRecordResponse)
def get_operation(operation_id: str, db: Session = Depends(get_db)):
    record = db.query(OperationRecord).filter(OperationRecord.id == operation_id).first()
    if record is None:
        raise HTTPException(status_code=404, detail="Operation not found.")

    return OperationRecordResponse(
        id=str(record.id),
        operation_type=record.operation_type,
        status=record.status,
        created_at=record.created_at,
        request_payload=deserialize_payload(record.request_payload),
        response_payload=deserialize_payload(record.response_payload),
    )
