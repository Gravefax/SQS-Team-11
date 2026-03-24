/**
 * Formats a quiz score as a percentage string.
 * @param correct - Number of correct answers
 * @param total - Total number of questions
 */
export function formatScore(correct: number, total: number): string {
  if (total === 0) return "0%";
  const percentage = Math.round((correct / total) * 100);
  return `${percentage}%`;
}
