# NOTE: In-memory state — nicht thread-safe (GIL reicht für Dev/Test)
# Für Production: asyncio.Lock oder Redis verwenden
import copy
import random
import uuid
from datetime import datetime, timezone

_queue: list[dict] = []
_matches: dict[str, dict] = {}

CATEGORIES: dict[str, str] = {
    "Geography":         "geography",
    "History":           "history",
    "Science":           "science",
    "Music":             "music",
    "Sport & Leisure":   "sport_and_leisure",
    "Arts & Literature": "arts_and_literature",
    "Film & TV":         "film_and_tv",
    "Food & Drink":      "food_and_drink",
    "General Knowledge": "general_knowledge",
    "Society & Culture": "society_and_culture",
}
CATEGORY_NAMES = list(CATEGORIES.keys())


# ── Normalisierung ────────────────────────────────────────────────────────────

def _normalize_trivia(raw: dict) -> dict:
    answers = raw["incorrectAnswers"] + [raw["correctAnswer"]]
    random.shuffle(answers)
    return {
        "id": raw["id"],
        "text": raw["question"]["text"],
        "answers": answers,
        "correct_answer": raw["correctAnswer"],
    }


def _load_questions(category_name: str, count: int = 3) -> list[dict]:
    from app.services.trivia_api import fetch_trivia_questions, TriviaCategory
    raw_list = fetch_trivia_questions(limit=count, category=TriviaCategory(CATEGORIES[category_name]))
    return [_normalize_trivia(q) for q in raw_list[:count]]


# ── Queue ─────────────────────────────────────────────────────────────────────

def join_queue(nickname: str, mode: str) -> dict:
    player_id = str(uuid.uuid4())
    waiting = next((p for p in _queue if p["mode"] == mode), None)
    if waiting:
        _queue.remove(waiting)
        match = _create_match(
            {"player_id": waiting["player_id"], "nickname": waiting["nickname"]},
            {"player_id": player_id,            "nickname": nickname},
            mode,
        )
        return {"player_id": player_id, "status": "matched", "match_id": match["id"]}
    _queue.append({
        "player_id": player_id,
        "nickname": nickname,
        "joined_at": datetime.now(timezone.utc).isoformat(),
        "mode": mode,
    })
    return {"player_id": player_id, "status": "queued", "match_id": None}


def leave_queue(player_id: str) -> None:
    global _queue
    _queue = [p for p in _queue if p["player_id"] != player_id]


def check_queue_status(player_id: str) -> dict:
    if any(p["player_id"] == player_id for p in _queue):
        return {"status": "queued", "match_id": None}
    for match_id, match in _matches.items():
        if any(v["id"] == player_id for v in match["players"].values()):
            return {"status": "matched", "match_id": match_id}
    return {"status": "not_found", "match_id": None}


# ── Match erstellen ───────────────────────────────────────────────────────────

def _create_match(p1: dict, p2: dict, mode: str) -> dict:
    match_id = str(uuid.uuid4())
    picker = random.choice(["p1", "p2"])
    match = {
        "id": match_id,
        "mode": mode,
        "status": "category_selection",
        "players": {
            "p1": {"id": p1["player_id"], "nickname": p1["nickname"], "rounds_won": 0},
            "p2": {"id": p2["player_id"], "nickname": p2["nickname"], "rounds_won": 0},
        },
        "current_round": 1,
        "category_picker": picker,
        "category_options": random.sample(CATEGORY_NAMES, 3),
        "selected_category": None,
        "questions": [],
        "current_question_index": 0,
        "answers": {},
        "round_results": [],
        "winner": None,
    }
    _matches[match_id] = match
    return match


# ── Match state ───────────────────────────────────────────────────────────────

def get_match_state(match_id: str, player_id: str) -> dict | None:
    match = _matches.get(match_id)
    if not match:
        return None
    if not any(v["id"] == player_id for v in match["players"].values()):
        return None
    return _sanitize_state(match)


def _sanitize_state(match: dict) -> dict:
    state = copy.deepcopy(match)
    reveal = state["status"] in ("round_complete", "match_complete")
    for q in state["questions"]:
        if not reveal:
            q.pop("correct_answer", None)
    return state


# ── Spielzüge ─────────────────────────────────────────────────────────────────

