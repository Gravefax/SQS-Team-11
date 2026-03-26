import os
from typing import Any
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

router = APIRouter(prefix="/auth", tags=["auth"])
bearer_scheme = HTTPBearer(auto_error=False)

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../../.env"))


def _parse_bearer_token(
    credentials: HTTPAuthorizationCredentials | None,
) -> str:
    if credentials is None or credentials.scheme.lower() != "bearer" or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Invalid token")
    return credentials.credentials


def _verify_google_id_token(token: str) -> dict[str, Any]:
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id:
        raise HTTPException(status_code=500, detail="GOOGLE_CLIENT_ID is not configured")

    try:
        payload = id_token.verify_oauth2_token(token, google_requests.Request(), client_id)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc

    if payload.get("iss") not in {"accounts.google.com", "https://accounts.google.com"}:
        raise HTTPException(status_code=401, detail="Invalid token")

    return payload

@router.post(
    "/validate",
    status_code=200,
    responses={401: {"description": "Invalid token"}},
)
def validate_token(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)):
    token = _parse_bearer_token(credentials)
    payload = _verify_google_id_token(token)

    return {
        "valid": True,
        "sub": payload.get("sub"),
        "email": payload.get("email"),
        "email_verified": payload.get("email_verified", False),
    }
