"""Explainability routes grounded in persisted operation history."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.models import (
    OperationExplanationHistoryItem,
    OperationsExplainRequest,
    OperationsExplainResponse,
)
from api.auth import verify_firebase_token
from db.database import get_db
from db.repository import list_operation_explanations
from explainability import explain_operations

router = APIRouter(prefix="/explainability", tags=["Explainability"])


@router.post("/operations", response_model=OperationsExplainResponse)
def explain_from_operations(
    req: OperationsExplainRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(verify_firebase_token),
):
    """Generate a summary or answer using one or more stored operations."""
    try:
        payload = explain_operations(
            db=db,
            operation_ids=req.operation_ids,
            firebase_uid=user["uid"],
            question=req.question,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Explainability service unavailable: {exc}") from exc

    return OperationsExplainResponse(**payload)


@router.get("/operations/history", response_model=list[OperationExplanationHistoryItem])
def get_explanation_history(
    mode: str | None = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    user: dict = Depends(verify_firebase_token),
):
    if mode and mode not in {"summary", "question"}:
        raise HTTPException(status_code=400, detail="mode must be either 'summary' or 'question'.")

    records = list_operation_explanations(
        db=db,
        firebase_uid=user["uid"],
        mode=mode,
        limit=limit,
    )
    payload = []
    for item in records:
        payload.append(
            OperationExplanationHistoryItem(
                id=str(item.id),
                mode=item.mode,
                question=item.question,
                answer=item.answer,
                created_at=item.created_at,
                operation_ids=[str(link.operation_id) for link in item.operation_links],
            )
        )
    return payload
