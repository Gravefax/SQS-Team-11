'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { joinQueue } from '../lib/api/battle';

type PageState = 'idle' | 'joining' | 'error';

export default function BattlePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = (searchParams.get('mode') as 'unranked' | 'ranked') ?? 'unranked';

  const [nickname, setNickname] = useState('');
  const [pageState, setPageState] = useState<PageState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleJoin() {
    const trimmed = nickname.trim();
    if (!trimmed) return;
    setPageState('joining');
    setErrorMsg('');
    try {
      const result = await joinQueue(trimmed, mode);
      sessionStorage.setItem('battle_player_id', result.player_id);
      sessionStorage.setItem('battle_nickname', trimmed);
      if (result.status === 'matched' && result.match_id) {
        router.push(`/battle/${result.match_id}`);
      } else {
        router.push('/battle/queue');
      }
    } catch {
      setPageState('error');
      setErrorMsg('Could not connect to server. Is the backend running?');
    }
  }

  const isRanked = mode === 'ranked';

  return (
    <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-73px)] px-4 py-12">
      <div
        className="w-full max-w-sm rounded-2xl p-8 flex flex-col gap-6"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(167,139,250,0.2)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="text-center">
          <div
            className="text-4xl mb-3"
            style={{ filter: 'drop-shadow(0 0 16px rgba(139,92,246,0.5))' }}
          >
            {isRanked ? '🏆' : '⚡'}
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: '#ede9fe' }}>
            {isRanked ? 'Ranked Battle' : 'Unranked Battle'}
          </h1>
          <p className="text-sm" style={{ color: 'rgba(196,181,253,0.5)' }}>
            Enter your nickname and join the queue
          </p>
        </div>

        <input
          type="text"
          placeholder="Your nickname"
          value={nickname}
          maxLength={20}
          onChange={(e) => setNickname(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          disabled={pageState === 'joining'}
          className="rounded-xl px-4 py-3 text-sm outline-none"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(167,139,250,0.3)',
            color: '#ede9fe',
          }}
        />

        {pageState === 'error' && (
          <p className="text-xs text-center" style={{ color: '#fca5a5' }}>
            {errorMsg}
          </p>
        )}

        <button
          onClick={handleJoin}
          disabled={!nickname.trim() || pageState === 'joining'}
          className="rounded-2xl py-4 font-semibold text-sm transition-all duration-200 disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.8) 0%, rgba(99,102,241,0.8) 100%)',
            border: '1px solid rgba(167,139,250,0.4)',
            color: '#ede9fe',
            boxShadow: '0 8px 32px rgba(139,92,246,0.3)',
          }}
        >
          {pageState === 'joining' ? 'Joining...' : 'Join Queue'}
        </button>
      </div>
    </main>
  );
}
