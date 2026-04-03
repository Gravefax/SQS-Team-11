from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest

from app.services.battle_manager import BattleManager, MatchState, _CLOSE_INTERNAL
from app.services.trivia_service import TriviaInsufficientQuestionsError
from app.services.trivia_types import Question


def _make_user(*, user_id=None, username="TestPlayer", email="test@example.com"):
    return SimpleNamespace(
        id=user_id or uuid4(),
        username=username,
        email=email,
    )


def _make_websocket():
    ws = AsyncMock()
    ws.client = SimpleNamespace(host="127.0.0.1", port=54321)
    ws.url.path = "/battle/ws/test-match"
    return ws


class FakeQuizService:
    def __init__(
        self,
        *,
        category_options=None,
        questions=None,
        answer_result=(True, "A"),
        category_error=None,
        question_error=None,
    ):
        self.category_options = category_options or []
        self.questions = questions or []
        self.answer_result = answer_result
        self.category_error = category_error
        self.question_error = question_error
        self.category_calls = []
        self.question_calls = []
        self.answer_calls = []

    def get_category_options(self, *, option_count, questions_per_category, exclude_ids=()):
        self.category_calls.append(
            {
                "option_count": option_count,
                "questions_per_category": questions_per_category,
                "exclude_ids": exclude_ids,
            }
        )
        if self.category_error:
            raise self.category_error
        return list(self.category_options)

    def get_questions(self, n=None, *, categories=None, difficulties=None, exclude_ids=()):
        self.question_calls.append(
            {
                "n": n,
                "categories": categories,
                "difficulties": difficulties,
                "exclude_ids": exclude_ids,
            }
        )
        if self.question_error:
            raise self.question_error
        return list(self.questions)

    def check_answer(self, question_id, answer):
        self.answer_calls.append({"question_id": question_id, "answer": answer})
        return self.answer_result


def _make_question(question_id: str, category: str = "Science") -> Question:
    return Question(
        id=question_id,
        text=f"{question_id}?",
        answers=["A", "B", "C", "D"],
        correct_answer="A",
        category=category,
        difficulty="easy",
    )


@pytest.mark.asyncio
async def test_connect_first_player_waits_for_opponent():
    manager = BattleManager(FakeQuizService())
    ws = _make_websocket()
    user = _make_user()

    result = await manager.connect(ws, "match-1", user)

    assert result is True
    ws.send_json.assert_called_once_with({"type": "waiting_for_opponent"})
    assert "match-1" in manager._matches


@pytest.mark.asyncio
async def test_handle_message_routes_pick_category_with_match_id():
    manager = BattleManager(FakeQuizService())
    user = _make_user()
    state = MatchState()
    manager._matches["match-1"] = state

    with patch.object(manager, "_handle_category_pick", new_callable=AsyncMock) as mock_handler:
        await manager.handle_message("match-1", user, '{"type": "pick_category", "category": "Science"}')

    mock_handler.assert_called_once_with(
        "match-1",
        state,
        user,
        {"type": "pick_category", "category": "Science"},
    )


@pytest.mark.asyncio
async def test_start_round_uses_category_options_and_resets_state():
    quiz_service = FakeQuizService(category_options=["Science", "History", "Sports"])
    manager = BattleManager(quiz_service)
    ws1 = _make_websocket()
    ws2 = _make_websocket()
    user1 = _make_user()
    user2 = _make_user()
    state = MatchState(
        players=[{"ws": ws1, "user": user1}, {"ws": ws2, "user": user2}],
        current_round=1,
        picker_idx=0,
        round_scores={"old": 1},
        question_idx=99,
        used_question_ids={"used-id"},
    )

    await manager._start_round(state, "match-1")

    assert state.phase == "picking"
    assert state.question_idx == 0
    assert state.round_scores == {str(user1.id): 0, str(user2.id): 0}
    assert quiz_service.category_calls[0]["exclude_ids"] == ("used-id",)
    assert state.offered_categories == ["Science", "History", "Sports"]
    assert ws1.send_json.await_args_list[0].args[0]["type"] == "pick_category"
    assert ws2.send_json.await_args_list[0].args[0]["type"] == "waiting_for_category"


