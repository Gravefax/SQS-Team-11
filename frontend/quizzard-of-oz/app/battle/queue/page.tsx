'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { checkQueueStatus, leaveQueue } from '../../lib/api/battle';

export default function QueuePage() {
  const router = useRouter();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const playerId = sessionStorage.getItem('battle_player_id');
    if (!playerId) {
      router.replace('/battle');
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const result = await checkQueueStatus(playerId);
        if (result.status === 'matched' && result.match_id) {
          clearInterval(pollRef.current!);
          router.push(`/battle/${result.match_id}`);
        } else if (result.status === 'not_found') {
          clearInterval(pollRef.current!);
          router.replace('/battle');
        }
      } catch {
        // ignore transient errors
      }
    }, 2000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [router]);

  async function handleCancel() {
    if (pollRef.current) clearInterval(pollRef.current);
    const playerId = sessionStorage.getItem('battle_player_id');
    if (playerId) await leaveQueue(playerId).catch(() => {});
    sessionStorage.removeItem('battle_player_id');
    sessionStorage.removeItem('battle_nickname');
    router.push('/battle');
  }

  return (
    <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-73px)] px-4">
      <div
        className="w-full max-w-sm rounded-2xl p-8 flex flex-col items-center gap-6 text-center"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(167,139,250,0.2)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Spinner */}
        <div
          className="w-16 h-16 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: 'rgba(139,92,246,0.3)', borderTopColor: 'rgba(139,92,246,0.9)' }}
        />

        <div>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#ede9fe' }}>
            Searching for opponent…
          </h2>
          <p className="text-sm" style={{ color: 'rgba(196,181,253,0.5)' }}>
            This might take a moment
          </p>
        </div>

        <button
          onClick={handleCancel}
          className="rounded-xl px-6 py-2 text-sm transition-all duration-200"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(167,139,250,0.2)',
            color: 'rgba(196,181,253,0.6)',
          }}
        >
          Cancel
        </button>
      </div>
    </main>
  );
}
