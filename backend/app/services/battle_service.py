# NOTE: In-memory state — nicht thread-safe (GIL reicht für Dev/Test)
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
            {"player_id": player_id, "nickname": nickname},
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


# ── Match ─────────────────────────────────────────────────────────────────────

def _create_match(p1: dict, p2: dict, mode: str) -> dict:
    match_id = str(uuid.uuid4())
    match = {
        "id": match_id,
        "mode": mode,
        "status": "category_selection",
        "players": {
            "p1": {"id": p1["player_id"], "nickname": p1["nickname"], "rounds_won": 0},
            "p2": {"id": p2["player_id"], "nickname": p2["nickname"], "rounds_won": 0},
        },
        "current_round": 1,
        "category_picker": random.choice(["p1", "p2"]),
        "category_options": random.sample(CATEGORY_NAMES, 3),
        "selected_category": None,
        "questions": [],
        # round_answers: speichert alle Antworten eines Spielers auf einmal
        # {"p1": {"q_id": "answer", ...} | None, "p2": ... | None}
        "round_answers": {"p1": None, "p2": None},
        "round_results": [],
        "winner": None,
        "api_calls": 0,
    }
    _matches[match_id] = match
    return match


def get_match_state(match_id: str, player_id: str) -> dict | None:
    match = _matches.get(match_id)
    if not match:
        return None
    if not any(v["id"] == player_id for v in match["players"].values()):
        return None
    match["api_calls"] += 1
    print(f"[{match_id[:8]}] api_calls={match['api_calls']}")
    return _sanitize_state(match)


def _sanitize_state(match: dict) -> dict:
    state = copy.deepcopy(match)
    reveal = state["status"] in ("round_complete", "match_complete")
    for q in state["questions"]:
        if not reveal:
            q.pop("correct_answer", None)
    state.pop("round_answers", None)
    state.pop("_next_round", None)
    state.pop("api_calls", None)  # nur intern
    return state


# ── Spielzüge ─────────────────────────────────────────────────────────────────

def select_category(match_id: str, player_id: str, category: str) -> dict:
    match = _matches[match_id]
    picker_key = match["category_picker"]
    if match["players"][picker_key]["id"] != player_id:
        raise ValueError("Not your turn to pick")
    if category not in match["category_options"]:
        raise ValueError("Invalid category choice")
    match["api_calls"] += 1
    match["selected_category"] = category
    match["questions"] = _load_questions(category, count=3)
    match["round_answers"] = {"p1": None, "p2": None}
    match["status"] = "in_round"
    return _sanitize_state(match)


def submit_round(match_id: str, player_id: str, answers: dict[str, str]) -> dict:
    """Spieler reicht alle Antworten einer Runde auf einmal ein."""
    match = _matches[match_id]
    if match["status"] != "in_round":
        raise ValueError("Match is not in round")
    match["api_calls"] += 1
    player_key = next((k for k, v in match["players"].items() if v["id"] == player_id), None)
    if not player_key:
        raise ValueError("Player not in match")
    if match["round_answers"][player_key] is not None:
        raise ValueError("Already submitted answers for this round")

    match["round_answers"][player_key] = answers

    # Beide eingereicht → Runde auflösen
    if match["round_answers"]["p1"] is not None and match["round_answers"]["p2"] is not None:
        _resolve_round(match)

    return _sanitize_state(match)


def advance_to_next_round(match_id: str, player_id: str) -> dict:
    match = _matches[match_id]
    if match["status"] != "round_complete":
        raise ValueError("Match is not in round_complete state")
    match["api_calls"] += 1
    if not any(v["id"] == player_id for v in match["players"].values()):
        raise ValueError("Player not in match")
    next_info = match.get("_next_round")
    if not next_info:
        raise ValueError("No next round info")
    match["_next_round"] = None
    match["current_round"] = next_info["round"]
    match["category_picker"] = next_info["picker"]
    match["category_options"] = random.sample(CATEGORY_NAMES, 3)
    match["selected_category"] = None
    match["questions"] = []
    match["round_answers"] = {"p1": None, "p2": None}
    match["status"] = "category_selection"
    return _sanitize_state(match)


# ── Rundenauflösung ───────────────────────────────────────────────────────────

def _resolve_round(match: dict) -> None:
    scores: dict[str, int] = {"p1": 0, "p2": 0}
    for q in match["questions"]:
        for pk in ("p1", "p2"):
            player_answers = match["round_answers"].get(pk) or {}
            if player_answers.get(q["id"]) == q["correct_answer"]:
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
        next_picker = "p2" if round_winner == "p1" else "p1" if round_winner == "p2" else random.choice(["p1", "p2"])
        match["_next_round"] = {"round": match["current_round"] + 1, "picker": next_picker}


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
    p1 = match["players"]["p1"]["nickname"]
    p2 = match["players"]["p2"]["nickname"]
    print(
        f"[{match['id'][:8]}] MATCH COMPLETE — {p1} vs {p2} | "
        f"winner={match['winner']} | total api_calls={match['api_calls']}"
    )
