export type MatchStatus =
  | 'category_selection'
  | 'in_round'
  | 'round_complete'
  | 'match_complete';

export interface BattlePlayer {
  id: string;
  nickname: string;
  rounds_won: number;
}

export interface BattleQuestion {
  id: string;
  text: string;
  answers: string[];
  correct_answer?: string; // nur bei round_complete / match_complete
}

export interface RoundResult {
  round: number;
  category: string;
  winner: 'p1' | 'p2' | null;
  p1_score: number;
  p2_score: number;
}

export interface MatchState {
  id: string;
  mode: 'unranked' | 'ranked';
  status: MatchStatus;
  players: { p1: BattlePlayer; p2: BattlePlayer };
  current_round: number;
  category_picker: 'p1' | 'p2';
  category_options: string[];
  selected_category: string | null;
  questions: BattleQuestion[];
  current_question_index: number;
  answers: Record<string, { p1: string | null; p2: string | null }>;
  round_results: RoundResult[];
  winner: 'p1' | 'p2' | 'draw' | null;
}

export interface JoinQueueResponse {
  player_id: string;
  status: 'queued' | 'matched';
  match_id: string | null;
}

export interface QueueStatusResponse {
  status: 'queued' | 'matched' | 'not_found';
  match_id: string | null;
}

export interface AnswerResponse {
  correct: boolean;
  round_complete: boolean;
}
