from __future__ import annotations

import asyncio
import json
import logging
import random
from dataclasses import dataclass, field

from fastapi import WebSocket
from sqlalchemy.orm import Session

from app.models.user import User
from app.services.ws_auth import authenticate_ws
from app.services.quiz_service import QuizService, InternalQuizProvider, Question

_CLOSE_FULL      = 4004
_CLOSE_DUPLICATE = 4005

QUESTIONS_PER_ROUND  = 3
ROUNDS_TO_WIN        = 3   # best-of-5 → first to 3 wins
CATEGORIES_TO_OFFER  = 3

_quiz = QuizService(InternalQuizProvider())
logger = logging.getLogger("uvicorn.error")


@dataclass
class MatchState:
    players:         list[dict]     = field(default_factory=list)   # {"ws", "user"}
    round_wins:      dict[str, int] = field(default_factory=dict)   # user_id → wins
    current_round:   int            = 0
    picker_idx:      int            = 0   # index into players who picks this round
    phase:           str            = "waiting"  # waiting|picking|questions|finished
    round_questions: list[Question] = field(default_factory=list)
    question_idx:    int            = 0
    round_scores:    dict[str, int] = field(default_factory=dict)   # user_id → correct
    current_answers: dict[str, str] = field(default_factory=dict)   # user_id → answer
    lock:            asyncio.Lock   = field(default_factory=asyncio.Lock)


