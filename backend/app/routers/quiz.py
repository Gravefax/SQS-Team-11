from typing import Annotated
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
import httpx
from app.services.quiz_api import fetch_quizzes, fetch_questions_for_quiz
from app.services.trivia_api import fetch_trivia_questions, TriviaCategory, TriviaDifficulty

router = APIRouter(prefix="/quiz", tags=["quiz"])

PRACTICE_QUESTIONS = [
    {
        "id": "q1",
        "text": "Was ist die Hauptstadt von Frankreich?",
        "answers": ["Paris", "London", "Berlin", "Madrid"],
        "correct_answer": "Paris",
        "category": "Geografie",
    },
    {
        "id": "q2",
        "text": "Wie viele Planeten hat unser Sonnensystem?",
        "answers": ["6", "7", "8", "9"],
        "correct_answer": "8",
        "category": "Wissenschaft",
    },
    {
        "id": "q3",
        "text": "In welchem Jahr fiel die Berliner Mauer?",
        "answers": ["1987", "1988", "1989", "1990"],
        "correct_answer": "1989",
        "category": "Geschichte",
    },
    {
        "id": "q4",
        "text": "Wer schrieb den Faust?",
        "answers": ["Schiller", "Goethe", "Kafka", "Brecht"],
        "correct_answer": "Goethe",
        "category": "Literatur",
    },
    {
        "id": "q5",
        "text": "Welches chemische Symbol steht für Gold?",
        "answers": ["Go", "Gd", "Au", "Ag"],
        "correct_answer": "Au",
        "category": "Chemie",
    },
    {
        "id": "q6",
        "text": "Wie viele Seiten hat ein Hexagon?",
        "answers": ["5", "6", "7", "8"],
        "correct_answer": "6",
        "category": "Mathematik",
    },
    {
        "id": "q7",
        "text": "Welcher Planet ist der größte in unserem Sonnensystem?",
        "answers": ["Saturn", "Uranus", "Jupiter", "Neptun"],
        "correct_answer": "Jupiter",
        "category": "Astronomie",
    },
    {
        "id": "q8",
        "text": "Was ist die offizielle Sprache Brasiliens?",
        "answers": ["Spanisch", "Englisch", "Portugiesisch", "Französisch"],
        "correct_answer": "Portugiesisch",
        "category": "Geografie",
    },
    {
        "id": "q9",
        "text": "Wie viele Knochen hat ein erwachsener Mensch?",
        "answers": ["196", "206", "216", "226"],
        "correct_answer": "206",
        "category": "Biologie",
    },
    {
        "id": "q10",
        "text": "In welchem Jahr sank die Titanic?",
        "answers": ["1910", "1911", "1912", "1913"],
        "correct_answer": "1912",
        "category": "Geschichte",
    },
]

_QUESTION_MAP = {q["id"]: q for q in PRACTICE_QUESTIONS}


class QuestionResponse(BaseModel):
    id: str
    text: str
    answers: list[str]
    category: str


class AnswerRequest(BaseModel):
    question_id: str
    answer: str


class AnswerResponse(BaseModel):
    correct: bool
    correct_answer: str


@router.get(
    "/external/quizzes",
    responses={503: {"description": "QuizAPI unreachable"}},
)
def get_external_quizzes(limit: Annotated[int, Query(ge=1, le=50)] = 10):
    try:
        return fetch_quizzes(limit=limit)
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"QuizAPI unreachable: {e}")


@router.get(
    "/external/quizzes/{quiz_id}/questions",
    responses={404: {"description": "Quiz not found"}, 503: {"description": "QuizAPI unreachable"}},
)
def get_questions_for_quiz(quiz_id: str, limit: Annotated[int, Query(ge=1, le=20)] = 4):
    # Quiz laden um die Kategorie zu ermitteln
    try:
        quizzes_result = fetch_quizzes(limit=50)
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"QuizAPI unreachable: {e}")

    quiz = next((q for q in quizzes_result.get("data", []) if q["id"] == quiz_id), None)
    if not quiz:
        raise HTTPException(status_code=404, detail=f"Quiz '{quiz_id}' not found")

    try:
        return fetch_questions_for_quiz(quiz_category=quiz["category"], limit=limit)
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"QuizAPI unreachable: {e}")


@router.get(
    "/trivia/questions",
    responses={503: {"description": "Trivia API unreachable"}},
)
def get_trivia_questions(
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
    category: TriviaCategory | None = None,
    difficulty: TriviaDifficulty | None = None,
):
    try:
        return fetch_trivia_questions(limit=limit, category=category, difficulty=difficulty)
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Trivia API unreachable: {e}")


@router.get("/practice/questions", response_model=list[QuestionResponse])
def get_practice_questions():
    return [
        QuestionResponse(
            id=q["id"],
            text=q["text"],
            answers=q["answers"],
            category=q["category"],
        )
        for q in PRACTICE_QUESTIONS
    ]


@router.post(
    "/practice/answer",
    response_model=AnswerResponse,
    responses={404: {"description": "Question not found"}},
)
def check_answer(body: AnswerRequest):
    question = _QUESTION_MAP.get(body.question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return AnswerResponse(
        correct=body.answer == question["correct_answer"],
        correct_answer=question["correct_answer"],
    )
