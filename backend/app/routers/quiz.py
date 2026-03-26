from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

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
