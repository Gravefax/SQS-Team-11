import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from types import SimpleNamespace
from uuid import uuid4
from datetime import datetime, timezone

# Patch DB engine creation before importing main
with patch("sqlalchemy.create_engine"):
    with patch("app.database.Base.metadata.create_all"):
        from main import app

from app.services.battle_manager import BattleManager, MatchState
from app.services.quiz_service import Question
from app.models.user import User


def _make_user(*, user_id=None, username="TestPlayer", email="test@example.com"):
    """Create a mock user object."""
    user = MagicMock(spec=User)
    user.id = user_id or uuid4()
    user.username = username
    user.email = email
    return user


def _make_websocket():
    """Create a mock WebSocket."""
    ws = AsyncMock()
    ws.client = SimpleNamespace(host="127.0.0.1", port=54321)
    ws.url.path = "/battle/ws/test-match"
    return ws


@pytest.mark.asyncio
async def test_authenticate_success():
    """BattleManager.authenticate returns user on success."""
    manager = BattleManager()
    ws = _make_websocket()
    db = MagicMock()
    user = _make_user()
    
    with patch("app.services.battle_manager.authenticate_ws", new_callable=AsyncMock) as mock_auth:
        mock_auth.return_value = user
        
        result = await manager.authenticate(ws, db)
        
        assert result == user
        mock_auth.assert_called_once_with(ws, db)


@pytest.mark.asyncio
async def test_authenticate_failure():
    """BattleManager.authenticate returns None on failure."""
    manager = BattleManager()
    ws = _make_websocket()
    db = MagicMock()
    
    with patch("app.services.battle_manager.authenticate_ws", new_callable=AsyncMock) as mock_auth:
        mock_auth.return_value = None
        
        result = await manager.authenticate(ws, db)
        
        assert result is None


@pytest.mark.asyncio
async def test_connect_first_player():
    """First player connection creates new match and waits for opponent."""
    manager = BattleManager()
    ws = _make_websocket()
    user = _make_user()
    match_id = str(uuid4())
    
    result = await manager.connect(ws, match_id, user)
    
    assert result is True
    assert match_id in manager._matches
    assert len(manager._matches[match_id].players) == 1
    assert manager._matches[match_id].phase == "waiting"
    ws.send_json.assert_called_once()
    sent_data = ws.send_json.call_args[0][0]
    assert sent_data["type"] == "waiting_for_opponent"


@pytest.mark.asyncio
async def test_connect_second_player():
    """Second player connection triggers game start."""
    manager = BattleManager()
    ws1 = _make_websocket()
    ws2 = _make_websocket()
    user1 = _make_user(username="Player1")
    user2 = _make_user(username="Player2")
    match_id = str(uuid4())
    
    # First player connects
    await manager.connect(ws1, match_id, user1)
    ws1.send_json.reset_mock()
    
    # Second player connects
    with patch.object(manager, "_start_game", new_callable=AsyncMock) as mock_start:
        result = await manager.connect(ws2, match_id, user2)
        
        assert result is True
        assert len(manager._matches[match_id].players) == 2
        mock_start.assert_called_once()


@pytest.mark.asyncio
async def test_connect_reject_when_full():
    """Connection rejected when match is full."""
    manager = BattleManager()
    ws1 = _make_websocket()
    ws2 = _make_websocket()
    ws3 = _make_websocket()
    user1 = _make_user(username="Player1")
    user2 = _make_user(username="Player2")
    user3 = _make_user(username="Player3")
    match_id = str(uuid4())
    
    # Two players connect and start game
    await manager.connect(ws1, match_id, user1)
    with patch.object(manager, "_start_game", new_callable=AsyncMock):
        await manager.connect(ws2, match_id, user2)
    
    ws3.reset_mock()
    
    # Third player tries to connect
    result = await manager.connect(ws3, match_id, user3)
    
    assert result is False
    ws3.close.assert_called_once_with(code=4004, reason="Match is full")


