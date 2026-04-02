'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AnswerResultData, GameOverData, PlayerInfo, QuestionData, RoundOutcomeMeta, RoundResultData, ScoreInfo } from '../lib/interfaces/battle/BattleInterfaces';
import { Phase } from '../lib/interfaces/battle/Phase';

// ── Helpers ────────────────────────────────────────────────────────────── //

function answerTextColor(isCorrect: boolean, isWrong: boolean): string {
  if (isCorrect) return 'rgba(0,255,120,0.92)';
  if (isWrong)   return 'rgba(255,110,70,0.85)';
  return 'rgba(200,225,245,0.85)';
}

function getWsUrl(path: string): string {
  const wsBaseFromEnv = process.env.NEXT_PUBLIC_WS_BASE;
  if (wsBaseFromEnv) {
    return `${wsBaseFromEnv.replace(/\/$/, '')}${path}`;
  }

  const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000';
  if (apiBase.startsWith('/')) {
    const protocol = globalThis.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${globalThis.location.host}${apiBase}${path}`;
  }

  const wsBase = apiBase.replace(/^https/, 'wss').replace(/^http/, 'ws');
  return `${wsBase}${path}`;
}

function getRoundOutcomeMeta(outcome: RoundResultData['outcome']): RoundOutcomeMeta {
  if (outcome === 'win') {
    return { color: '#FFD200', cssClass: 'outcome-win', label: 'RUNDE GEWONNEN' };
  }
  if (outcome === 'loss') {
    return { color: 'rgba(255,100,60,0.85)', cssClass: 'outcome-loss', label: 'RUNDE VERLOREN' };
  }
  return { color: 'rgba(140,200,230,0.8)', cssClass: '', label: 'UNENTSCHIEDEN' };
}

// ── Component ──────────────────────────────────────────────────────────── //

interface BattleArenaProps {
  readonly matchId: string;
}

// ROUNDS_TO_WIN is always 3 — fixed slots avoid array-index keys
const STAR_SLOTS = ['slot-1', 'slot-2', 'slot-3'] as const;

export default function BattleArena({ matchId }: BattleArenaProps) {
  const router = useRouter();

  const [phase,          setPhase]          = useState<Phase>('connecting');
  const [player,         setPlayer]         = useState<PlayerInfo | null>(null);
  const [scores,         setScores]         = useState<ScoreInfo>({ yourWins: 0, opponentWins: 0 });
  const [categories,     setCategories]     = useState<string[]>([]);
  const [chosenCategory, setChosenCategory] = useState('');
  const [currentRound,   setCurrentRound]   = useState(1);
  const [question,       setQuestion]       = useState<QuestionData | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerResult,   setAnswerResult]   = useState<AnswerResultData | null>(null);
  const [roundResult,    setRoundResult]    = useState<RoundResultData | null>(null);
  const [gameOver,       setGameOver]       = useState<GameOverData | null>(null);
  const [nextPicker,     setNextPicker]     = useState('');
  const [timeLeft,       setTimeLeft]       = useState(20);
  const [errorMsg,       setErrorMsg]       = useState('');
  const [pickerName,     setPickerName]     = useState('');

  const wsRef     = useRef<WebSocket | null>(null);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef  = useRef<Phase>('connecting');

  phaseRef.current = phase;

  // ── Timer ────────────────────────────────────────────────────────────── //

  function startTimer(seconds: number) {
    setTimeLeft(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  // ── WebSocket ────────────────────────────────────────────────────────── //

  const send = useCallback((data: object) => {
    wsRef.current?.send(JSON.stringify(data));
  }, []);

  useEffect(() => {
    const ws = new WebSocket(getWsUrl(`/battle/ws/${matchId}`));
    wsRef.current = ws;

    ws.onmessage = (event: MessageEvent) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg: Record<string, any> = JSON.parse(event.data as string);

      switch (msg.type) {
        case 'waiting_for_opponent':
          setPhase('waiting_for_opponent');
          break;

        case 'match_ready':
          setPlayer({
            yourUsername:     msg.your_username,
            opponentUsername: msg.opponent_username,
            youPickFirst:     msg.you_pick_first,
            roundsToWin:      msg.rounds_to_win,
          });
          setScores({ yourWins: 0, opponentWins: 0 });
          break;

        case 'pick_category':
          stopTimer();
          setCategories(msg.categories as string[]);
          setCurrentRound(msg.round as number);
          setScores({ yourWins: msg.your_wins as number, opponentWins: msg.opponent_wins as number });
          setPhase('pick_category');
          break;

        case 'waiting_for_category':
          stopTimer();
          setCurrentRound(msg.round as number);
          setScores({ yourWins: msg.your_wins as number, opponentWins: msg.opponent_wins as number });
          setPickerName(msg.picker_username as string);
          setPhase('waiting_for_category');
          break;

        case 'category_chosen':
          setChosenCategory(msg.category as string);
          setPhase('category_chosen');
          break;

        case 'question':
          stopTimer();
          setQuestion({
            questionNumber: msg.question_number as number,
            totalQuestions: msg.total_questions as number,
            questionId:     msg.question_id as string,
            text:           msg.text as string,
            answers:        msg.answers as string[],
            category:       msg.category as string,
          });
          setSelectedAnswer(null);
          setAnswerResult(null);
          setPhase('question');
          startTimer(20);
          break;

        case 'answer_result':
          stopTimer();
          setAnswerResult({
            correct:            msg.correct as boolean,
            correctAnswer:      msg.correct_answer as string,
            yourScoreThisRound: msg.your_score_this_round as number,
          });
          setPhase('answered');
          break;

        case 'round_result':
          stopTimer();
          setRoundResult({
            round:             msg.round as number,
            outcome:           msg.outcome as 'win' | 'loss' | 'tie',
            yourScore:         msg.your_score as number,
            opponentScore:     msg.opponent_score as number,
            yourTotalWins:     msg.your_total_wins as number,
            opponentTotalWins: msg.opponent_total_wins as number,
            nextPicker:        msg.next_picker as string,
            gameOver:          msg.game_over as boolean,
          });
          setScores({ yourWins: msg.your_total_wins as number, opponentWins: msg.opponent_total_wins as number });
          setNextPicker(msg.next_picker as string);
          setPhase('round_result');
          break;

        case 'game_over':
          stopTimer();
          setGameOver({
            winner:       msg.winner as string,
            youWon:       msg.you_won as boolean,
            yourWins:     msg.your_wins as number,
            opponentWins: msg.opponent_wins as number,
          });
          setPhase('game_over');
          break;

        case 'opponent_disconnected':
          stopTimer();
          setPhase('opponent_disconnected');
          break;
      }
    };

    ws.onclose = (event: CloseEvent) => {
      if (phaseRef.current === 'game_over' || phaseRef.current === 'opponent_disconnected') return;
      if (event.code === 4001 || event.code === 4003) {
        setErrorMsg('Login erforderlich.');
        setPhase('error');
      } else if (event.code !== 1000) {
        setErrorMsg('Verbindung unterbrochen.');
        setPhase('error');
      }
    };

    return () => {
      stopTimer();
      ws.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  // ── Actions ──────────────────────────────────────────────────────────── //

  function pickCategory(cat: string) {
    send({ type: 'pick_category', category: cat });
  }

  function submitAnswer(answer: string) {
    if (!question || selectedAnswer) return;
    setSelectedAnswer(answer);
    send({ type: 'answer', question_id: question.questionId, answer });
  }

  // ── Render helpers ───────────────────────────────────────────────────── //

  return (
    <>
      <style>{`
        @keyframes arenaReveal {
          0%   { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes spinSlow {
          to { transform: rotate(360deg); }
        }
        @keyframes timerShrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
        @keyframes popIn {
          0%   { opacity: 0; transform: scale(0.88); }
          60%  { transform: scale(1.04); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes correctFlash {
          0%,100% { box-shadow: 0 0 0px rgba(0,255,120,0); }
          40%     { box-shadow: 0 0 28px rgba(0,255,120,0.55), 0 0 60px rgba(0,255,120,0.2); }
        }
        @keyframes wrongFlash {
          0%,100% { box-shadow: 0 0 0px rgba(255,60,20,0); }
          40%     { box-shadow: 0 0 28px rgba(255,60,20,0.55), 0 0 60px rgba(255,60,20,0.2); }
        }
        @keyframes winGlow {
          0%,100% { text-shadow: 0 0 20px rgba(255,200,0,0.5), 0 0 50px rgba(255,200,0,0.2); }
          50%     { text-shadow: 0 0 40px rgba(255,200,0,0.9), 0 0 90px rgba(255,200,0,0.4); }
        }
        @keyframes lossShake {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-5px); }
          40%     { transform: translateX(5px); }
          60%     { transform: translateX(-3px); }
          80%     { transform: translateX(3px); }
        }
        @keyframes scanDown {
          0%   { top: -2px; opacity: 0; }
          5%   { opacity: 1; }
          95%  { opacity: 0.4; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes starPop {
          0%   { transform: scale(0) rotate(-30deg); opacity: 0; }
          60%  { transform: scale(1.3) rotate(5deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes categoryHover {
          0%,100% { border-color: rgba(255,60,20,0.3); background: rgba(255,60,20,0.05); }
          50%     { border-color: rgba(255,60,20,0.7); background: rgba(255,60,20,0.12); }
        }
        @keyframes roundBanner {
          0%   { opacity: 0; transform: scaleX(0.6) translateY(-8px); }
          60%  { transform: scaleX(1.02) translateY(0); }
          100% { opacity: 1; transform: scaleX(1) translateY(0); }
        }

        .arena-wrap {
          min-height: calc(100vh - 73px);
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }

        /* Background grid */
        .arena-wrap::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(0,212,255,0.022) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,212,255,0.022) 1px, transparent 1px);
          background-size: 56px 56px;
          pointer-events: none;
        }

        .scan-line {
          position: absolute; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,60,20,0.22) 30%, rgba(255,60,20,0.22) 70%, transparent);
          animation: scanDown 11s linear 1s infinite;
          pointer-events: none;
          z-index: 0;
        }

        /* Score Header */
        .score-header {
          position: relative; z-index: 2;
          display: flex; align-items: stretch;
          border-bottom: 1px solid rgba(255,60,20,0.14);
          background: rgba(5,8,15,0.85);
          backdrop-filter: blur(12px);
        }
        .score-player {
          flex: 1; padding: 12px 20px;
          display: flex; flex-direction: column; gap: 4px;
        }
        .score-player.right { align-items: flex-end; }
        .score-divider {
          width: 1px;
          background: linear-gradient(to bottom, transparent, rgba(255,60,20,0.4), transparent);
        }
        .score-center {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 8px 20px; gap: 2px;
        }
        .username {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.78rem; font-weight: 600;
          letter-spacing: 0.08em; text-transform: uppercase;
          color: rgba(160,215,240,0.7);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          max-width: 140px;
        }
        .win-stars {
          display: flex; gap: 5px;
        }
        .win-star {
          font-size: 1rem; line-height: 1;
          transition: all 0.3s ease;
        }
        .win-star.earned {
          color: rgba(255,200,0,0.9);
          filter: drop-shadow(0 0 6px rgba(255,200,0,0.5));
          animation: starPop 0.4s cubic-bezier(0.22,1,0.36,1) both;
        }
        .win-star.empty { color: rgba(255,255,255,0.1); }

        /* Corner decorations */
        .corner-tl, .corner-tr, .corner-bl, .corner-br {
          position: absolute; width: 22px; height: 22px;
          pointer-events: none; z-index: 1;
        }
        .corner-tl { top: 8px; left: 8px; border-top: 2px solid rgba(255,60,20,0.3); border-left: 2px solid rgba(255,60,20,0.3); }
        .corner-tr { top: 8px; right: 8px; border-top: 2px solid rgba(255,60,20,0.3); border-right: 2px solid rgba(255,60,20,0.3); }
        .corner-bl { bottom: 8px; left: 8px; border-bottom: 2px solid rgba(255,60,20,0.3); border-left: 2px solid rgba(255,60,20,0.3); }
        .corner-br { bottom: 8px; right: 8px; border-bottom: 2px solid rgba(255,60,20,0.3); border-right: 2px solid rgba(255,60,20,0.3); }

        /* Main content */
        .arena-body {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 24px 16px; position: relative; z-index: 1;
        }

        /* Category buttons */
        .category-btn {
          background: rgba(255,60,20,0.05);
          border: 1px solid rgba(255,60,20,0.28);
          border-radius: 0.875rem;
          padding: 18px 28px;
          text-align: center; width: 100%;
          transition: all 0.18s ease;
          cursor: pointer;
          position: relative; overflow: hidden;
        }
        .category-btn::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, rgba(255,60,20,0.7), transparent);
          opacity: 0; transition: opacity 0.18s ease;
        }
        .category-btn:hover {
          background: rgba(255,60,20,0.14);
          border-color: rgba(255,90,40,0.7);
          transform: translateY(-3px);
          box-shadow: 0 12px 32px rgba(255,60,20,0.15);
        }
        .category-btn:hover::before { opacity: 1; }

        /* Answer buttons */
        .answer-btn {
          background: rgba(0,212,255,0.04);
          border: 1px solid rgba(0,212,255,0.18);
          border-radius: 0.875rem;
          padding: 14px 20px;
          text-align: left; width: 100%;
          transition: all 0.15s ease;
          cursor: pointer;
          display: flex; align-items: center; gap: 14px;
          position: relative; overflow: hidden;
        }
        .answer-btn:hover:not(:disabled) {
          background: rgba(0,212,255,0.1);
          border-color: rgba(0,212,255,0.55);
          transform: translateX(4px);
        }
        .answer-btn:disabled { cursor: default; }
        .answer-btn.selected {
          background: rgba(0,212,255,0.1);
          border-color: rgba(0,212,255,0.6);
        }
        .answer-btn.correct {
          background: rgba(0,255,120,0.1);
          border-color: rgba(0,255,120,0.65);
          animation: correctFlash 0.6s ease;
        }
        .answer-btn.wrong {
          background: rgba(255,60,20,0.1);
          border-color: rgba(255,60,20,0.6);
          animation: wrongFlash 0.6s ease;
        }
        .answer-key {
          width: 28px; height: 28px; border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em;
          flex-shrink: 0;
          background: rgba(0,212,255,0.08);
          border: 1px solid rgba(0,212,255,0.2);
          color: rgba(0,212,255,0.7);
          transition: all 0.15s ease;
        }
        .answer-btn.correct .answer-key {
          background: rgba(0,255,120,0.15);
          border-color: rgba(0,255,120,0.5);
          color: rgba(0,255,120,0.9);
        }
        .answer-btn.wrong .answer-key {
          background: rgba(255,60,20,0.15);
          border-color: rgba(255,60,20,0.5);
          color: rgba(255,90,50,0.9);
        }
        .answer-btn:hover:not(:disabled) .answer-key {
          background: rgba(0,212,255,0.18);
          border-color: rgba(0,212,255,0.55);
          color: rgba(0,212,255,0.95);
        }

        /* Timer bar */
        .timer-bar-track {
          height: 3px; border-radius: 2px;
          background: rgba(255,255,255,0.07);
          overflow: hidden; position: relative;
        }
        .timer-bar-fill {
          height: 100%; border-radius: 2px;
          transition: width 1s linear, background 1s linear;
        }

        /* Round result panel */
        .round-panel {
          animation: roundBanner 0.5s cubic-bezier(0.22,1,0.36,1) both;
        }
        .outcome-win {
          animation: winGlow 2s ease-in-out infinite;
        }
        .outcome-loss {
          animation: lossShake 0.5s ease both;
        }

        .arena-card {
          background: rgba(8,15,28,0.8);
          border: 1px solid rgba(255,60,20,0.18);
          border-radius: 1.25rem;
          backdrop-filter: blur(16px);
          position: relative;
          overflow: hidden;
        }
        .arena-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, rgba(255,60,20,0.6), transparent);
        }

        .reveal { animation: arenaReveal 0.45s cubic-bezier(0.22,1,0.36,1) both; }
        .pop-in { animation: popIn 0.4s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      <div className="arena-wrap">
        <div className="scan-line" />
        <div className="corner-tl" /><div className="corner-tr" />
        <div className="corner-bl" /><div className="corner-br" />

        {/* ── Score Header ── */}
        {player && phase !== 'connecting' && phase !== 'waiting_for_opponent' && (
          <div className="score-header">
            {/* You */}
            <div className="score-player">
              <div className="username">{player.yourUsername}</div>
              <div className="win-stars">
                {STAR_SLOTS.map((slotId, i) => (
                  <span
                    key={slotId}
                    className={`win-star ${i < scores.yourWins ? 'earned' : 'empty'}`}
                    style={i < scores.yourWins ? { animationDelay: `${i * 0.12}s` } : {}}
                  >★</span>
                ))}
              </div>
            </div>

            {/* Center */}
            <div className="score-center">
              <div style={{ color: 'rgba(255,60,20,0.9)', fontSize: '0.6rem', letterSpacing: '0.2em', fontWeight: 700 }}>
                RUNDE
              </div>
              <div style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: '1.6rem', letterSpacing: '0.08em',
                color: '#FFD0B0', lineHeight: 1,
              }}>
                {currentRound}
              </div>
            </div>

            <div className="score-divider" />

            {/* Opponent */}
            <div className="score-player right">
              <div className="username">{player.opponentUsername}</div>
              <div className="win-stars" style={{ justifyContent: 'flex-end' }}>
                {STAR_SLOTS.map((slotId, i) => (
                  <span
                    key={slotId}
                    className={`win-star ${i < scores.opponentWins ? 'earned' : 'empty'}`}
                    style={i < scores.opponentWins ? { animationDelay: `${i * 0.12}s` } : {}}
                  >★</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Body ── */}
        <div className="arena-body">

          {/* CONNECTING */}
          {phase === 'connecting' && (
            <div className="flex flex-col items-center gap-5 reveal">
              <div style={{
                width: '48px', height: '48px',
                border: '3px solid rgba(255,60,20,0.12)',
                borderTop: '3px solid rgba(255,60,20,0.85)',
                borderRadius: '50%',
                animation: 'spinSlow 0.9s linear infinite',
              }} />
              <div style={{ color: 'rgba(140,200,230,0.5)', fontSize: '0.88rem', letterSpacing: '0.08em' }}>
                Verbinde mit Battle...
              </div>
            </div>
          )}

          {/* WAITING FOR OPPONENT */}
          {phase === 'waiting_for_opponent' && (
            <div className="flex flex-col items-center gap-5 reveal">
              <div style={{
                width: '48px', height: '48px',
                border: '3px solid rgba(255,60,20,0.12)',
                borderTop: '3px solid rgba(255,60,20,0.85)',
                borderRadius: '50%',
                animation: 'spinSlow 0.9s linear infinite',
              }} />
              <div style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: '1.6rem', letterSpacing: '0.12em', color: 'rgba(160,215,240,0.8)',
              }}>Warte auf Gegner</div>
            </div>
          )}

          {/* PICK CATEGORY */}
          {phase === 'pick_category' && (
            <div className="flex flex-col items-center gap-6 w-full max-w-md reveal">
              <div className="text-center">
                <div style={{ color: 'rgba(255,60,20,0.7)', fontSize: '0.65rem', letterSpacing: '0.25em', marginBottom: '6px' }}>
                  DU WÄHLST
                </div>
                <div style={{
                  fontFamily: "'Bebas Neue', Impact, sans-serif",
                  fontSize: '2rem', letterSpacing: '0.1em', color: '#FFD0B0',
                }}>
                  Wähle eine Kategorie
                </div>
                <div style={{ color: 'rgba(140,200,230,0.4)', fontSize: '0.75rem', marginTop: '4px' }}>
                  Die Kategorie bestimmt deine {3} Fragen
                </div>
              </div>

              <div className="flex flex-col gap-3 w-full">
                {categories.map((cat, i) => (
                  <button
                    key={cat}
                    className="category-btn"
                    style={{ animationDelay: `${i * 0.08}s` }}
                    onClick={() => pickCategory(cat)}
                  >
                    <div style={{
                      fontFamily: "'Bebas Neue', Impact, sans-serif",
                      fontSize: '1.4rem', letterSpacing: '0.12em', color: '#FFCDB0',
                    }}>{cat}</div>
                    <div style={{ color: 'rgba(255,140,90,0.45)', fontSize: '0.68rem', letterSpacing: '0.1em', marginTop: '2px' }}>
                      Kategorie auswählen
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* WAITING FOR CATEGORY */}
          {phase === 'waiting_for_category' && (
            <div className="flex flex-col items-center gap-5 reveal">
              <div style={{
                fontSize: '2.8rem',
                filter: 'drop-shadow(0 0 14px rgba(255,200,0,0.3))',
                animation: 'spinSlow 3s linear infinite',
              }}>⚔</div>
              <div style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: '1.6rem', letterSpacing: '0.1em', color: 'rgba(160,215,240,0.8)',
              }}>
                {pickerName} wählt Kategorie
              </div>
              <div style={{ color: 'rgba(140,200,230,0.35)', fontSize: '0.75rem', letterSpacing: '0.08em' }}>
                Warte auf Auswahl...
              </div>
            </div>
          )}

          {/* CATEGORY CHOSEN */}
          {phase === 'category_chosen' && (
            <div className="flex flex-col items-center gap-4 pop-in">
              <div style={{ color: 'rgba(255,60,20,0.65)', fontSize: '0.65rem', letterSpacing: '0.25em' }}>
                KATEGORIE
              </div>
              <div style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: '3.5rem', letterSpacing: '0.06em', color: '#FFCDB0',
                textShadow: '0 0 30px rgba(255,60,20,0.3)',
              }}>
                {chosenCategory}
              </div>
              <div style={{ color: 'rgba(140,200,230,0.45)', fontSize: '0.8rem' }}>
                Bereite dich vor...
              </div>
            </div>
          )}

          {/* QUESTION */}
          {(phase === 'question' || phase === 'answered') && question && (
            <div className="flex flex-col gap-5 w-full max-w-lg reveal">

              {/* Question header */}
              <div className="flex items-center justify-between">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    background: 'rgba(255,60,20,0.1)', border: '1px solid rgba(255,60,20,0.3)',
                    borderRadius: '6px', padding: '2px 8px',
                    color: 'rgba(255,130,80,0.8)', fontSize: '0.65rem', letterSpacing: '0.12em', fontWeight: 700,
                  }}>
                    {question.category.toUpperCase()}
                  </div>
                  <div style={{ color: 'rgba(140,200,230,0.38)', fontSize: '0.68rem', letterSpacing: '0.1em' }}>
                    {question.questionNumber} / {question.totalQuestions}
                  </div>
                </div>
                {/* Timer */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    fontFamily: "'Bebas Neue', Impact, sans-serif",
                    fontSize: '1.4rem', letterSpacing: '0.1em',
                    color: timeLeft <= 5 ? 'rgba(255,60,20,0.9)' : 'rgba(0,212,255,0.7)',
                  }}>{timeLeft}</div>
                </div>
              </div>

              {/* Timer bar */}
              <div className="timer-bar-track">
                <div
                  className="timer-bar-fill"
                  style={{
                    width: `${(timeLeft / 20) * 100}%`,
                    background: timeLeft <= 5
                      ? 'linear-gradient(90deg, rgba(255,60,20,0.9), rgba(255,100,40,0.9))'
                      : 'linear-gradient(90deg, rgba(0,212,255,0.8), rgba(0,180,220,0.8))',
                  }}
                />
              </div>

              {/* Question text */}
              <div className="arena-card" style={{ padding: '20px 24px' }}>
                <div style={{
                  fontSize: '1.05rem', fontWeight: 500, lineHeight: 1.55,
                  color: 'rgba(220,235,248,0.9)',
                }}>
                  {question.text}
                </div>
              </div>

              {/* Answers */}
              <div className="flex flex-col gap-2.5">
                {question.answers.map((ans, i) => {
                  const keys = ['A', 'B', 'C', 'D'];
                  const isSelected = selectedAnswer === ans;
                  const showResult = phase === 'answered' && answerResult;
                  const isCorrect  = showResult && ans === answerResult?.correctAnswer;
                  const isWrong    = showResult && isSelected && !answerResult?.correct;

                  return (
                    <button
                      key={ans}
                      className={`answer-btn ${isSelected ? 'selected' : ''} ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`}
                      disabled={!!selectedAnswer}
                      onClick={() => submitAnswer(ans)}
                      style={{ animationDelay: `${i * 0.06}s` }}
                    >
                      <span className="answer-key">{keys[i]}</span>
                      <span style={{
                        fontSize: '0.9rem', fontWeight: 500,
                        color: answerTextColor(!!isCorrect, !!isWrong),
                      }}>
                        {ans}
                      </span>
                      {isCorrect && (
                        <span style={{ marginLeft: 'auto', color: 'rgba(0,255,120,0.8)', fontSize: '1rem' }}>✓</span>
                      )}
                      {isWrong && (
                        <span style={{ marginLeft: 'auto', color: 'rgba(255,90,50,0.8)', fontSize: '1rem' }}>✗</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Answered status */}
              {phase === 'answered' && (
                <div style={{
                  textAlign: 'center',
                  color: 'rgba(140,200,230,0.4)', fontSize: '0.75rem', letterSpacing: '0.1em',
                }}>
                  {answerResult?.correct
                    ? '✓ Richtig! Warte auf Gegner...'
                    : '✗ Falsch. Warte auf Gegner...'
                  }
                </div>
              )}
            </div>
          )}

          {/* ROUND RESULT */}
          {phase === 'round_result' && roundResult && player && (() => {
            const outcomeMeta = getRoundOutcomeMeta(roundResult.outcome);
            return (
            <div className="flex flex-col items-center gap-6 w-full max-w-md round-panel">

              {/* Outcome headline */}
              <div
                style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '3.2rem', letterSpacing: '0.1em', lineHeight: 1, color: outcomeMeta.color }}
                className={outcomeMeta.cssClass}
              >
                {outcomeMeta.label}
              </div>

              {/* Score comparison */}
              <div className="arena-card w-full" style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ color: 'rgba(140,200,230,0.5)', fontSize: '0.65rem', letterSpacing: '0.14em', marginBottom: '6px' }}>
                      {player.yourUsername.toUpperCase()}
                    </div>
                    <div style={{
                      fontFamily: "'Bebas Neue', Impact, sans-serif",
                      fontSize: '2.8rem', color: 'rgba(0,212,255,0.9)',
                      textShadow: '0 0 18px rgba(0,212,255,0.3)',
                    }}>
                      {roundResult.yourScore}
                    </div>
                    <div style={{ color: 'rgba(140,200,230,0.35)', fontSize: '0.65rem', letterSpacing: '0.1em' }}>
                      RICHTIG
                    </div>
                  </div>

                  <div style={{ color: 'rgba(255,200,0,0.5)', fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.4rem' }}>
                    VS
                  </div>

                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ color: 'rgba(140,200,230,0.5)', fontSize: '0.65rem', letterSpacing: '0.14em', marginBottom: '6px' }}>
                      {player.opponentUsername.toUpperCase()}
                    </div>
                    <div style={{
                      fontFamily: "'Bebas Neue', Impact, sans-serif",
                      fontSize: '2.8rem', color: 'rgba(255,90,50,0.9)',
                      textShadow: '0 0 18px rgba(255,60,20,0.25)',
                    }}>
                      {roundResult.opponentScore}
                    </div>
                    <div style={{ color: 'rgba(140,200,230,0.35)', fontSize: '0.65rem', letterSpacing: '0.1em' }}>
                      RICHTIG
                    </div>
                  </div>
                </div>
              </div>

              {/* Next round info */}
              {!roundResult.gameOver && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  color: 'rgba(140,200,230,0.45)', fontSize: '0.75rem', letterSpacing: '0.08em',
                }}>
                  <div style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: 'rgba(255,60,20,0.6)', flexShrink: 0,
                  }} />
                  <span>
                    Nächste Runde: <strong style={{ color: 'rgba(255,160,100,0.75)' }}>{nextPicker}</strong> wählt die Kategorie
                  </span>
                </div>
              )}
            </div>
          )})()}

          {/* GAME OVER */}
          {phase === 'game_over' && gameOver && player && (
            <div className="flex flex-col items-center gap-7 w-full max-w-md reveal">

              <div style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: '1rem', letterSpacing: '0.3em',
                color: 'rgba(255,60,20,0.6)',
              }}>
                ⚔ BATTLE BEENDET ⚔
              </div>

              <div style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: '3.8rem', letterSpacing: '0.06em', lineHeight: 1,
                color: gameOver.youWon ? '#FFD200' : 'rgba(255,100,60,0.85)',
              }}
              className={gameOver.youWon ? 'outcome-win' : ''}
              >
                {gameOver.youWon ? 'VICTORY' : 'DEFEAT'}
              </div>

              <div style={{ color: 'rgba(140,200,230,0.5)', fontSize: '0.82rem', letterSpacing: '0.06em' }}>
                {gameOver.youWon
                  ? `Du hast ${player.opponentUsername} besiegt!`
                  : `${gameOver.winner} hat gewonnen.`
                }
              </div>

              {/* Final score */}
              <div className="arena-card w-full" style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ color: 'rgba(140,200,230,0.45)', fontSize: '0.62rem', letterSpacing: '0.14em', marginBottom: '6px' }}>
                      {player.yourUsername.toUpperCase()}
                    </div>
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                      {STAR_SLOTS.map((slotId, i) => (
                        <span key={slotId} style={{
                          fontSize: '1.4rem',
                          color: i < gameOver.yourWins ? 'rgba(255,200,0,0.9)' : 'rgba(255,255,255,0.1)',
                          filter: i < gameOver.yourWins ? 'drop-shadow(0 0 6px rgba(255,200,0,0.5))' : 'none',
                        }}>★</span>
                      ))}
                    </div>
                  </div>

                  <div style={{ color: 'rgba(255,200,0,0.4)', fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.2rem', padding: '0 12px' }}>
                    VS
                  </div>

                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ color: 'rgba(140,200,230,0.45)', fontSize: '0.62rem', letterSpacing: '0.14em', marginBottom: '6px' }}>
                      {player.opponentUsername.toUpperCase()}
                    </div>
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                      {STAR_SLOTS.map((slotId, i) => (
                        <span key={slotId} style={{
                          fontSize: '1.4rem',
                          color: i < gameOver.opponentWins ? 'rgba(255,200,0,0.9)' : 'rgba(255,255,255,0.1)',
                          filter: i < gameOver.opponentWins ? 'drop-shadow(0 0 6px rgba(255,200,0,0.5))' : 'none',
                        }}>★</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => router.push('/')}
                style={{
                  background: 'rgba(255,60,20,0.08)',
                  border: '1px solid rgba(255,60,20,0.35)',
                  borderRadius: '0.875rem',
                  padding: '12px 36px',
                  color: 'rgba(255,140,90,0.85)',
                  fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.08em',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,60,20,0.16)'; e.currentTarget.style.borderColor = 'rgba(255,80,40,0.7)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,60,20,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,60,20,0.35)'; }}
              >
                Zurück zur Lobby
              </button>
            </div>
          )}

          {/* OPPONENT DISCONNECTED */}
          {phase === 'opponent_disconnected' && (
            <div className="flex flex-col items-center gap-6 text-center reveal">
              <div style={{ fontSize: '2.5rem' }}>⚡</div>
              <div style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: '2rem', letterSpacing: '0.1em', color: 'rgba(255,200,0,0.85)',
              }}>
                Gegner hat aufgegeben
              </div>
              <div style={{ color: 'rgba(140,200,230,0.45)', fontSize: '0.82rem' }}>
                Dein Gegner hat die Verbindung getrennt.
              </div>
              <button
                onClick={() => router.push('/')}
                style={{
                  background: 'rgba(0,212,255,0.07)',
                  border: '1px solid rgba(0,212,255,0.3)',
                  borderRadius: '0.875rem',
                  padding: '12px 36px',
                  color: 'rgba(140,200,230,0.8)',
                  fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.08em',
                  cursor: 'pointer',
                }}
              >
                Zurück zur Lobby
              </button>
            </div>
          )}

          {/* ERROR */}
          {phase === 'error' && (
            <div className="flex flex-col items-center gap-6 text-center reveal" style={{ maxWidth: '320px' }}>
              <div style={{ fontSize: '2.2rem' }}>⚠</div>
              <div style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: '1.6rem', letterSpacing: '0.08em', color: 'rgba(255,120,80,0.9)',
              }}>
                Verbindungsfehler
              </div>
              <p style={{ color: 'rgba(140,200,230,0.45)', fontSize: '0.82rem', lineHeight: 1.6 }}>
                {errorMsg}
              </p>
              <button
                onClick={() => router.push('/')}
                style={{
                  background: 'rgba(255,60,20,0.07)',
                  border: '1px solid rgba(255,60,20,0.3)',
                  borderRadius: '0.875rem',
                  padding: '11px 32px',
                  color: 'rgba(255,140,90,0.75)',
                  fontSize: '0.82rem', fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Zur Lobby
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
