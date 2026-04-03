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
    #Join the matchmaking queue
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
    #Connect player to battle, process messages, cleanup on disconnect.
    logger.info("Battle WS handshake started")

    user = await manager.authenticate(websocket, db)
    if user is None:
        logger.warning("Battle WS authentication failed")
        return

    await websocket.accept()
    logger.info("Battle WS accepted")

    if not await manager.connect(websocket, match_id, user):
        logger.warning("Battle WS connect rejected")
        return

    try:
        # Message loop: receive incoming messages and dispatch to handlers
        while True:
            raw = await websocket.receive_text()
            await manager.handle_message(match_id, user, raw)
    except WebSocketDisconnect as exc:
        # Normal client disconnect (including reconnect timeout)
        logger.info("Battle WS disconnected code=%s", exc.code)
    except Exception:
        # Unhandled exception during message processing
        logger.exception("Battle WS unhandled error")
    finally:
        # Always cleanup: remove player, notify opponent, delete match if empty
        await manager.disconnect(websocket, match_id, user)
