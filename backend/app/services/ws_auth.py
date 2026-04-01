from __future__ import annotations

import os
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


async def authenticate_ws(websocket: WebSocket, db: Session) -> User | None:
    """
    Validate the session cookie from a WebSocket handshake.
    Returns the authenticated User, or closes the socket and returns None.
    """
    raw_session = websocket.cookies.get(SESSION_COOKIE_NAME)
    if not raw_session:
        await websocket.close(code=_CLOSE_UNAUTHORIZED, reason="Missing session")
        return None

    try:
        session_id = UUID(raw_session)
    except ValueError:
        await websocket.close(code=_CLOSE_UNAUTHORIZED, reason="Invalid session ID")
        return None

    session = crud_session.get_session(db, session_id)
    if not session:
        await websocket.close(code=_CLOSE_UNAUTHORIZED, reason="Session not found")
        return None

    expires_at: datetime = session.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        await websocket.close(code=_CLOSE_EXPIRED, reason="Session expired")
        return None

    user = crud_user.get_user(db, session.user_id)
    if not user:
        await websocket.close(code=_CLOSE_UNAUTHORIZED, reason="User not found")
        return None

    return user
