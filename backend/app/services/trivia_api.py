from enum import Enum
import httpx

TRIVIA_API_BASE = "https://the-trivia-api.com/v2"


class TriviaCategory(str, Enum):
    ARTS_AND_LITERATURE = "arts_and_literature"
    FILM_AND_TV = "film_and_tv"
    FOOD_AND_DRINK = "food_and_drink"
    GENERAL_KNOWLEDGE = "general_knowledge"
    GEOGRAPHY = "geography"
    HISTORY = "history"
    MUSIC = "music"
    SCIENCE = "science"
    SOCIETY_AND_CULTURE = "society_and_culture"
    SPORT_AND_LEISURE = "sport_and_leisure"


class TriviaDifficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


def fetch_trivia_questions(
    limit: int = 10,
    category: TriviaCategory | None = None,
    difficulty: TriviaDifficulty | None = None,
) -> list[dict]:
    params: dict = {"limit": limit}
    if category:
        params["categories"] = category.value
    if difficulty:
        params["difficulties"] = difficulty.value
    with httpx.Client(timeout=10) as client:
        response = client.get(f"{TRIVIA_API_BASE}/questions", params=params)
        response.raise_for_status()
        return response.json()
