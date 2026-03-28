import axios from 'axios';
import {
  JoinQueueResponse,
  QueueStatusResponse,
  MatchState,
} from '../interfaces/Battle';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

export async function joinQueue(
  nickname: string,
  mode: 'unranked' | 'ranked' = 'unranked'
): Promise<JoinQueueResponse> {
  const res = await axios.post<JoinQueueResponse>(`${API_BASE}/battle/queue/join`, {
    nickname,
    mode,
  });
  return res.data;
}

export async function leaveQueue(player_id: string): Promise<void> {
  await axios.delete(`${API_BASE}/battle/queue/leave`, { data: { player_id } });
}

export async function checkQueueStatus(player_id: string): Promise<QueueStatusResponse> {
  const res = await axios.get<QueueStatusResponse>(`${API_BASE}/battle/queue/status`, {
    params: { player_id },
  });
  return res.data;
}

export async function getMatchState(
  matchId: string,
  playerId: string
): Promise<MatchState> {
  const res = await axios.get<MatchState>(`${API_BASE}/battle/${matchId}`, {
    params: { player_id: playerId },
  });
  return res.data;
}

export async function selectCategory(
  matchId: string,
  playerId: string,
  category: string
): Promise<MatchState> {
  const res = await axios.post<MatchState>(`${API_BASE}/battle/${matchId}/category`, {
    player_id: playerId,
    category,
  });
  return res.data;
}

export async function submitRound(
  matchId: string,
  playerId: string,
  answers: Record<string, string>
): Promise<MatchState> {
  const res = await axios.post<MatchState>(`${API_BASE}/battle/${matchId}/submit-round`, {
    player_id: playerId,
    answers,
  });
  return res.data;
}

export async function nextRound(
  matchId: string,
  playerId: string
): Promise<MatchState> {
  const res = await axios.post<MatchState>(`${API_BASE}/battle/${matchId}/next-round`, {
    player_id: playerId,
  });
  return res.data;
}
