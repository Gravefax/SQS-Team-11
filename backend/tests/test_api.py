import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

# Patch DB engine creation before importing main
with patch("sqlalchemy.create_engine") as mock_engine:
    mock_engine.return_value = MagicMock()
    with patch("app.database.Base.metadata.create_all"):
        from main import app

client = TestClient(app)


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "API is running"}


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_get_practice_questions_returns_ten():
    response = client.get("/quiz/practice/questions")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 10


def test_get_practice_questions_shape():
    response = client.get("/quiz/practice/questions")
    question = response.json()[0]
    assert "id" in question
    assert "text" in question
    assert "answers" in question
    assert "category" in question
    assert "correct_answer" not in question


def test_check_answer_correct():
    response = client.post(
        "/quiz/practice/answer",
        json={"question_id": "q1", "answer": "Paris"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["correct"] is True
    assert data["correct_answer"] == "Paris"


def test_check_answer_wrong():
    response = client.post(
        "/quiz/practice/answer",
        json={"question_id": "q1", "answer": "Berlin"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["correct"] is False
    assert data["correct_answer"] == "Paris"


def test_check_answer_unknown_question():
    response = client.post(
        "/quiz/practice/answer",
        json={"question_id": "does_not_exist", "answer": "anything"},
    )
    assert response.status_code == 404
