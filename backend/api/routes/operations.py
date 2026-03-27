"""Operation history routes."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from api.models import OperationRecordListResponse, OperationRecordResponse
from api.auth import verify_firebase_token
from db.database import get_db
from db.models import OperationRecord
from db.repository import count_operation_records, deserialize_payload, list_operation_records

router = APIRouter(prefix="/operations", tags=["Operations"])


@router.get("", response_model=OperationRecordListResponse)
def get_operations(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: dict = Depends(verify_firebase_token),
):
    total = count_operation_records(db=db, firebase_uid=user["uid"])
    records = list_operation_records(
        db=db,
        firebase_uid=user["uid"],
        limit=limit,
        offset=offset,
    )
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
    return OperationRecordListResponse(
        total=total,
        limit=limit,
        offset=offset,
        items=payload,
    )


@router.get("/{operation_id}", response_model=OperationRecordResponse)
def get_operation(
    operation_id: str,
    db: Session = Depends(get_db),
    user: dict = Depends(verify_firebase_token),
):
    record = (
        db.query(OperationRecord)
        .filter(
            OperationRecord.id == operation_id,
            OperationRecord.firebase_uid == user["uid"],
        )
        .first()
    )
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
