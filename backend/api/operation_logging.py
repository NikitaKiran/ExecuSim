"""Shared helpers for operation record logging."""

from typing import Callable, TypeVar

from fastapi import HTTPException
from sqlalchemy.orm import Session

from db.repository import save_operation_record

T = TypeVar("T")


def record_failed_operation(
    db: Session,
    firebase_uid: str,
    operation_type: str,
    request_payload: dict,
    detail: str,
    status_code: int,
) -> None:
    """Best-effort failed operation logging that never raises."""
    try:
        save_operation_record(
            db=db,
            firebase_uid=firebase_uid,
            operation_type=operation_type,
            request_payload=request_payload,
            response_payload={"error": detail, "status_code": status_code},
            status="failed",
        )
    except Exception:
        # Logging must not shadow the primary endpoint error.
        pass


def record_completed_operation(
    db: Session,
    firebase_uid: str,
    operation_type: str,
    request_payload: dict,
    response_payload: dict,
    experiment_id=None,
):
    """Persist a successful operation record."""
    return save_operation_record(
        db=db,
        firebase_uid=firebase_uid,
        operation_type=operation_type,
        request_payload=request_payload,
        response_payload=response_payload,
        status="completed",
        experiment_id=experiment_id,
    )


def execute_with_failed_operation_logging(
    *,
    db: Session,
    firebase_uid: str,
    operation_type: str,
    request_payload: dict,
    executor: Callable[[], T],
) -> T:
    """Execute endpoint logic and ensure failures are logged once."""
    try:
        return executor()
    except HTTPException as exc:
        record_failed_operation(
            db=db,
            firebase_uid=firebase_uid,
            operation_type=operation_type,
            request_payload=request_payload,
            detail=str(exc.detail),
            status_code=exc.status_code,
        )
        raise
    except Exception as exc:
        detail = f"{operation_type} operation failed: {str(exc)}"
        record_failed_operation(
            db=db,
            firebase_uid=firebase_uid,
            operation_type=operation_type,
            request_payload=request_payload,
            detail=detail,
            status_code=500,
        )
        raise HTTPException(status_code=500, detail=detail)
