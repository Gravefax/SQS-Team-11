import { RoundResultData, RoundOutcomeMeta } from '@/app/lib/interfaces/battle/BattleInterfaces';

/**
 * Determines the text color for an answer based on correctness and selection state.
 *
 * @param isCorrect - Whether the answer is the correct answer
 * @param isWrong - Whether the answer is selected but incorrect
 * @returns RGBA color string for the answer text
 *
 * - Correct answers: Green (`rgba(0,255,120,0.92)`)
 * - Incorrect selections: Orange-red (`rgba(255,110,70,0.85)`)
 * - Other answers: Blue-gray (`rgba(200,225,245,0.85)`)
 */
export function answerTextColor(isCorrect: boolean, isWrong: boolean): string {
  if (isCorrect) return 'rgba(0,255,120,0.92)';
  if (isWrong) return 'rgba(255,110,70,0.85)';
  return 'rgba(200,225,245,0.85)';
}

/**
 * Constructs a WebSocket URL from environment variables with fallback logic.
 *
 * Priority:
 * 1. `NEXT_PUBLIC_WS_BASE` - Direct WebSocket endpoint (preferred)
 * 2. `NEXT_PUBLIC_API_BASE` if absolute URL (converts http/https to ws/wss)
 * 3. `NEXT_PUBLIC_API_BASE` if relative path (uses current browser host)
 *
 * @param path - The WebSocket path (e.g., `/battle/ws/match-id`)
 * @returns Full WebSocket URL
 *
 * @example
 * // With NEXT_PUBLIC_WS_BASE=ws://localhost:8000
 * getWsUrl('/battle/ws/123')
 * // → 'ws://localhost:8000/battle/ws/123'
 *
 * @example
 * // With NEXT_PUBLIC_API_BASE=/api
 * getWsUrl('/battle/ws/123')
 * // → 'ws://localhost:3000/api/battle/ws/123'
 */
export { getWsUrl } from '@/app/lib/utils/wsUrl';

/**
 * Maps round outcome ('win' | 'loss' | 'tie') to display metadata.
 *
 * Returns styling and label information used for rendering the round result screen.
 *
 * @param outcome - The round's outcome
 * @returns Metadata with color, CSS class, and German label
 *
 * - **Win**: Gold color, `outcome-win` class with glow animation, "RUNDE GEWONNEN"
 * - **Loss**: Orange-red color, `outcome-loss` class with shake animation, "RUNDE VERLOREN"
 * - **Tie**: Blue-gray color, no animation class, "UNENTSCHIEDEN"
 */
export function getRoundOutcomeMeta(outcome: RoundResultData['outcome']): RoundOutcomeMeta {
  if (outcome === 'win') {
    return { color: '#FFD200', cssClass: 'outcome-win', label: 'RUNDE GEWONNEN' };
  }
  if (outcome === 'loss') {
    return { color: 'rgba(255,100,60,0.85)', cssClass: 'outcome-loss', label: 'RUNDE VERLOREN' };
  }
  return { color: 'rgba(140,200,230,0.8)', cssClass: '', label: 'UNENTSCHIEDEN' };
}
