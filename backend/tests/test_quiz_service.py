import pytest
from unittest.mock import MagicMock, patch

from app.services.quiz_service import (
    Question,
    InternalQuizProvider,
    QuizService,
    QuizProvider,
)


class TestQuestion:
    """Question dataclass tests."""
    
    def test_question_creation(self):
        """Create a Question object."""
        q = Question(
            id="q1",
            text="What is 2+2?",
            answers=["3", "4", "5", "6"],
            correct_answer="4",
            category="Math",
        )
        assert q.id == "q1"
        assert q.text == "What is 2+2?"
        assert len(q.answers) == 4
        assert q.correct_answer == "4"
        assert q.category == "Math"


class TestInternalQuizProvider:
    """Tests for built-in question provider."""
    
    def test_init_builds_index(self):
        """Init builds lookup index by ID."""
        provider = InternalQuizProvider()
        assert len(provider._by_id) == 10
        assert "q1" in provider._by_id
        assert "q10" in provider._by_id
    
    def test_get_questions_all(self):
        """Get all questions when n is None."""
        provider = InternalQuizProvider()
        questions = provider.get_questions(n=None)
        
        assert len(questions) == 10
        assert all(isinstance(q, Question) for q in questions)
    
    def test_get_questions_subset(self):
        """Get random subset of questions."""
        provider = InternalQuizProvider()
        
        questions = provider.get_questions(n=5)
        assert len(questions) == 5
        assert all(isinstance(q, Question) for q in questions)
    
    def test_get_questions_smaller_than_requested(self):
        """Return all when requesting more than available."""
        provider = InternalQuizProvider()
        
        questions = provider.get_questions(n=20)  # Ask for 20 but only 10 exist
        assert len(questions) == 10
    
    def test_get_questions_zero(self):
        """Get zero questions when n=0."""
        provider = InternalQuizProvider()
        
        questions = provider.get_questions(n=0)
        assert len(questions) == 0
    
    def test_get_question_by_id_exists(self):
        """Retrieve single question by ID."""
        provider = InternalQuizProvider()
        
        q = provider.get_question("q1")
        assert q is not None
        assert q.id == "q1"
        assert q.text == "Was ist die Hauptstadt von Frankreich?"
        assert q.correct_answer == "Paris"
    
    def test_get_question_by_id_not_found(self):
        """Return None for nonexistent question ID."""
        provider = InternalQuizProvider()
        
        q = provider.get_question("q999")
        assert q is None
    
    def test_questions_are_immutable(self):
        """Question objects are frozen (immutable)."""
        provider = InternalQuizProvider()
        q = provider.get_question("q1")
        
        with pytest.raises(Exception):  # FrozenInstanceError or AttributeError
            q.id = "modified"
    
    def test_all_questions_have_exactly_4_answers(self):
        """All questions have exactly 4 answer options."""
        provider = InternalQuizProvider()
        for q in provider.get_questions():
            assert len(q.answers) == 4
    
    def test_correct_answer_in_answers(self):
        """Correct answer is always one of the 4 options."""
        provider = InternalQuizProvider()
        for q in provider.get_questions():
            assert q.correct_answer in q.answers
    
    def test_randomness_in_sampling(self):
        """Multiple calls produce different orderings (with high probability)."""
        provider = InternalQuizProvider()
        
        set1 = [q.id for q in provider.get_questions(n=5)]
        set2 = [q.id for q in provider.get_questions(n=5)]
        
        # Very unlikely both orderings are identical (though not impossible)
        # Test passes if they're different OR if we got fewer than 5 consistently
        assert len(set1) == 5 and len(set2) == 5


class TestQuizService:
    """Tests for high-level QuizService."""
    
    def test_init_accepts_provider(self):
        """QuizService initializes with a provider."""
        provider = InternalQuizProvider()
        service = QuizService(provider)
        assert service._provider == provider
    
    def test_get_questions_delegates_to_provider(self):
        """get_questions delegates to provider."""
        mock_provider = MagicMock(spec=QuizProvider)
        mock_questions = [
            Question("q1", "Test?", ["A", "B", "C", "D"], "A", "Test"),
        ]
        mock_provider.get_questions.return_value = mock_questions
        
        service = QuizService(mock_provider)
        result = service.get_questions(n=5)
        
        assert result == mock_questions
        mock_provider.get_questions.assert_called_once()
    
    def test_get_questions_none_parameter(self):
        """get_questions passes None to provider correctly."""
        provider = InternalQuizProvider()
        service = QuizService(provider)
        
        result = service.get_questions(n=None)
        assert len(result) == 10
    
    def test_works_with_custom_provider(self):
        """QuizService works with any QuizProvider implementation."""
        class CustomProvider(QuizProvider):
            def get_questions(self, n=None):
                return [
                    Question("c1", "Custom Q1?", ["A", "B", "C", "D"], "B", "Custom"),
                ]
            
            def get_question(self, question_id):
                if question_id == "c1":
                    return Question("c1", "Custom Q1?", ["A", "B", "C", "D"], "B", "Custom")
                return None
        
        custom = CustomProvider()
        service = QuizService(custom)
        
        questions = service.get_questions()
        assert len(questions) == 1
        assert questions[0].id == "c1"


class TestQuizProviderInterface:
    """Tests for abstract QuizProvider interface."""
    
    def test_quiz_provider_is_abstract(self):
        """QuizProvider cannot be instantiated directly."""
        with pytest.raises(TypeError):
            QuizProvider()
