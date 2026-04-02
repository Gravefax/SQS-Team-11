import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.battle_manager import BattleManager
from app.services.matchmaking_service import MatchmakingService

router = APIRouter(prefix="/battle", tags=["battle"])

manager = BattleManager()
matchmaking = MatchmakingService()
logger = logging.getLogger("uvicorn.error")


@router.websocket("/queue")
async def queue_ws(
    websocket: WebSocket,
    db: Session = Depends(get_db),
):
    user = await matchmaking.authenticate(websocket, db)
    if user is None:
        return

    await websocket.accept()
    await matchmaking.join(websocket, user)


@router.websocket("/ws/{match_id}")
async def battle_ws(
    websocket: WebSocket,
    match_id: str,
    db: Session = Depends(get_db),
):
    client = websocket.client
    client_label = f"{client.host}:{client.port}" if client else "unknown"
    logger.info("Battle WS handshake started match_id=%s client=%s", match_id, client_label)

    user = await manager.authenticate(websocket, db)
    if user is None:
        logger.warning("Battle WS authentication failed match_id=%s client=%s", match_id, client_label)
        return

    await websocket.accept()
    logger.info(
        "Battle WS accepted match_id=%s user_id=%s username=%s client=%s",
        match_id,
        user.id,
        user.username,
        client_label,
    )

    if not await manager.connect(websocket, match_id, user):
        logger.warning(
            "Battle WS connect rejected match_id=%s user_id=%s username=%s",
            match_id,
            user.id,
            user.username,
        )
        return

    try:
        while True:
            raw = await websocket.receive_text()
            await manager.handle_message(match_id, user, raw)
    except WebSocketDisconnect as exc:
        logger.info(
            "Battle WS disconnected match_id=%s user_id=%s username=%s code=%s",
            match_id,
            user.id,
            user.username,
            exc.code,
        )
    except Exception:
        logger.exception(
            "Battle WS unhandled error match_id=%s user_id=%s username=%s",
            match_id,
            user.id,
            user.username,
        )
    finally:
        await manager.disconnect(websocket, match_id, user)