@pytest.mark.asyncio
async def test_connect_reject_on_duplicate():
    """Connection rejected for duplicate user."""
    manager = BattleManager()
    ws1 = _make_websocket()
    ws2 = _make_websocket()
    user = _make_user(username="Player1")
    match_id = str(uuid4())
    
    # Same user connects again
    await manager.connect(ws1, match_id, user)
    ws2.reset_mock()
    
    result = await manager.connect(ws2, match_id, user)
    
    assert result is False
    ws2.close.assert_called_once_with(code=4005, reason="Already connected")


@pytest.mark.asyncio
async def test_disconnect_removes_player():
    """Disconnect removes player and notifies opponent."""
    manager = BattleManager()
    ws1 = _make_websocket()
    ws2 = _make_websocket()
    user1 = _make_user(username="Player1")
    user2 = _make_user(username="Player2")
    match_id = str(uuid4())
    
    # Two players connect
    await manager.connect(ws1, match_id, user1)
    with patch.object(manager, "_start_game", new_callable=AsyncMock):
        await manager.connect(ws2, match_id, user2)
    
    ws1.reset_mock()
    ws2.reset_mock()
    
    # Player 1 disconnects
    await manager.disconnect(ws1, match_id, user1)
    
    # Player 2 should be notified
    ws2.send_json.assert_called_once()
    sent_data = ws2.send_json.call_args[0][0]
    assert sent_data["type"] == "opponent_disconnected"


@pytest.mark.asyncio
async def test_disconnect_cleans_up_empty_match():
    """Disconnect deletes match from memory when empty."""
    manager = BattleManager()
    ws1 = _make_websocket()
    user1 = _make_user()
    match_id = str(uuid4())
    
    # Player connects and disconnects
    await manager.connect(ws1, match_id, user1)
    await manager.disconnect(ws1, match_id, user1)
    
    # Match should be deleted
    assert match_id not in manager._matches


@pytest.mark.asyncio
async def test_disconnect_idempotent():
    """Disconnect is safe when match not found."""
    manager = BattleManager()
    ws = _make_websocket()
    user = _make_user()
    match_id = str(uuid4())
    
    # Should not raise error
    await manager.disconnect(ws, match_id, user)


@pytest.mark.asyncio
async def test_handle_message_routes_pick_category():
    """handle_message routes pick_category to correct handler."""
    manager = BattleManager()
    user = _make_user()
    match_id = str(uuid4())
    
    with patch.object(manager, "_handle_category_pick", new_callable=AsyncMock) as mock_handler:
        state = MatchState()
        manager._matches[match_id] = state
        
        await manager.handle_message(
            match_id,
            user,
            '{"type": "pick_category", "category": "Science"}',
        )
        
        mock_handler.assert_called_once()
        call_args = mock_handler.call_args[0]
        assert call_args[0] == state
        assert call_args[1] == user


@pytest.mark.asyncio
async def test_handle_message_routes_answer():
    """handle_message routes answer to correct handler."""
    manager = BattleManager()
    user = _make_user()
    match_id = str(uuid4())
    
    with patch.object(manager, "_handle_answer", new_callable=AsyncMock) as mock_handler:
        state = MatchState()
        manager._matches[match_id] = state
        
        await manager.handle_message(
            match_id,
            user,
            '{"type": "answer", "question_id": "q1", "answer": "B"}',
        )
        
        mock_handler.assert_called_once()


@pytest.mark.asyncio
async def test_handle_message_ignores_invalid_json():
    """handle_message ignores invalid JSON."""
    manager = BattleManager()
    user = _make_user()
    match_id = str(uuid4())
    
    with patch.object(manager, "_handle_category_pick", new_callable=AsyncMock) as mock_handler:
        state = MatchState()
        manager._matches[match_id] = state
        
        await manager.handle_message(match_id, user, "invalid json{{{")
        
        mock_handler.assert_not_called()


