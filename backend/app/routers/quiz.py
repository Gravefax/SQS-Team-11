from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.quiz_service import InternalQuizProvider, QuizService

router = APIRouter(prefix="/quiz", tags=["quiz"])

_service = QuizService(InternalQuizProvider())


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
        QuestionResponse(id=q.id, text=q.text, answers=q.answers, category=q.category)
        for q in _service.get_questions()
    ]


@router.post(
    "/practice/answer",
    response_model=AnswerResponse,
    responses={404: {"description": "Question not found"}},
)
def check_answer(body: AnswerRequest):
    result = _service.check_answer(body.question_id, body.answer)
    if result is None:
        raise HTTPException(status_code=404, detail="Question not found")
    correct, correct_answer = result
    return AnswerResponse(correct=correct, correct_answer=correct_answer)
