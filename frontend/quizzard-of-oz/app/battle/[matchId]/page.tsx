'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getMatchState, selectCategory, submitRound, nextRound } from '../../lib/api/battle';
import { MatchState, RoundResult } from '../../lib/interfaces/Battle';

const ROUND_SECONDS = 20;

type ArenaState =
  | 'loading'
  | 'category_selection'
  | 'waiting_for_category'
  | 'in_round'
  | 'waiting_for_opponent'
  | 'round_complete'
  | 'match_complete'
  | 'error';

const GLASS = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(167,139,250,0.2)', backdropFilter: 'blur(12px)' } as const;
const PURPLE = { background: 'linear-gradient(135deg, rgba(139,92,246,0.8) 0%, rgba(99,102,241,0.8) 100%)', border: '1px solid rgba(167,139,250,0.4)', color: '#ede9fe', boxShadow: '0 8px 32px rgba(139,92,246,0.3)' } as const;

export default function BattleArena() {
  const { matchId } = useParams<{ matchId: string }>();
  const router = useRouter();

  const [match, setMatch] = useState<MatchState | null>(null);
  const [myKey, setMyKey] = useState<'p1' | 'p2' | null>(null);
  const [arenaState, setArenaState] = useState<ArenaState>('loading');

  // Lokale Runden-Antworten: {questionId: answer} — kein Server-Call pro Frage
  const [localAnswers, setLocalAnswers] = useState<Record<string, string>>({});
  // Ref-Sync: immer auf dem aktuellen Stand, kein Stale-Closure in doSubmit
  useEffect(() => { localAnswersRef.current = localAnswers; }, [localAnswers]);
  const [localQIndex, setLocalQIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [submitted, setSubmitted] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  const playerIdRef = useRef<string | null>(null);
  const pollNowRef = useRef<() => Promise<void>>(async () => {});
  const submitOnceRef = useRef(false); // verhindert Doppel-Submit
  // Ref hält immer die aktuellen localAnswers — verhindert Stale-Closure in doSubmit/setTimeout
  const localAnswersRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const pid = sessionStorage.getItem('battle_player_id');
    if (!pid) { router.replace('/battle'); return; }
    playerIdRef.current = pid;
  }, [router]);

  // ── Polling ───────────────────────────────────────────────────────────────
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

        if (prevRound !== null && state.current_round !== prevRound) {
          localAnswersRef.current = {};
          setLocalAnswers({});
          setLocalQIndex(0);
          setTimeLeft(ROUND_SECONDS);
          setSubmitted(false);
          submitOnceRef.current = false;
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
          // Wenn wir bereits submitted haben → waiting_for_opponent
          setArenaState(prev => prev === 'waiting_for_opponent' ? 'waiting_for_opponent' : 'in_round');
        } else if (state.status === 'category_selection') {
          setArenaState(state.category_picker === key ? 'category_selection' : 'waiting_for_category');
        }
      } catch {
        if (!stopped) { setArenaState('error'); stopped = true; if (intervalId) clearInterval(intervalId); }
      }
    };

    pollNowRef.current = poll;

    const init = async () => {
      for (let i = 0; i < 10 && !playerIdRef.current; i++) await new Promise(r => setTimeout(r, 20));
      if (stopped) return;
      await poll();
      if (!stopped) intervalId = setInterval(poll, 2000);
    };
    init();
    return () => { stopped = true; if (intervalId) clearInterval(intervalId); };
  }, [matchId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 20s Countdown (nur während in_round, vor Submit) ─────────────────────
  useEffect(() => {
    if (arenaState !== 'in_round' || submitted) return;
    if (timeLeft <= 0) {
      doSubmit();
      return;
    }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [arenaState, timeLeft, submitted]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Submit-Logik ──────────────────────────────────────────────────────────
  async function doSubmit() {
    if (submitOnceRef.current) return;
    submitOnceRef.current = true;
    const pid = playerIdRef.current;
    if (!pid || !match) return;
    setSubmitted(true);
    setArenaState('waiting_for_opponent');
    try {
      const state = await submitRound(matchId, pid, localAnswersRef.current);
      setMatch(state);
      const key = state.players.p1.id === pid ? 'p1' : 'p2';
      setMyKey(key);
      if (state.status === 'round_complete') setArenaState('round_complete');
      else if (state.status === 'match_complete') setArenaState('match_complete');
      // sonst bleibt waiting_for_opponent — Polling erkennt round_complete
    } catch {
      // Polling übernimmt
    }
  }

  function handleAnswer(answer: string, questionId: string) {
    if (submitted || localAnswers[questionId]) return;
    const updated = { ...localAnswers, [questionId]: answer };
    setLocalAnswers(updated);
    // Nächste Frage anzeigen nach kurzem Delay
    if (match && localQIndex < match.questions.length - 1) {
      setTimeout(() => setLocalQIndex(i => i + 1), 400);
    } else if (match && Object.keys(updated).length === match.questions.length) {
      // Alle beantwortet → sofort submitten
      setTimeout(() => doSubmit(), 400);
    }
  }

  async function handleCategorySelect(category: string) {
    const pid = playerIdRef.current;
    if (!pid) return;
    try {
      await selectCategory(matchId, pid, category);
      await pollNowRef.current();
    } catch { /* polling übernimmt */ }
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

  // ── Render ────────────────────────────────────────────────────────────────
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
    <div className="flex justify-between items-center rounded-xl px-4 py-3 mb-2" style={GLASS}>
      <div className="text-center flex-1">
        <p className="text-xs" style={{ color: 'rgba(196,181,253,0.5)' }}>You</p>
        <p className="font-bold text-sm" style={{ color: '#ede9fe' }}>{me.nickname}</p>
        <p className="text-2xl font-bold" style={{ color: 'rgba(139,92,246,0.9)' }}>{me.rounds_won}</p>
      </div>
      <div className="text-center px-4">
        <p className="text-xs" style={{ color: 'rgba(196,181,253,0.4)' }}>Round</p>
        <p className="text-xl font-bold" style={{ color: '#ede9fe' }}>{match.current_round}/5</p>
      </div>
      <div className="text-center flex-1">
        <p className="text-xs" style={{ color: 'rgba(196,181,253,0.5)' }}>Opponent</p>
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

  // ── In Round: 20s Timer + lokale Fragen ───────────────────────────────────
  if (arenaState === 'in_round') {
    const questions = match.questions;
    if (!questions.length) return <main className="flex items-center justify-center min-h-[calc(100vh-73px)]"><Spinner /></main>;

    const q = questions[localQIndex];
    const timerPct = (timeLeft / ROUND_SECONDS) * 100;
    const timerColor = timeLeft > 10 ? 'rgba(139,92,246,0.9)' : timeLeft > 5 ? 'rgba(251,191,36,0.9)' : 'rgba(239,68,68,0.9)';

    return (
      <main className="flex flex-col items-center justify-center min-h-[calc(100vh-73px)] px-4 py-8">
        <div className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-4" style={GLASS}>
          <Scoreboard />

          {/* Timer */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="h-2 rounded-full transition-all duration-1000" style={{ width: `${timerPct}%`, background: timerColor }} />
            </div>
            <span className="text-sm font-bold w-6 text-right" style={{ color: timerColor }}>{timeLeft}</span>
          </div>

          {/* Fragen-Punkte */}
          <div className="flex gap-2 justify-center">
            {questions.map((question, i) => (
              <div key={question.id} className="h-1.5 flex-1 rounded-full transition-all"
                style={{ background: localAnswers[question.id] ? 'rgba(139,92,246,0.8)' : i === localQIndex ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.1)' }} />
            ))}
          </div>
          <p className="text-xs text-center" style={{ color: 'rgba(196,181,253,0.4)' }}>
            {match.selected_category} · Question {localQIndex + 1}/{questions.length}
          </p>

          <p className="text-base font-medium text-center mt-1" style={{ color: '#ede9fe' }}>{q.text}</p>

          <div className="flex flex-col gap-3 mt-2">
            {q.answers.map(ans => {
              const chosen = localAnswers[q.id] === ans;
              return (
                <button key={ans} onClick={() => handleAnswer(ans, q.id)} disabled={!!localAnswers[q.id]}
                  className="rounded-xl px-4 py-3 text-sm text-left transition-all disabled:cursor-not-allowed"
                  style={chosen
                    ? { background: 'rgba(139,92,246,0.25)', border: '1px solid rgba(139,92,246,0.6)', color: '#ede9fe' }
                    : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(167,139,250,0.2)', color: '#ede9fe' }}>
                  {ans}
                </button>
              );
            })}
          </div>

          {/* Manueller Submit-Button wenn alle Fragen beantwortet */}
          {Object.keys(localAnswers).length === questions.length && (
            <button onClick={doSubmit} className="rounded-2xl py-3 font-semibold text-sm mt-1" style={PURPLE}>
              Submit Answers
            </button>
          )}
        </div>
      </main>
    );
  }

  // ── Waiting for Opponent ───────────────────────────────────────────────────
  if (arenaState === 'waiting_for_opponent') {
    return (
      <main className="flex flex-col items-center justify-center min-h-[calc(100vh-73px)] px-4">
        <div className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-4 items-center text-center" style={GLASS}>
          <Scoreboard />
          <Spinner />
          <p style={{ color: 'rgba(196,181,253,0.7)' }}>
            Waiting for <span style={{ color: '#ede9fe' }}>{opp.nickname}</span>…
          </p>
          <p className="text-xs" style={{ color: 'rgba(196,181,253,0.4)' }}>Your answers have been submitted</p>
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

          {match.questions.map(q => {
            const myAns = localAnswers[q.id] ?? null;
            const correct = myAns === q.correct_answer;
            return (
              <div key={q.id} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(167,139,250,0.1)' }}>
                <p className="text-xs mb-1" style={{ color: 'rgba(196,181,253,0.6)' }}>{q.text}</p>
                <p className="text-xs font-medium" style={{ color: correct ? '#86efac' : '#fca5a5' }}>
                  {correct ? '✓' : '✗'} {myAns ?? '(no answer)'}
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
