from __future__ import annotations

import os
import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import WebSocket
from sqlalchemy.orm import Session

from app.crud import session as crud_session
from app.crud import user as crud_user
from app.models.user import User

SESSION_COOKIE_NAME = os.getenv("SESSION_COOKIE_NAME", "session_id")

_CLOSE_UNAUTHORIZED = 4001
_CLOSE_EXPIRED = 4003

logger = logging.getLogger("uvicorn.error")


def _client_label(websocket: WebSocket) -> str:
    client = websocket.client
    if client is None:
        return "unknown"
    return f"{client.host}:{client.port}"


async def authenticate_ws(websocket: WebSocket, db: Session) -> User | None:
    """
    Validate the session cookie from a WebSocket handshake.
    Returns the authenticated User, or closes the socket and returns None.
    """
    client = _client_label(websocket)
    logger.info("WS auth started path=%s client=%s", websocket.url.path, client)

    raw_session = websocket.cookies.get(SESSION_COOKIE_NAME)
    if not raw_session:
        logger.warning("WS auth failed: missing session cookie path=%s client=%s", websocket.url.path, client)
        await websocket.close(code=_CLOSE_UNAUTHORIZED, reason="Missing session")
        return None

    try:
        session_id = UUID(raw_session)
    except ValueError:
        logger.warning("WS auth failed: invalid session id path=%s client=%s", websocket.url.path, client)
        await websocket.close(code=_CLOSE_UNAUTHORIZED, reason="Invalid session ID")
        return None

    session = crud_session.get_session(db, session_id)
    if not session:
        logger.warning("WS auth failed: session not found session_id=%s path=%s client=%s", session_id, websocket.url.path, client)
        await websocket.close(code=_CLOSE_UNAUTHORIZED, reason="Session not found")
        return None

    expires_at: datetime = session.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        logger.warning("WS auth failed: session expired session_id=%s path=%s client=%s", session_id, websocket.url.path, client)
        await websocket.close(code=_CLOSE_EXPIRED, reason="Session expired")
        return None

    user = crud_user.get_user(db, session.user_id)
    if not user:
        logger.warning("WS auth failed: user not found user_id=%s path=%s client=%s", session.user_id, websocket.url.path, client)
        await websocket.close(code=_CLOSE_UNAUTHORIZED, reason="User not found")
        return None

    logger.info(
        "WS auth success path=%s client=%s user_id=%s username=%s",
        websocket.url.path,
        client,
        user.id,
        user.username,
    )

    return user
