from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.battle_manager import BattleManager
from app.services.matchmaking_service import MatchmakingService

router = APIRouter(prefix="/battle", tags=["battle"])

manager = BattleManager()
matchmaking = MatchmakingService()


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
    user = await manager.authenticate(websocket, db)
    if user is None:
        return

    await websocket.accept()

    if not await manager.connect(websocket, match_id, user):
        return

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket, match_id, user)
