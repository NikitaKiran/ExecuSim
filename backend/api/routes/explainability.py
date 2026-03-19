"""Explainability routes grounded in persisted operation history."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.models import OperationsExplainRequest, OperationsExplainResponse
from api.services.explainability import explain_operations
from db.database import get_db

router = APIRouter(prefix="/explainability", tags=["Explainability"])


@router.post("/operations", response_model=OperationsExplainResponse)
def explain_from_operations(
    req: OperationsExplainRequest,
    db: Session = Depends(get_db),
):
    """Generate a summary or answer using one or more stored operations."""
    try:
        payload = explain_operations(
            db=db,
            operation_ids=req.operation_ids,
            question=req.question,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Explainability service unavailable: {exc}") from exc

    return OperationsExplainResponse(**payload)