@pytest.mark.asyncio
async def test_start_round_aborts_match_when_category_loading_fails():
    quiz_service = FakeQuizService(
        category_error=TriviaInsufficientQuestionsError("not enough categories")
    )
    manager = BattleManager(quiz_service)
    ws1 = _make_websocket()
    ws2 = _make_websocket()
    user1 = _make_user()
    user2 = _make_user()
    state = MatchState(players=[{"ws": ws1, "user": user1}, {"ws": ws2, "user": user2}], current_round=1)
    manager._matches["match-1"] = state

    await manager._start_round(state, "match-1")

    assert "match-1" not in manager._matches
    ws1.close.assert_called_once_with(code=_CLOSE_INTERNAL, reason="Unable to prepare questions")
    ws2.close.assert_called_once_with(code=_CLOSE_INTERNAL, reason="Unable to prepare questions")


@pytest.mark.asyncio
async def test_handle_category_pick_loads_questions_and_tracks_used_ids():
    questions = [_make_question("q1"), _make_question("q2"), _make_question("q3")]
    quiz_service = FakeQuizService(questions=questions)
    manager = BattleManager(quiz_service)
    ws1 = _make_websocket()
    ws2 = _make_websocket()
    user1 = _make_user()
    user2 = _make_user()
    state = MatchState(
        players=[{"ws": ws1, "user": user1}, {"ws": ws2, "user": user2}],
        current_round=1,
        phase="picking",
        picker_idx=0,
        offered_categories=["Science"],
        used_question_ids={"used-id"},
    )

    with patch.object(manager, "_send_current_question", new_callable=AsyncMock) as mock_send_question:
        await manager._handle_category_pick(
            "match-1",
            state,
            user1,
            {"category": "Science"},
        )

    assert state.phase == "questions"
    assert state.round_questions == questions
    assert quiz_service.question_calls[0]["categories"] == ["Science"]
    assert quiz_service.question_calls[0]["exclude_ids"] == ("used-id",)
    assert {"q1", "q2", "q3", "used-id"} == state.used_question_ids
    mock_send_question.assert_called_once_with(state)


@pytest.mark.asyncio
async def test_handle_category_pick_ignores_unoffered_category():
    quiz_service = FakeQuizService(questions=[_make_question("q1")])
    manager = BattleManager(quiz_service)
    ws1 = _make_websocket()
    ws2 = _make_websocket()
    user1 = _make_user()
    user2 = _make_user()
    state = MatchState(
        players=[{"ws": ws1, "user": user1}, {"ws": ws2, "user": user2}],
        phase="picking",
        picker_idx=0,
        offered_categories=["History"],
    )

    await manager._handle_category_pick("match-1", state, user1, {"category": "Science"})

    assert state.phase == "picking"
    assert quiz_service.question_calls == []


@pytest.mark.asyncio
async def test_handle_answer_increments_score_and_checks_answer():
    quiz_service = FakeQuizService(answer_result=(True, "A"))
    manager = BattleManager(quiz_service)
    ws1 = _make_websocket()
    ws2 = _make_websocket()
    user1 = _make_user()
    user2 = _make_user()
    question = _make_question("q1")
    state = MatchState(
        players=[{"ws": ws1, "user": user1}, {"ws": ws2, "user": user2}],
        phase="questions",
        round_questions=[question],
        round_scores={str(user1.id): 0, str(user2.id): 0},
    )

    await manager._handle_answer(
        "match-1",
        state,
        user1,
        {"question_id": "q1", "answer": "A"},
    )

    assert state.round_scores[str(user1.id)] == 1
    assert quiz_service.answer_calls == [{"question_id": "q1", "answer": "A"}]
    ws1.send_json.assert_called_once_with(
        {
            "type": "answer_result",
            "correct": True,
            "correct_answer": "A",
            "your_score_this_round": 1,
        }
    )


@pytest.mark.asyncio
async def test_handle_answer_ends_round_after_both_players_answer():
    quiz_service = FakeQuizService(answer_result=(False, "A"))
    manager = BattleManager(quiz_service)
    ws1 = _make_websocket()
    ws2 = _make_websocket()
    user1 = _make_user()
    user2 = _make_user()
    question = _make_question("q1")
    state = MatchState(
        players=[{"ws": ws1, "user": user1}, {"ws": ws2, "user": user2}],
        phase="questions",
        round_questions=[question],
        current_answers={str(user2.id): "B"},
        round_scores={str(user1.id): 0, str(user2.id): 0},
    )

    with patch.object(manager, "_end_round", new_callable=AsyncMock) as mock_end_round:
        await manager._handle_answer(
            "match-1",
            state,
            user1,
            {"question_id": "q1", "answer": "C"},
        )

    mock_end_round.assert_called_once_with("match-1", state)
