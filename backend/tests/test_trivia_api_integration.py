"""
Integration test – ruft die echte The Trivia API auf.
Kein API-Key nötig.
Ausführen: pytest tests/test_trivia_api_integration.py -v -s
"""

import json
from app.services.trivia_api import fetch_trivia_questions, TriviaCategory, TriviaDifficulty


def test_fetch_trivia_questions_returns_list():
    result = fetch_trivia_questions(limit=5)
    print("\n--- Trivia API Antwort (limit=5) ---")
    print(json.dumps(result, indent=2))
    assert isinstance(result, list)
    assert len(result) > 0


def test_fetch_trivia_questions_respects_limit():
    result = fetch_trivia_questions(limit=3)
    print(f"\n--- Anzahl zurückgegebener Fragen: {len(result)} ---")
    assert len(result) <= 3


def test_fetch_trivia_questions_text_choice_shape():
    result = fetch_trivia_questions(limit=1)
    assert len(result) >= 1
    q = result[0]
    print("\n--- Erste Frage ---")
    print(json.dumps(q, indent=2))
    assert "question" in q and "text" in q["question"]
    assert "correctAnswer" in q
    assert "incorrectAnswers" in q
    assert isinstance(q["incorrectAnswers"], list)
    assert q.get("type") == "text_choice"


def test_fetch_trivia_questions_with_category():
    result = fetch_trivia_questions(limit=3, category=TriviaCategory.HISTORY)
    print(f"\n--- History-Fragen ({len(result)}) ---")
    for q in result:
        print(f"  [{q.get('category')}] {q['question']['text'][:60]}")
    assert len(result) >= 1


def test_fetch_trivia_questions_with_difficulty():
    result = fetch_trivia_questions(limit=3, difficulty=TriviaDifficulty.EASY)
    print(f"\n--- Easy-Fragen ({len(result)}) ---")
    for q in result:
        print(f"  [{q.get('difficulty')}] {q['question']['text'][:60]}")
    assert len(result) >= 1
    assert all(q.get("difficulty") == "easy" for q in result)
