from fastapi import Header, HTTPException
from firebase_admin import auth as firebase_auth

def verify_firebase_token(authorization: str | None = Header(default=None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid Authorization header")

    token = authorization.split(" ", 1)[1]

    try:
        decoded_token = firebase_auth.verify_id_token(token)
        return decoded_token
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def verify_firebase_token_optional(authorization: str | None = Header(default=None)):
    """Return decoded token when present and valid; otherwise return None.

    This is used for endpoints that support anonymous access but should still
    attach user context when available.
    """
    if not authorization:
        return None

    if not authorization.startswith("Bearer "):
        return None

    token = authorization.split(" ", 1)[1]

    try:
        return firebase_auth.verify_id_token(token)
    except Exception:
        return None