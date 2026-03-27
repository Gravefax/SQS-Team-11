import os
from dotenv import load_dotenv
from enum import Enum
import httpx

BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
load_dotenv(dotenv_path=os.path.join(BACKEND_ROOT, ".env"))

class QuizCategory(str, Enum):
    CSS_HTML = "CSS/HTML"
    CYBERSECURITY = "Cybersecurity"
    DATA_SCIENCE = "Data Science"
    DATABASE = "Database"
    DEVOPS = "DevOps"
    DEVOPS_CLOUD = "DevOps/Cloud"
    GENERAL_KNOWLEDGE = "General Knowledge"
    GEOGRAPHY = "Geography"
    HISTORY = "History"
    LITERATURE = "Literature"
    MATHEMATICS = "Mathematics"
    PROGRAMMING = "Programming"
    SCIENCE = "Science"
    TYPESCRIPT = "TypeScript"


QUIZ_API_BASE = "https://quizapi.io/api/v1"
QUIZ_API_KEY = os.getenv("QUIZ_API_KEY")


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {QUIZ_API_KEY}",
        "Content-Type": "application/json",
    }


def fetch_quizzes(limit: int = 10) -> dict:
    url = f"{QUIZ_API_BASE}/quizzes"
    with httpx.Client(timeout=10) as client:
        response = client.get(url, headers=_headers(), params={"limit": limit})
        response.raise_for_status()
        return response.json()


def fetch_questions(limit: int = 10, tags: str | None = None, category: QuizCategory | None = None) -> dict:
    url = f"{QUIZ_API_BASE}/questions"
    params: dict = {"limit": limit}
    if tags:
        params["tags"] = tags
    if category:
        params["category"] = category
    with httpx.Client(timeout=10) as client:
        response = client.get(url, headers=_headers(), params=params)
        response.raise_for_status()
        return response.json()


def fetch_questions_for_quiz(quiz_category: str, limit: int = 4) -> dict:
    """Holt echte Fragen anhand der Kategorie eines Quiz-Objekts."""
    url = f"{QUIZ_API_BASE}/questions"
    with httpx.Client(timeout=10) as client:
        response = client.get(url, headers=_headers(), params={"category": quiz_category, "limit": limit})
        response.raise_for_status()
        return response.json()
