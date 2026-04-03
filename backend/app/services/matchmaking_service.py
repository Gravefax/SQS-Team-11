from __future__ import annotations

import asyncio
import uuid

from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.models.user import User
from app.services.ws_auth import authenticate_ws


class MatchmakingService:
    """
    Manages the matchmaking queue for two-player battles.

    Flow:
      1. Player connects to the queue WebSocket and is authenticated.
      2. Player is added to the waiting queue; receives {"type": "queued"}.
      3. When a second player connects, both are matched:
         both receive {"type": "matched", "match_id": "<uuid>"}.
      4. Clients open /battle/ws/{match_id} to start the actual game.
      5. If a player disconnects before being matched they are removed cleanly.
    """

    def __init__(self) -> None:
        self._queue: list[dict] = []   # {"ws": WebSocket, "user": User}
        self._lock = asyncio.Lock()

    # ------------------------------------------------------------------ #
    #  Public API (called from the router)                                 #
    # ------------------------------------------------------------------ #

    async def authenticate(self, websocket: WebSocket, db: Session) -> User | None:
        return await authenticate_ws(websocket, db)

    async def join(self, websocket: WebSocket, user: User) -> None:
        """
        Add the player to the queue.
        Blocks until the player is matched or disconnects.
        """
        matched_pair: tuple[dict, dict] | None = None

        async with self._lock:
            entry = {"ws": websocket, "user": user}
            self._queue.append(entry)

            if len(self._queue) >= 2:
                p1 = self._queue.pop(0)
                p2 = self._queue.pop(0)
                matched_pair = (p1, p2)

        if matched_pair:
            await self._notify_matched(*matched_pair)
            return

        # Not yet matched — tell the player they're queued and wait
        await websocket.send_json({"type": "queued"})
        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            await self._remove(websocket)

    # ------------------------------------------------------------------ #
    #  Internal helpers                                                     #
    # ------------------------------------------------------------------ #

    async def _notify_matched(self, p1: dict, p2: dict) -> None:
        match_id = str(uuid.uuid4())
        for p in (p1, p2):
            await p["ws"].send_json({"type": "matched", "match_id": match_id})

    async def _remove(self, websocket: WebSocket) -> None:
        async with self._lock:
            self._queue[:] = [p for p in self._queue if p["ws"] is not websocket]