@pytest.mark.asyncio
async def test_handle_message_match_not_found():
    """handle_message silently ignores when match not found."""
    manager = BattleManager()
    user = _make_user()
    match_id = str(uuid4())
    
    # Should not raise error
    await manager.handle_message(
        match_id,
        user,
        '{"type": "pick_category", "category": "Science"}',
    )


@pytest.mark.asyncio
async def test_start_game_randomizes_picker():
    """_start_game randomly picks first player."""
    manager = BattleManager()
    ws1 = _make_websocket()
    ws2 = _make_websocket()
    user1 = _make_user(username="Player1")
    user2 = _make_user(username="Player2")

    
    state = MatchState()
    state.players = [{"ws": ws1, "user": user1}, {"ws": ws2, "user": user2}]
    
    with patch.object(manager, "_start_round", new_callable=AsyncMock):
        with patch("app.services.battle_manager.random.randint", return_value=0):
            await manager._start_game(state)
            
            assert state.current_round == 1
            assert state.picker_idx == 0
            
            # Both should receive match_ready
            assert ws1.send_json.called
            assert ws2.send_json.called


@pytest.mark.asyncio
async def test_start_round_resets_scores():
    """_start_round resets round scores and question index."""
    manager = BattleManager()
    ws1 = _make_websocket()
    ws2 = _make_websocket()
    user1 = _make_user()
    user2 = _make_user()
    
    state = MatchState()
    state.current_round = 1
    state.picker_idx = 0
    state.players = [{"ws": ws1, "user": user1}, {"ws": ws2, "user": user2}]
    state.round_scores = {"old": 123}
    state.question_idx = 99
    
    with patch("app.services.battle_manager.random.sample", return_value=["Science", "History", "Sports"]):
        with patch("app.services.battle_manager._quiz.get_questions", return_value=[]):
            await manager._start_round(state)
            
            assert state.phase == "picking"
            assert state.question_idx == 0
            assert state.round_scores[str(user1.id)] == 0
            assert state.round_scores[str(user2.id)] == 0
            assert len(state.round_scores) == 2


@pytest.mark.asyncio
async def test_handle_category_pick_wrong_phase():
    """Category pick rejected when not in picking phase."""
    manager = BattleManager()
    ws1 = _make_websocket()
    ws2 = _make_websocket()
    user1 = _make_user()
    user2 = _make_user()
    match_id = str(uuid4())
    
    state = MatchState()
    state.picks = [{"ws": ws1, "user": user1}, {"ws": ws2, "user": user2}]
    state.phase = "questions"  # Wrong phase
    state.picker_idx = 0
    manager._matches[match_id] = state
    
    await manager._handle_category_pick(state, user1, {"category": "Science"})
    
    # Should be ignored, no state change
    assert state.phase == "questions"


@pytest.mark.asyncio
async def test_handle_category_pick_not_picker():
    """Category pick rejected when user is not the picker."""
    manager = BattleManager()
    ws1 = _make_websocket()
    ws2 = _make_websocket()
    user1 = _make_user()
    user2 = _make_user()
    match_id = str(uuid4())
    
    state = MatchState()
    state.players = [{"ws": ws1, "user": user1}, {"ws": ws2, "user": user2}]
    state.phase = "picking"
    state.picker_idx = 0  # user1 is picker
    manager._matches[match_id] = state
    
    await manager._handle_category_pick(state, user2, {"category": "Science"})  # user2 tries to pick
    
    # Should be ignored
    assert state.phase == "picking"


