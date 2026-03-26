import { AnswerResult, Question } from "./interfaces/Questions";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';


export async function fetchPracticeQuestions(): Promise<Question[]> {
  const res = await fetch(`${API_BASE}/quiz/practice/questions`);
  if (!res.ok) throw new Error(`Failed to fetch questions: ${res.status}`);
  return res.json();
}

export async function checkPracticeAnswer(
  question_id: string,
  answer: string,
): Promise<AnswerResult> {
  const res = await fetch(`${API_BASE}/quiz/practice/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question_id, answer }),
  });
  if (!res.ok) throw new Error(`Failed to check answer: ${res.status}`);
  return res.json();
}