def select_category(match_id: str, player_id: str, category: str) -> dict:
    match = _matches[match_id]
    picker_key = match["category_picker"]
    if match["players"][picker_key]["id"] != player_id:
        raise ValueError("Not your turn to pick")
    if category not in match["category_options"]:
        raise ValueError("Invalid category choice")
    match["selected_category"] = category
    match["questions"] = _load_questions(category, count=3)
    match["current_question_index"] = 0
    match["answers"] = {q["id"]: {"p1": None, "p2": None} for q in match["questions"]}
    match["status"] = "in_round"
    return _sanitize_state(match)


def submit_answer(match_id: str, player_id: str, question_id: str, answer: str) -> dict:
    match = _matches[match_id]
    player_key = next(
        (k for k, v in match["players"].items() if v["id"] == player_id), None
    )
    if not player_key:
        raise ValueError("Player not in match")
    if question_id not in match["answers"]:
        raise ValueError("Unknown question_id")
    # Verhindere Doppel-Antwort
    if match["answers"][question_id][player_key] is not None:
        raise ValueError("Already answered this question")

    match["answers"][question_id][player_key] = answer

    # Fragen-Index vorantreiben (für UI-Hint, beide haben diese Frage beantwortet)
    q_ids = [q["id"] for q in match["questions"]]
    current_idx = match["current_question_index"]
    if current_idx < len(q_ids):
        current_q_id = q_ids[current_idx]
        slot = match["answers"][current_q_id]
        if slot["p1"] is not None and slot["p2"] is not None:
            if current_idx + 1 < len(q_ids):
                match["current_question_index"] = current_idx + 1

    # Runde abschließen wenn alle 6 Antworten da
    all_answered = all(
        v["p1"] is not None and v["p2"] is not None
        for v in match["answers"].values()
    )
    if all_answered:
        _resolve_round(match)

    correct_answer = next(
        q["correct_answer"] for q in match["questions"] if q["id"] == question_id
    )
    return {
        "correct": answer == correct_answer,
        "round_complete": match["status"] == "round_complete",
    }


# ── Rundenauflösung ───────────────────────────────────────────────────────────

def _resolve_round(match: dict) -> None:
    scores: dict[str, int] = {"p1": 0, "p2": 0}
    for q in match["questions"]:
        for pk in ("p1", "p2"):
            if match["answers"][q["id"]][pk] == q["correct_answer"]:
                scores[pk] += 1

    if scores["p1"] > scores["p2"]:
        round_winner: str | None = "p1"
    elif scores["p2"] > scores["p1"]:
        round_winner = "p2"
    else:
        round_winner = None

    if round_winner:
        match["players"][round_winner]["rounds_won"] += 1

    match["round_results"].append({
        "round": match["current_round"],
        "category": match["selected_category"],
        "winner": round_winner,
        "p1_score": scores["p1"],
        "p2_score": scores["p2"],
    })
    match["status"] = "round_complete"

    if match["current_round"] >= 5:
        _finalize_match(match)
    else:
        # Nächste Runde vorbereiten — Übergang beim nächsten "Continue"-Aufruf
        match["_next_round"] = {
            "round": match["current_round"] + 1,
            "picker": "p2" if round_winner == "p1" else "p1" if round_winner == "p2" else random.choice(["p1", "p2"]),
        }


def _finalize_match(match: dict) -> None:
    p1w = match["players"]["p1"]["rounds_won"]
    p2w = match["players"]["p2"]["rounds_won"]
    if p1w > p2w:
        match["winner"] = "p1"
    elif p2w > p1w:
        match["winner"] = "p2"
    else:
        match["winner"] = "draw"
    match["status"] = "match_complete"


def advance_to_next_round(match_id: str, player_id: str) -> dict:
    """Wird nach round_complete aufgerufen um zur nächsten Kategoriewahl zu wechseln."""
    match = _matches[match_id]
    if match["status"] != "round_complete":
        raise ValueError("Match is not in round_complete state")
    if not any(v["id"] == player_id for v in match["players"].values()):
        raise ValueError("Player not in match")
    next_info = match.pop("_next_round", None)
    if not next_info:
        raise ValueError("No next round info")
    match["current_round"] = next_info["round"]
    match["category_picker"] = next_info["picker"]
    match["category_options"] = random.sample(CATEGORY_NAMES, 3)
    match["selected_category"] = None
    match["questions"] = []
    match["current_question_index"] = 0
    match["answers"] = {}
    match["status"] = "category_selection"
    return _sanitize_state(match)
