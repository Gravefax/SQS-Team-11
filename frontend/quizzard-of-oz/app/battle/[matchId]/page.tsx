'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getMatchState, selectCategory, submitAnswer, nextRound } from '../../lib/api/battle';
import { MatchState, RoundResult } from '../../lib/interfaces/Battle';

type ArenaState = 'loading' | 'category_selection' | 'waiting_for_category' | 'in_round' | 'round_complete' | 'match_complete' | 'error';

const GLASS = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(167,139,250,0.2)', backdropFilter: 'blur(12px)' } as const;
const PURPLE = { background: 'linear-gradient(135deg, rgba(139,92,246,0.8) 0%, rgba(99,102,241,0.8) 100%)', border: '1px solid rgba(167,139,250,0.4)', color: '#ede9fe', boxShadow: '0 8px 32px rgba(139,92,246,0.3)' } as const;

export default function BattleArena() {
  const { matchId } = useParams<{ matchId: string }>();
  const router = useRouter();

  const [match, setMatch] = useState<MatchState | null>(null);
  const [myKey, setMyKey] = useState<'p1' | 'p2' | null>(null);
  const [arenaState, setArenaState] = useState<ArenaState>('loading');
  // Lokal: welche Fragen hat dieser Spieler bereits beantwortet (für Button-Feedback)
  const [answeredMap, setAnsweredMap] = useState<Record<string, string>>({}); // questionId → chosen answer
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [advancing, setAdvancing] = useState(false);

  const playerIdRef = useRef<string | null>(null);
  const pollNowRef = useRef<() => Promise<void>>(async () => {});

  // sessionStorage → ref
  useEffect(() => {
    const pid = sessionStorage.getItem('battle_player_id');
    if (!pid) { router.replace('/battle'); return; }
    playerIdRef.current = pid;
  }, [router]);

  // Polling
  useEffect(() => {
    let stopped = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let prevRound: number | null = null;

    const poll = async () => {
      const pid = playerIdRef.current;
      if (!pid || stopped) return;
      try {
        const state = await getMatchState(matchId, pid);
        if (stopped) return;

        const key = state.players.p1.id === pid ? 'p1' : 'p2';
        setMyKey(key);

        // Rundenreset
        if (prevRound !== null && state.current_round !== prevRound) {
          setAnsweredMap({});
          setLastCorrect(null);
          setAdvancing(false);
        }
        prevRound = state.current_round;
        setMatch(state);

        if (state.status === 'match_complete') {
          setArenaState('match_complete');
          stopped = true;
          if (intervalId) clearInterval(intervalId);
        } else if (state.status === 'round_complete') {
          setArenaState('round_complete');
        } else if (state.status === 'in_round') {
          setArenaState('in_round');
        } else if (state.status === 'category_selection') {
          setArenaState(state.category_picker === key ? 'category_selection' : 'waiting_for_category');
        }
      } catch {
        if (!stopped) {
          setArenaState('error');
          stopped = true;
          if (intervalId) clearInterval(intervalId);
        }
      }
    };

    pollNowRef.current = poll;

    const init = async () => {
      for (let i = 0; i < 10 && !playerIdRef.current; i++) {
        await new Promise(r => setTimeout(r, 20));
      }
      if (stopped) return;
      await poll();
      if (!stopped) intervalId = setInterval(poll, 2000);
    };

    init();
    return () => { stopped = true; if (intervalId) clearInterval(intervalId); };
  }, [matchId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCategorySelect(category: string) {
    const pid = playerIdRef.current;
    if (!pid) return;
    try {
      await selectCategory(matchId, pid, category);
      await pollNowRef.current();
    } catch { /* polling übernimmt */ }
  }

  async function handleAnswer(answer: string, questionId: string) {
    const pid = playerIdRef.current;
    if (!pid || answeredMap[questionId]) return;
    // Optimistisch anzeigen
    setAnsweredMap(prev => ({ ...prev, [questionId]: answer }));
    try {
      const result = await submitAnswer(matchId, pid, questionId, answer);
      setLastCorrect(result.correct);
    } catch {
      setAnsweredMap(prev => { const s = { ...prev }; delete s[questionId]; return s; });
    }
  }

  async function handleNextRound() {
    const pid = playerIdRef.current;
    if (!pid || advancing) return;
    setAdvancing(true);
    try {
      await nextRound(matchId, pid);
      await pollNowRef.current();
      setAdvancing(false);
    } catch { setAdvancing(false); }
  }

  // ── Loading / Error ────────────────────────────────────────────────────────
  if (arenaState === 'loading' || !match || !myKey) {
    return <main className="flex items-center justify-center min-h-[calc(100vh-73px)]"><Spinner /></main>;
  }
  if (arenaState === 'error') {
    return (
      <main className="flex items-center justify-center min-h-[calc(100vh-73px)]">
        <div className="rounded-2xl p-8 text-center" style={GLASS}>
          <p className="text-lg mb-4" style={{ color: '#fca5a5' }}>Connection lost</p>
          <button onClick={() => router.push('/battle')} className="rounded-xl px-6 py-2 text-sm" style={PURPLE}>Back to Lobby</button>
        </div>
      </main>
    );
  }

  const oppKey: 'p1' | 'p2' = myKey === 'p1' ? 'p2' : 'p1';
  const me = match.players[myKey];
  const opp = match.players[oppKey];

  const Scoreboard = () => (
    <div className="flex justify-between items-center rounded-xl px-4 py-3 mb-4" style={GLASS}>
      <div className="text-center flex-1">
        <p className="text-xs mb-1" style={{ color: 'rgba(196,181,253,0.5)' }}>You</p>
        <p className="font-bold text-sm" style={{ color: '#ede9fe' }}>{me.nickname}</p>
        <p className="text-2xl font-bold" style={{ color: 'rgba(139,92,246,0.9)' }}>{me.rounds_won}</p>
      </div>
      <div className="text-center px-4">
        <p className="text-xs" style={{ color: 'rgba(196,181,253,0.4)' }}>Round</p>
        <p className="text-xl font-bold" style={{ color: '#ede9fe' }}>{match.current_round}/5</p>
      </div>
      <div className="text-center flex-1">
        <p className="text-xs mb-1" style={{ color: 'rgba(196,181,253,0.5)' }}>Opponent</p>
        <p className="font-bold text-sm" style={{ color: '#ede9fe' }}>{opp.nickname}</p>
        <p className="text-2xl font-bold" style={{ color: 'rgba(139,92,246,0.9)' }}>{opp.rounds_won}</p>
      </div>
    </div>
  );

  // ── Category Selection ─────────────────────────────────────────────────────
  if (arenaState === 'category_selection') {
    return (
      <main className="flex flex-col items-center justify-center min-h-[calc(100vh-73px)] px-4 py-8">
        <div className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-4" style={GLASS}>
          <Scoreboard />
          <p className="text-center text-sm" style={{ color: 'rgba(196,181,253,0.6)' }}>Pick a category for Round {match.current_round}</p>
          {match.category_options.map(cat => (
            <button key={cat} onClick={() => handleCategorySelect(cat)} className="rounded-2xl py-4 font-semibold text-sm hover:scale-[1.02] transition-all" style={PURPLE}>{cat}</button>
          ))}
        </div>
      </main>
    );
  }

  // ── Waiting for Category ───────────────────────────────────────────────────
  if (arenaState === 'waiting_for_category') {
    return (
      <main className="flex flex-col items-center justify-center min-h-[calc(100vh-73px)] px-4">
        <div className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-4 items-center text-center" style={GLASS}>
          <Scoreboard />
          <Spinner />
          <p style={{ color: 'rgba(196,181,253,0.7)' }}><span style={{ color: '#ede9fe' }}>{opp.nickname}</span> is picking a category…</p>
        </div>
      </main>
    );
  }

  // ── In Round ──────────────────────────────────────────────────────────────
  if (arenaState === 'in_round') {
    const question = match.questions[match.current_question_index];

    // Fragen noch nicht geladen (kurz nach Kategorie-Wahl)
    if (!question) {
      return (
        <main className="flex flex-col items-center justify-center min-h-[calc(100vh-73px)] px-4">
          <div className="w-full max-w-md rounded-2xl p-6 flex flex-col items-center gap-4" style={GLASS}>
            <Scoreboard />
            <Spinner />
            <p style={{ color: 'rgba(196,181,253,0.6)' }}>Loading questions…</p>
          </div>
        </main>
      );
    }

    const myAnswer = answeredMap[question.id];
    const answered = !!myAnswer;

    return (
      <main className="flex flex-col items-center justify-center min-h-[calc(100vh-73px)] px-4 py-8">
        <div className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-4" style={GLASS}>
          <Scoreboard />

          {/* Fortschritt */}
          <div className="flex gap-2 mb-1">
            {match.questions.map((_, i) => (
              <div key={i} className="h-1.5 flex-1 rounded-full transition-all"
                style={{ background: i < match.current_question_index ? 'rgba(139,92,246,0.8)' : i === match.current_question_index ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.1)' }} />
            ))}
          </div>
          <p className="text-xs text-center" style={{ color: 'rgba(196,181,253,0.4)' }}>
            Question {match.current_question_index + 1} / {match.questions.length}
          </p>

          <p className="text-base font-medium text-center mt-1" style={{ color: '#ede9fe' }}>{question.text}</p>

          <div className="flex flex-col gap-3 mt-2">
            {question.answers.map(ans => {
              const isChosen = myAnswer === ans;
              const style = answered
                ? isChosen
                  ? lastCorrect
                    ? { background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.5)', color: '#86efac' }
                    : { background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.5)', color: '#fca5a5' }
                  : { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(167,139,250,0.1)', color: 'rgba(196,181,253,0.4)' }
                : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(167,139,250,0.2)', color: '#ede9fe' };
              return (
                <button key={ans} onClick={() => handleAnswer(ans, question.id)} disabled={answered}
                  className="rounded-xl px-4 py-3 text-sm text-left transition-all disabled:cursor-not-allowed" style={style}>
                  {ans}
                </button>
              );
            })}
          </div>

          {answered && (
            <p className="text-xs text-center mt-1" style={{ color: 'rgba(196,181,253,0.5)' }}>
              Waiting for {opp.nickname}…
            </p>
          )}
        </div>
      </main>
    );
  }

  // ── Round Complete ─────────────────────────────────────────────────────────
  if (arenaState === 'round_complete') {
    const last: RoundResult | undefined = match.round_results[match.round_results.length - 1];
    const iWon = last?.winner === myKey;
    const isTie = !last?.winner;
    const myScore = last?.[myKey === 'p1' ? 'p1_score' : 'p2_score'] ?? 0;
    const oppScore = last?.[oppKey === 'p1' ? 'p1_score' : 'p2_score'] ?? 0;

    return (
      <main className="flex flex-col items-center justify-center min-h-[calc(100vh-73px)] px-4 py-8">
        <div className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-4" style={GLASS}>
          <Scoreboard />

          <div className="rounded-xl py-3 px-4 text-center" style={{
            background: isTie ? 'rgba(255,255,255,0.05)' : iWon ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${isTie ? 'rgba(255,255,255,0.1)' : iWon ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}>
            <p className="font-bold text-lg" style={{ color: isTie ? '#ede9fe' : iWon ? '#86efac' : '#fca5a5' }}>
              {isTie ? "It's a tie!" : iWon ? 'You won this round! 🎉' : `${opp.nickname} won this round`}
            </p>
            <p className="text-xs mt-1" style={{ color: 'rgba(196,181,253,0.5)' }}>
              {me.nickname} {myScore} – {oppScore} {opp.nickname}
            </p>
          </div>

          {/* Fragen-Auflösung */}
          {match.questions.map(q => {
            const myAns = match.answers[q.id]?.[myKey] ?? null;
            const correct = myAns === q.correct_answer;
            return (
              <div key={q.id} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(167,139,250,0.1)' }}>
                <p className="text-xs mb-1" style={{ color: 'rgba(196,181,253,0.6)' }}>{q.text}</p>
                <p className="text-xs font-medium" style={{ color: correct ? '#86efac' : '#fca5a5' }}>
                  {correct ? '✓' : '✗'} {myAns ?? '—'}
                </p>
                {!correct && q.correct_answer && (
                  <p className="text-xs" style={{ color: '#86efac' }}>✓ {q.correct_answer}</p>
                )}
              </div>
            );
          })}

          {match.current_round < 5
            ? <button onClick={handleNextRound} disabled={advancing} className="rounded-2xl py-4 font-semibold text-sm disabled:opacity-50" style={PURPLE}>{advancing ? 'Loading…' : 'Next Round →'}</button>
            : <p className="text-xs text-center" style={{ color: 'rgba(196,181,253,0.5)' }}>Calculating result…</p>
          }
        </div>
      </main>
    );
  }

  // ── Match Complete ─────────────────────────────────────────────────────────
  if (arenaState === 'match_complete') {
    const iWon = match.winner === myKey;
    const isDraw = match.winner === 'draw';
    return (
      <main className="flex flex-col items-center justify-center min-h-[calc(100vh-73px)] px-4 py-8">
        <div className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-4" style={GLASS}>
          <div className="text-center py-4">
            <p className="text-5xl mb-3">{isDraw ? '🤝' : iWon ? '🏆' : '😔'}</p>
            <h2 className="text-2xl font-bold mb-1" style={{ color: isDraw ? '#ede9fe' : iWon ? '#86efac' : '#fca5a5' }}>
              {isDraw ? 'Draw!' : iWon ? 'You Win!' : `${opp.nickname} Wins!`}
            </h2>
            <p className="text-sm" style={{ color: 'rgba(196,181,253,0.5)' }}>{me.nickname} {me.rounds_won} – {opp.rounds_won} {opp.nickname}</p>
          </div>

          {match.round_results.map(r => {
            const iWonR = r.winner === myKey;
            const tie = !r.winner;
            return (
              <div key={r.round} className="flex items-center justify-between rounded-xl px-3 py-2 text-xs" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(167,139,250,0.1)' }}>
                <span style={{ color: 'rgba(196,181,253,0.5)' }}>R{r.round} · {r.category}</span>
                <span style={{ color: tie ? '#ede9fe' : iWonR ? '#86efac' : '#fca5a5', fontWeight: 600 }}>
                  {tie ? 'Tie' : iWonR ? 'Won' : 'Lost'} ({r[myKey === 'p1' ? 'p1_score' : 'p2_score']}–{r[oppKey === 'p1' ? 'p1_score' : 'p2_score']})
                </span>
              </div>
            );
          })}

          <div className="flex gap-3">
            <button onClick={() => { sessionStorage.removeItem('battle_player_id'); router.push('/battle'); }} className="flex-1 rounded-2xl py-3 font-semibold text-sm" style={PURPLE}>Play Again</button>
            <button onClick={() => { sessionStorage.removeItem('battle_player_id'); router.push('/'); }} className="flex-1 rounded-2xl py-3 text-sm" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(167,139,250,0.2)', color: 'rgba(196,181,253,0.7)' }}>Home</button>
          </div>
        </div>
      </main>
    );
  }

  return null;
}

function Spinner() {
  return <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: 'rgba(139,92,246,0.3)', borderTopColor: 'rgba(139,92,246,0.9)' }} />;
}
