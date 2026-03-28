from typing import Annotated
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from app.services import battle_service

router = APIRouter(prefix="/battle", tags=["battle"])


# ── Request Bodies ────────────────────────────────────────────────────────────

class JoinQueueRequest(BaseModel):
    nickname: str
    mode: str = "unranked"


class LeaveQueueRequest(BaseModel):
    player_id: str


class SelectCategoryRequest(BaseModel):
    player_id: str
    category: str


class SubmitRoundRequest(BaseModel):
    player_id: str
    answers: dict[str, str]  # {question_id: selected_answer}


class AdvanceRoundRequest(BaseModel):
    player_id: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/queue/join")
def join_queue(body: JoinQueueRequest):
    if body.mode not in ("unranked", "ranked"):
        raise HTTPException(status_code=400, detail="mode must be 'unranked' or 'ranked'")
    if not body.nickname.strip():
        raise HTTPException(status_code=400, detail="nickname cannot be empty")
    return battle_service.join_queue(nickname=body.nickname.strip(), mode=body.mode)


@router.delete("/queue/leave")
def leave_queue(body: LeaveQueueRequest):
    battle_service.leave_queue(player_id=body.player_id)
    return {"status": "left"}


@router.get("/queue/status")
def queue_status(player_id: Annotated[str, Query(...)]):
    return battle_service.check_queue_status(player_id)


@router.get(
    "/{match_id}",
    responses={404: {"description": "Match not found or access denied"}},
)
def get_match(match_id: str, player_id: Annotated[str, Query(...)]):
    state = battle_service.get_match_state(match_id, player_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Match not found or access denied")
    return state


@router.post(
    "/{match_id}/category",
    responses={400: {"description": "Not your turn or invalid category"}, 503: {"description": "Failed to load questions"}},
)
def select_category(match_id: str, body: SelectCategoryRequest):
    if match_id not in battle_service._matches:
        raise HTTPException(status_code=404, detail="Match not found")
    try:
        return battle_service.select_category(match_id, body.player_id, body.category)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Failed to load questions: {e}")


@router.post(
    "/{match_id}/submit-round",
    responses={400: {"description": "Invalid submission"}},
)
def submit_round(match_id: str, body: SubmitRoundRequest):
    if match_id not in battle_service._matches:
        raise HTTPException(status_code=404, detail="Match not found")
    try:
        return battle_service.submit_round(match_id, body.player_id, body.answers)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/{match_id}/next-round",
    responses={400: {"description": "Not in round_complete state"}},
)
def next_round(match_id: str, body: AdvanceRoundRequest):
    if match_id not in battle_service._matches:
        raise HTTPException(status_code=404, detail="Match not found")
    try:
        return battle_service.advance_to_next_round(match_id, body.player_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
