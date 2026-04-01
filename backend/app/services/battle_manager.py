from __future__ import annotations

from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.models.user import User
from app.services.ws_auth import authenticate_ws

_CLOSE_FULL = 4004
_CLOSE_DUPLICATE = 4005


class BattleManager:
    """
    Manages the lifecycle of two-player WebSocket battle matches.

    Responsibilities:
      - Authenticate connecting players via session cookie
      - Track active connections per match (max 2 players)
      - Notify players when a match is ready or an opponent disconnects
      - Clean up finished/abandoned matches
    """

    def __init__(self) -> None:
        # match_id -> [{"ws": WebSocket, "user": User}, ...]
        self._matches: dict[str, list[dict]] = {}

    # ------------------------------------------------------------------ #
    #  Authentication                                                       #
    # ------------------------------------------------------------------ #

    async def authenticate(self, websocket: WebSocket, db: Session) -> User | None:
        return await authenticate_ws(websocket, db)

    # ------------------------------------------------------------------ #
    #  Connection management                                                #
    # ------------------------------------------------------------------ #

    async def connect(self, websocket: WebSocket, match_id: str, user: User) -> bool:
        """
        Register a player in the given match.

        Returns True when the player was successfully added.
        Returns False (and closes the socket) when the match is full or the
        user is already connected.
        """
        players = self._matches.setdefault(match_id, [])

        if len(players) >= 2:
            await websocket.close(code=_CLOSE_FULL, reason="Match is full")
            return False

        if any(p["user"].id == user.id for p in players):
            await websocket.close(code=_CLOSE_DUPLICATE, reason="Already connected to this match")
            return False

        players.append({"ws": websocket, "user": user})

        if len(players) == 2:
            await self._notify_match_ready(match_id)
        else:
            await websocket.send_json({"type": "waiting_for_opponent"})

        return True

    async def disconnect(self, websocket: WebSocket, match_id: str, user: User) -> None:
        """
        Remove a player from the match and notify the remaining player.
        Cleans up the match entry when both players have left.
        """
        players = self._matches.get(match_id, [])
        players[:] = [p for p in players if p["ws"] is not websocket]

        if players:
            await players[0]["ws"].send_json({
                "type": "opponent_disconnected",
                "username": user.username,
            })
        else:
            self._matches.pop(match_id, None)

    # ------------------------------------------------------------------ #
    #  Internal helpers                                                     #
    # ------------------------------------------------------------------ #

    async def _notify_match_ready(self, match_id: str) -> None:
        p1, p2 = self._matches[match_id]
        for current, opponent in ((p1, p2), (p2, p1)):
            await current["ws"].send_json({
                "type": "match_ready",
                "your_username": current["user"].username,
                "opponent_username": opponent["user"].username,
            })