@pytest.mark.asyncio
async def test_handle_category_pick_success():
    """Successful category pick loads questions and advances phase."""
    manager = BattleManager()
    ws1 = _make_websocket()
    ws2 = _make_websocket()
    user1 = _make_user()
    user2 = _make_user()
    match_id = str(uuid4())
    
    q1 = Question("q1", "Q1?", ["A", "B", "C", "D"], "A", "Science")
    q2 = Question("q2", "Q2?", ["A", "B", "C", "D"], "B", "Science")
    q3 = Question("q3", "Q3?", ["A", "B", "C", "D"], "C", "Science")
    
    state = MatchState()
    state.players = [{"ws": ws1, "user": user1}, {"ws": ws2, "user": user2}]
    state.phase = "picking"
    state.picker_idx = 0
    manager._matches[match_id] = state
    
    with patch("app.services.battle_manager._quiz.get_questions") as mock_get_q:
        mock_get_q.return_value = [q1, q2, q3]
        with patch.object(manager, "_send_current_question", new_callable=AsyncMock):
            await manager._handle_category_pick(state, user1, {"category": "Science"})
            
            assert state.phase == "questions"
            assert len(state.round_questions) == 3


@pytest.mark.asyncio
async def test_handle_answer_wrong_phase():
    """Answer rejected when not in questions phase."""
    manager = BattleManager()
    ws1 = _make_websocket()
    user1 = _make_user()
    match_id = str(uuid4())
    
    state = MatchState()
    state.players = [{"ws": ws1, "user": user1}]
    state.phase = "picking"  # Wrong phase
    manager._matches[match_id] = state
    
    await manager._handle_answer(match_id, state, user1, {
        "question_id": "q1",
        "answer": "A"
    })
    
    # Should not process
    assert len(state.current_answers) == 0


@pytest.mark.asyncio
async def test_handle_answer_duplicate():
    """Duplicate answer from same player rejected."""
    manager = BattleManager()
    ws1 = _make_websocket()
    ws2 = _make_websocket()
    user1 = _make_user()
    user2 = _make_user()
    match_id = str(uuid4())
    
    q1 = Question("q1", "Q1?", ["A", "B", "C", "D"], "A", "Science")
    
    state = MatchState()
    state.players = [{"ws": ws1, "user": user1}, {"ws": ws2, "user": user2}]
    state.phase = "questions"
    state.round_questions = [q1]
    state.question_idx = 0
    state.current_answers[str(user1.id)] = "A"  # Already answered
    manager._matches[match_id] = state
    
    with patch("app.services.battle_manager._quiz.check_answer") as mock_check:
        await manager._handle_answer(match_id, state, user1, {
            "question_id": "q1",
            "answer": "B"
        })
        
        # Should not call check_answer again
        mock_check.assert_not_called()


@pytest.mark.asyncio
async def test_handle_answer_question_mismatch():
    """Answer rejected when question_id doesn't match current."""
    manager = BattleManager()
    ws1 = _make_websocket()
    user1 = _make_user()
    match_id = str(uuid4())
    
    q1 = Question("q1", "Q1?", ["A", "B", "C", "D"], "A", "Science")
    
    state = MatchState()
    state.players = [{"ws": ws1, "user": user1}]
    state.phase = "questions"
    state.round_questions = [q1]
    state.question_idx = 0
    manager._matches[match_id] = state
    
    await manager._handle_answer(match_id, state, user1, {
        "question_id": "q999",  # Wrong question
        "answer": "A"
    })
    
    # Should not process
    assert len(state.current_answers) == 0


@pytest.mark.asyncio
async def test_handle_answer_increments_score():
    """Correct answer increments round score."""
    manager = BattleManager()
    ws1 = _make_websocket()
    ws2 = _make_websocket()
    user1 = _make_user()
    user2 = _make_user()
    match_id = str(uuid4())
    
    q1 = Question("q1", "Q1?", ["A", "B", "C", "D"], "A", "Science")
    
    state = MatchState()
    state.players = [{"ws": ws1, "user": user1}, {"ws": ws2, "user": user2}]
    state.phase = "questions"
    state.round_questions = [q1]
    state.question_idx = 0
    state.round_scores[str(user1.id)] = 0
    state.round_scores[str(user2.id)] = 0
    manager._matches[match_id] = state
    
    with patch("app.services.battle_manager._quiz.check_answer") as mock_check:
        mock_check.return_value = (True, "A")  # Correct answer
        
        await manager._handle_answer(match_id, state, user1, {
            "question_id": "q1",
            "answer": "A"
        })
        
        assert state.round_scores[str(user1.id)] == 1


