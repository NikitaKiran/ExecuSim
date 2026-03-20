"""Operation-history grounded explainability utilities."""

import json
import os
from typing import Optional

import google.generativeai as genai
from sqlalchemy.orm import Session

from db.repository import (
    deserialize_payload,
    get_operation_records_by_ids,
    save_operation_explanation,
)


def _require_gemini_api_key() -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set. Add it to backend/.env.")
    return api_key


def _short_json(payload: dict) -> str:
    text = json.dumps(payload, default=str, indent=2)
    if len(text) > 4000:
        return text[:4000] + "\n... (truncated)"
    return text


def _build_operations_context(records) -> str:
    blocks = []
    for idx, record in enumerate(records, start=1):
        req = deserialize_payload(record.request_payload)
        resp = deserialize_payload(record.response_payload)
        created = record.created_at.isoformat() if record.created_at else "unknown"

        blocks.append(
            "\n".join(
                [
                    f"Operation {idx}",
                    f"- id: {record.id}",
                    f"- type: {record.operation_type}",
                    f"- status: {record.status}",
                    f"- created_at: {created}",
                    "- request_payload:",
                    _short_json(req),
                    "- response_payload:",
                    _short_json(resp),
                ]
            )
        )

    return "\n\n".join(blocks)


def explain_operations(
    db: Session,
    operation_ids: list[str],
    firebase_uid: str,
    question: Optional[str] = None,
    model_name: str = "gemini-2.5-flash",
) -> dict:
    if not operation_ids:
        raise ValueError("At least one operation_id is required.")

    records = get_operation_records_by_ids(db, operation_ids, firebase_uid)
    if not records:
        raise ValueError("No operations found for the provided IDs.")

    found_ids = {str(record.id) for record in records}
    missing_ids = [op_id for op_id in operation_ids if op_id not in found_ids]
    if missing_ids:
        raise ValueError(f"These operation IDs were not found: {', '.join(missing_ids)}")

    api_key = _require_gemini_api_key()
    genai.configure(api_key=api_key)

    context_text = _build_operations_context(records)
    mode = "question" if question and question.strip() else "summary"

    if mode == "summary":
        prompt = (
            "You are an execution analytics assistant. "
            "Generate a concise but specific summary grounded ONLY in the operations below.\n"
            "Structure the summary as:\n"
            "1) What was run\n"
            "2) Key outcomes and metrics and analysis\n"
            "3) Suggested next action\n\n"
            "Operations context:\n"
            f"{context_text}"
        )
    else:
        prompt = (
            "You are an execution analytics assistant. "
            "Answer the user's question in detail using the operations context below. "
            "Do not invent any details.\n\n"
            f"User question: {question.strip()}\n\n"
            "Operations context:\n"
            f"{context_text}"
        )

    model = genai.GenerativeModel(model_name=model_name)
    response = model.generate_content(prompt)
    text = getattr(response, "text", None)
    answer = text.strip() if text else "Unable to generate explanation from the provided operation context."

    explanation = save_operation_explanation(
        db=db,
        operation_ids=operation_ids,
        firebase_uid=firebase_uid,
        mode=mode,
        question=question.strip() if question else None,
        answer=answer,
    )

    return {
        "explanation_id": str(explanation.id),
        "mode": mode,
        "question": question.strip() if question else None,
        "answer": answer,
        "operation_ids": operation_ids,
        "model": model_name,
    }