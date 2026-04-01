from __future__ import annotations

import random
from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class Question:
    id: str
    text: str
    answers: list[str]   # always exactly 4 options
    correct_answer: str  # must be one of answers
    category: str


class QuizProvider(ABC):
    """
    Interface for question sources.
    Implement this to plug in any backend (database, external API, etc.).
    """

    @abstractmethod
    def get_questions(self, n: int | None = None) -> list[Question]:
        """Return up to n questions (all of them when n is None)."""

    @abstractmethod
    def get_question(self, question_id: str) -> Question | None:
        """Look up a single question by ID."""


class InternalQuizProvider(QuizProvider):
    """
    Built-in question bank — no external dependencies.
    Add entries to _QUESTIONS to extend the pool.
    """

    _QUESTIONS: list[Question] = [
        Question(
            id="q1",
            text="Was ist die Hauptstadt von Frankreich?",
            answers=["Paris", "London", "Berlin", "Madrid"],
            correct_answer="Paris",
            category="Geografie",
        ),
        Question(
            id="q2",
            text="Wie viele Planeten hat unser Sonnensystem?",
            answers=["6", "7", "8", "9"],
            correct_answer="8",
            category="Wissenschaft",
        ),
        Question(
            id="q3",
            text="In welchem Jahr fiel die Berliner Mauer?",
            answers=["1987", "1988", "1989", "1990"],
            correct_answer="1989",
            category="Geschichte",
        ),
        Question(
            id="q4",
            text="Wer schrieb den Faust?",
            answers=["Schiller", "Goethe", "Kafka", "Brecht"],
            correct_answer="Goethe",
            category="Literatur",
        ),
        Question(
            id="q5",
            text="Welches chemische Symbol steht für Gold?",
            answers=["Go", "Gd", "Au", "Ag"],
            correct_answer="Au",
            category="Chemie",
        ),
        Question(
            id="q6",
            text="Wie viele Seiten hat ein Hexagon?",
            answers=["5", "6", "7", "8"],
            correct_answer="6",
            category="Mathematik",
        ),
        Question(
            id="q7",
            text="Welcher Planet ist der größte in unserem Sonnensystem?",
            answers=["Saturn", "Uranus", "Jupiter", "Neptun"],
            correct_answer="Jupiter",
            category="Astronomie",
        ),
        Question(
            id="q8",
            text="Was ist die offizielle Sprache Brasiliens?",
            answers=["Spanisch", "Englisch", "Portugiesisch", "Französisch"],
            correct_answer="Portugiesisch",
            category="Geografie",
        ),
        Question(
            id="q9",
            text="Wie viele Knochen hat ein erwachsener Mensch?",
            answers=["196", "206", "216", "226"],
            correct_answer="206",
            category="Biologie",
        ),
        Question(
            id="q10",
            text="In welchem Jahr sank die Titanic?",
            answers=["1910", "1911", "1912", "1913"],
            correct_answer="1912",
            category="Geschichte",
        ),
    ]

    def __init__(self) -> None:
        self._by_id: dict[str, Question] = {q.id: q for q in self._QUESTIONS}

    def get_questions(self, n: int | None = None) -> list[Question]:
        questions = list(self._QUESTIONS)
        if n is not None:
            questions = random.sample(questions, min(n, len(questions)))
        return questions

    def get_question(self, question_id: str) -> Question | None:
        return self._by_id.get(question_id)


class QuizService:
    """
    Entry point for all quiz operations.
    Swap the provider to change the question source without touching this class.

    Usage:
        service = QuizService(InternalQuizProvider())
        questions = service.get_questions(n=5)
        result = service.check_answer("q1", "Paris")
    """

    def __init__(self, provider: QuizProvider) -> None:
        self._provider = provider

    def get_questions(self, n: int | None = None) -> list[Question]:
        return self._provider.get_questions(n)

    def check_answer(self, question_id: str, answer: str) -> tuple[bool, str] | None:
        """
        Returns (is_correct, correct_answer), or None if the question ID is unknown.
        """
        question = self._provider.get_question(question_id)
        if question is None:
            return None
        return (answer == question.correct_answer, question.correct_answer)