@pytest.mark.asyncio
async def test_end_round_player1_wins():
    """Round winner correctly determined and round_wins updated."""
    manager = BattleManager()
    ws1 = _make_websocket()
    ws2 = _make_websocket()
    user1 = _make_user()
    user2 = _make_user()
    match_id = str(uuid4())
    
    state = MatchState()
    state.players = [{"ws": ws1, "user": user1}, {"ws": ws2, "user": user2}]
    state.current_round = 1
    state.round_scores = {str(user1.id): 3, str(user2.id): 1}
    state.round_wins = {str(user1.id): 0, str(user2.id): 0}
    state.picker_idx = 0
    state.phase = "questions"
    manager._matches[match_id] = state
    
    with patch.object(manager, "_end_game", new_callable=AsyncMock):
        with patch.object(manager, "_start_round", new_callable=AsyncMock):
            await manager._end_round(match_id, state)
            
            # Player1 wins round
            assert state.round_wins[str(user1.id)] == 1
            assert state.picker_idx == 1  # Loser (player2) picks next


@pytest.mark.asyncio
async def test_end_round_tie():
    """Round tie: picker doesn't change, same player continues picking."""
    manager = BattleManager()
    ws1 = _make_websocket()
    ws2 = _make_websocket()
    user1 = _make_user()
    user2 = _make_user()
    match_id = str(uuid4())
    
    state = MatchState()
    state.players = [{"ws": ws1, "user": user1}, {"ws": ws2, "user": user2}]
    state.current_round = 1
    state.round_scores = {str(user1.id): 2, str(user2.id): 2}
    state.round_wins = {str(user1.id): 0, str(user2.id): 0}
    state.picker_idx = 0
    manager._matches[match_id] = state
    
    with patch.object(manager, "_start_round", new_callable=AsyncMock):
        await manager._end_round(match_id, state)
        
        # No round win change on tie
        assert state.round_wins[str(user1.id)] == 0
        assert state.round_wins[str(user2.id)] == 0
        # Picker stays same
        assert state.picker_idx == 0


@pytest.mark.asyncio
async def test_end_round_game_over():
    """_end_round triggers _end_game when someone reaches ROUNDS_TO_WIN."""
    manager = BattleManager()
    ws1 = _make_websocket()
    ws2 = _make_websocket()
    user1 = _make_user()
    user2 = _make_user()
    match_id = str(uuid4())
    
    state = MatchState()
    state.players = [{"ws": ws1, "user": user1}, {"ws": ws2, "user": user2}]
    state.current_round = 5
    state.round_scores = {str(user1.id): 3, str(user2.id): 0}
    state.round_wins = {str(user1.id): 2, str(user2.id): 2}  # User1 will reach 3
    state.picker_idx = 0
    manager._matches[match_id] = state
    
    with patch.object(manager, "_end_game", new_callable=AsyncMock) as mock_end_game:
        await manager._end_round(match_id, state)
        
        # Should call _end_game
        mock_end_game.assert_called_once()


@pytest.mark.asyncio
async def test_end_game_sends_winner_message():
    """_end_game sends correct winner to both players."""
    manager = BattleManager()
    ws1 = _make_websocket()
    ws2 = _make_websocket()
    user1 = _make_user(username="Winner")
    user2 = _make_user(username="Loser")
    match_id = str(uuid4())
    
    state = MatchState()
    state.players = [{"ws": ws1, "user": user1}, {"ws": ws2, "user": user2}]
    state.round_wins = {str(user1.id): 3, str(user2.id): 1}
    manager._matches[match_id] = state
    
    await manager._end_game(match_id, state)
    
    assert state.phase == "finished"
    assert match_id not in manager._matches  # Match deleted
    
    # Both players receive game_over
    assert ws1.send_json.called
    assert ws2.send_json.called