class BattleManager:
    """
    Manages the full lifecycle of a ranked battle match.

    Game flow per round:
      1. Randomly chosen picker receives CATEGORIES_TO_OFFER category choices.
      2. Picker selects one; both players are notified.
      3. QUESTIONS_PER_ROUND questions are sent one by one.
         Both players answer independently; each gets immediate feedback.
      4. After all questions the round is scored.
         The player with *fewer* correct answers picks next round (tie → same picker).
      5. First to ROUNDS_TO_WIN rounds wins the match.
    """

    def __init__(self) -> None:
        self._matches: dict[str, MatchState] = {}

    # ── Authentication ───────────────────────────────────────────────────── #

    async def authenticate(self, websocket: WebSocket, db: Session) -> User | None:
        return await authenticate_ws(websocket, db)

    # ── Connection management ────────────────────────────────────────────── #

    async def connect(self, websocket: WebSocket, match_id: str, user: User) -> bool:
        state = self._matches.setdefault(match_id, MatchState())

        logger.info(
            "Battle connect requested match_id=%s user_id=%s username=%s current_players=%s",
            match_id,
            user.id,
            user.username,
            len(state.players),
        )

        async with state.lock:
            if len(state.players) >= 2:
                logger.warning(
                    "Battle connect rejected: match full match_id=%s user_id=%s username=%s",
                    match_id,
                    user.id,
                    user.username,
                )
                await websocket.close(code=_CLOSE_FULL, reason="Match is full")
                return False

            if any(p["user"].id == user.id for p in state.players):
                logger.warning(
                    "Battle connect rejected: duplicate connection match_id=%s user_id=%s username=%s",
                    match_id,
                    user.id,
                    user.username,
                )
                await websocket.close(code=_CLOSE_DUPLICATE, reason="Already connected")
                return False

            state.players.append({"ws": websocket, "user": user})
            state.round_wins[str(user.id)] = 0

            if len(state.players) < 2:
                logger.info(
                    "Battle waiting for opponent match_id=%s waiting_user_id=%s waiting_username=%s",
                    match_id,
                    user.id,
                    user.username,
                )
                await websocket.send_json({"type": "waiting_for_opponent"})
                return True

        logger.info("Battle match ready: two players connected match_id=%s", match_id)
        await self._start_game(state)
        return True

    async def disconnect(self, websocket: WebSocket, match_id: str, user: User) -> None:
        state = self._matches.get(match_id)
        if not state:
            logger.info(
                "Battle disconnect ignored: match not found match_id=%s user_id=%s username=%s",
                match_id,
                user.id,
                user.username,
            )
            return

        async with state.lock:
            state.players[:] = [p for p in state.players if p["ws"] is not websocket]
            remaining = list(state.players)

        for p in remaining:
            await p["ws"].send_json({
                "type":     "opponent_disconnected",
                "username": user.username,
            })

        logger.info(
            "Battle disconnected match_id=%s user_id=%s username=%s remaining_players=%s",
            match_id,
            user.id,
            user.username,
            len(remaining),
        )

        if not remaining:
            self._matches.pop(match_id, None)
            logger.info("Battle match cleaned up match_id=%s", match_id)

    # ── Incoming client messages ─────────────────────────────────────────── #

    async def handle_message(self, match_id: str, user: User, raw: str) -> None:
        state = self._matches.get(match_id)
        if not state:
            logger.warning(
                "Battle message ignored: match not found match_id=%s user_id=%s username=%s",
                match_id,
                user.id,
                user.username,
            )
            return

        try:
            data: dict = json.loads(raw)
        except ValueError:
            logger.warning(
                "Battle message parse failed match_id=%s user_id=%s username=%s payload=%r",
                match_id,
                user.id,
                user.username,
                raw,
            )
            return

        msg_type = data.get("type")
        logger.debug(
            "Battle message received match_id=%s user_id=%s username=%s type=%s",
            match_id,
            user.id,
            user.username,
            msg_type,
        )

        if msg_type == "pick_category":
            await self._handle_category_pick(state, user, data)
        elif msg_type == "answer":
            await self._handle_answer(match_id, state, user, data)

    # ── Game flow ────────────────────────────────────────────────────────── #

    async def _start_game(self, state: MatchState) -> None:
        state.picker_idx    = random.randint(0, 1)
        state.current_round = 1

        logger.info(
            "Battle game start players=%s first_picker=%s round=%s",
            [p["user"].username for p in state.players],
            state.players[state.picker_idx]["user"].username,
            state.current_round,
        )

        p1, p2 = state.players
        for current, opponent in ((p1, p2), (p2, p1)):
            await current["ws"].send_json({
                "type":              "match_ready",
                "your_username":     current["user"].username,
                "opponent_username": opponent["user"].username,
                "you_pick_first":    current is state.players[state.picker_idx],
                "rounds_to_win":     ROUNDS_TO_WIN,
            })

        await self._start_round(state)

    async def _start_round(self, state: MatchState) -> None:
        state.phase           = "picking"
        state.round_scores    = {str(p["user"].id): 0 for p in state.players}
        state.question_idx    = 0
        state.round_questions = []
        state.current_answers = {}

        all_questions        = _quiz.get_questions()
        available_categories = list({q.category for q in all_questions})
        offered              = random.sample(
            available_categories, min(CATEGORIES_TO_OFFER, len(available_categories))
        )

        logger.info(
            "Battle round start round=%s picker=%s categories=%s",
            state.current_round,
            state.players[state.picker_idx]["user"].username,
            offered,
        )

        picker     = state.players[state.picker_idx]
        non_picker = state.players[1 - state.picker_idx]
        pid        = str(picker["user"].id)
        nid        = str(non_picker["user"].id)

        await picker["ws"].send_json({
            "type":          "pick_category",
            "categories":    offered,
            "round":         state.current_round,
            "your_wins":     state.round_wins.get(pid, 0),
            "opponent_wins": state.round_wins.get(nid, 0),
        })

        await non_picker["ws"].send_json({
            "type":            "waiting_for_category",
            "picker_username": picker["user"].username,
            "round":           state.current_round,
            "your_wins":       state.round_wins.get(nid, 0),
            "opponent_wins":   state.round_wins.get(pid, 0),
        })

    async def _handle_category_pick(self, state: MatchState, user: User, data: dict) -> None:
        async with state.lock:
            if state.phase != "picking":
                logger.warning(
                    "Battle pick_category ignored: wrong phase phase=%s user_id=%s username=%s",
                    state.phase,
                    user.id,
                    user.username,
                )
                return
            if state.players[state.picker_idx]["user"].id != user.id:
                logger.warning(
                    "Battle pick_category ignored: not picker picker=%s user_id=%s username=%s",
                    state.players[state.picker_idx]["user"].username,
                    user.id,
                    user.username,
                )
                return
            state.phase = "questions"

        category = data.get("category", "")
        logger.info(
            "Battle category picked round=%s picker=%s category=%s",
            state.current_round,
            user.username,
            category,
        )
        all_q    = _quiz.get_questions()
        cat_q    = [q for q in all_q if q.category == category]

        if len(cat_q) < QUESTIONS_PER_ROUND:
            others = [q for q in all_q if q not in cat_q]
            random.shuffle(others)
            cat_q = cat_q + others[: QUESTIONS_PER_ROUND - len(cat_q)]
        else:
            cat_q = random.sample(cat_q, QUESTIONS_PER_ROUND)

        state.round_questions = cat_q

        for p in state.players:
            await p["ws"].send_json({
                "type":     "category_chosen",
                "category": category,
                "round":    state.current_round,
            })

        await self._send_current_question(state)

    async def _send_current_question(self, state: MatchState) -> None:
        q                    = state.round_questions[state.question_idx]
        state.current_answers = {}

        logger.debug(
            "Battle question sent round=%s index=%s question_id=%s category=%s",
            state.current_round,
            state.question_idx + 1,
            q.id,
            q.category,
        )

        for p in state.players:
            await p["ws"].send_json({
                "type":            "question",
                "question_number": state.question_idx + 1,
                "total_questions": QUESTIONS_PER_ROUND,
                "question_id":     q.id,
                "text":            q.text,
                "answers":         q.answers,
                "category":        q.category,
            })

    async def _handle_answer(
        self, match_id: str, state: MatchState, user: User, data: dict
    ) -> None:
        uid    = str(user.id)
        q_id   = data.get("question_id", "")
        answer = data.get("answer", "")

        correct         = False
        correct_answer  = ""
        advance         = False
        done_with_round = False

        async with state.lock:
            if state.phase != "questions":
                logger.warning(
                    "Battle answer ignored: wrong phase match_id=%s phase=%s user=%s",
                    match_id,
                    state.phase,
                    user.username,
                )
                return
            if uid in state.current_answers:
                logger.warning(
                    "Battle answer ignored: duplicate answer match_id=%s user=%s question_index=%s",
                    match_id,
                    user.username,
                    state.question_idx + 1,
                )
                return
            if not state.round_questions or state.round_questions[state.question_idx].id != q_id:
                logger.warning(
                    "Battle answer ignored: question mismatch match_id=%s user=%s received=%s expected=%s",
                    match_id,
                    user.username,
                    q_id,
                    state.round_questions[state.question_idx].id if state.round_questions else "none",
                )
                return

            state.current_answers[uid] = answer

            result = _quiz.check_answer(q_id, answer)
            if result:
                correct, correct_answer = result
                if correct:
                    state.round_scores[uid] = state.round_scores.get(uid, 0) + 1

            if len(state.current_answers) == len(state.players):
                advance         = True
                state.question_idx += 1
                done_with_round = state.question_idx >= len(state.round_questions)

        logger.debug(
            "Battle answer processed match_id=%s user=%s correct=%s score_this_round=%s",
            match_id,
            user.username,
            correct,
            state.round_scores.get(uid, 0),
        )

        ws = next(p["ws"] for p in state.players if str(p["user"].id) == uid)
        await ws.send_json({
            "type":                  "answer_result",
            "correct":               correct,
            "correct_answer":        correct_answer,
            "your_score_this_round": state.round_scores.get(uid, 0),
        })

        if advance:
            if done_with_round:
                await self._end_round(match_id, state)
            else:
                await self._send_current_question(state)

    async def _end_round(self, match_id: str, state: MatchState) -> None:
        p1, p2 = state.players
        id1    = str(p1["user"].id)
        id2    = str(p2["user"].id)
        s1     = state.round_scores.get(id1, 0)
        s2     = state.round_scores.get(id2, 0)

        if s1 > s2:
            round_winner_idx = 0
        elif s2 > s1:
            round_winner_idx = 1
        else:
            round_winner_idx = None  # tie – same picker continues

        if round_winner_idx is not None:
            winner_id = str(state.players[round_winner_idx]["user"].id)
            state.round_wins[winner_id] = state.round_wins.get(winner_id, 0) + 1
            state.picker_idx = 1 - round_winner_idx  # loser picks next

        w1               = state.round_wins.get(id1, 0)
        w2               = state.round_wins.get(id2, 0)
        game_over        = w1 >= ROUNDS_TO_WIN or w2 >= ROUNDS_TO_WIN
        next_picker_name = state.players[state.picker_idx]["user"].username

        logger.info(
            "Battle round result match_id=%s round=%s score=%s-%s wins=%s-%s next_picker=%s game_over=%s",
            match_id,
            state.current_round,
            s1,
            s2,
            w1,
            w2,
            next_picker_name,
            game_over,
        )

        for current, opponent in ((p1, p2), (p2, p1)):
            cid = str(current["user"].id)
            oid = str(opponent["user"].id)

            if round_winner_idx is None:
                outcome = "tie"
            elif str(state.players[round_winner_idx]["user"].id) == cid:
                outcome = "win"
            else:
                outcome = "loss"

            await current["ws"].send_json({
                "type":                "round_result",
                "round":               state.current_round,
                "outcome":             outcome,
                "your_score":          state.round_scores.get(cid, 0),
                "opponent_score":      state.round_scores.get(oid, 0),
                "your_total_wins":     state.round_wins.get(cid, 0),
                "opponent_total_wins": state.round_wins.get(oid, 0),
                "next_picker":         next_picker_name,
                "game_over":           game_over,
            })

        if game_over:
            await self._end_game(match_id, state)
        else:
            state.current_round += 1
            await self._start_round(state)

    async def _end_game(self, match_id: str, state: MatchState) -> None:
        state.phase = "finished"
        p1, p2      = state.players
        id1         = str(p1["user"].id)
        id2         = str(p2["user"].id)
        w1          = state.round_wins.get(id1, 0)
        w2          = state.round_wins.get(id2, 0)
        winner      = p1["user"].username if w1 >= w2 else p2["user"].username

        logger.info(
            "Battle game over match_id=%s winner=%s final_wins=%s-%s",
            match_id,
            winner,
            w1,
            w2,
        )

        for current, opponent in ((p1, p2), (p2, p1)):
            cid = str(current["user"].id)
            oid = str(opponent["user"].id)
            await current["ws"].send_json({
                "type":          "game_over",
                "winner":        winner,
                "you_won":       state.round_wins.get(cid, 0) > state.round_wins.get(oid, 0),
                "your_wins":     state.round_wins.get(cid, 0),
                "opponent_wins": state.round_wins.get(oid, 0),
            })

        self._matches.pop(match_id, None)
