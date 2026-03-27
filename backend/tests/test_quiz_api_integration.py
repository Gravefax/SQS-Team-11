"""
Integration test – ruft die echte QuizAPI auf.
Benötigt einen gültigen QUIZ_API_KEY in backend/.env.
Ausführen: pytest tests/test_quiz_api_integration.py -v
"""

import json
import pytest
from app.services.quiz_api import fetch_quizzes, fetch_questions


def test_fetch_quizzes_returns_data():
    result = fetch_quizzes(limit=5)
    print("\n--- API Antwort (limit=5) ---")
    print(json.dumps(result, indent=2))
    assert "data" in result, f"Antwort enthält kein 'data'-Feld: {result}"


def test_fetch_quizzes_respects_limit():
    result = fetch_quizzes(limit=3)
    data = result.get("data", [])
    print(f"\n--- Anzahl zurückgegebener Quizzes: {len(data)} ---")
    assert len(data) <= 3


def test_fetch_quizzes_quiz_shape():
    result = fetch_quizzes(limit=1)
    data = result.get("data", [])
    assert len(data) >= 1, "API hat keine Quizzes zurückgegeben"
    quiz = data[0]
    print("\n--- Erstes Quiz ---")
    print(json.dumps(quiz, indent=2))
    assert "id" in quiz
    assert "title" in quiz


def test_fetch_quizzes_meta():
    result = fetch_quizzes(limit=5)
    assert "meta" in result, f"Antwort enthält kein 'meta'-Feld: {result}"
    meta = result["meta"]
    print("\n--- Meta ---")
    print(json.dumps(meta, indent=2))
    assert "total" in meta or "limit" in meta


def test_fetch_questions_trivia():
    result = fetch_questions(limit=3, tags="trivia")
    data = result.get("data", [])
    print("\n--- 3 Trivia-Fragen ---")
    print(json.dumps(data, indent=2))
    assert len(data) <= 3
    assert len(data) >= 1
