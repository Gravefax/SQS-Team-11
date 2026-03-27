'use client';

import { useRouter } from 'next/navigation';

const FLOATING_QUESTIONS = [
  { q: 'Was ist die Hauptstadt von Frankreich?', a: 'Paris' },
  { q: 'Wie viele Planeten hat unser Sonnensystem?', a: '8' },
  { q: 'In welchem Jahr fiel die Berliner Mauer?', a: '1989' },
  { q: 'Wer schrieb den Faust?', a: 'Goethe' },
  { q: 'Was ist H₂O?', a: 'Wasser' },
  { q: 'Wie viele Seiten hat ein Hexagon?', a: '6' },
];

const QM_DATA = [
  { id: 'qm-0',  size: '9rem',   left: '3%',  path: 0, dur: 11, delay: 0 },
  { id: 'qm-1',  size: '4rem',   left: '14%', path: 2, dur: 9,  delay: 0.5 },
  { id: 'qm-2',  size: '12rem',  left: '23%', path: 1, dur: 14, delay: 1.2 },
  { id: 'qm-3',  size: '6rem',   left: '35%', path: 3, dur: 10, delay: 0.3 },
  { id: 'qm-4',  size: '8rem',   left: '47%', path: 4, dur: 12, delay: 1.8 },
  { id: 'qm-5',  size: '3rem',   left: '57%', path: 0, dur: 8,  delay: 0.8 },
  { id: 'qm-6',  size: '11rem',  left: '66%', path: 2, dur: 13, delay: 0.2 },
  { id: 'qm-7',  size: '5rem',   left: '75%', path: 1, dur: 9,  delay: 0.4 },
  { id: 'qm-8',  size: '7rem',   left: '83%', path: 3, dur: 11, delay: 1.5 },
  { id: 'qm-9',  size: '4rem',   left: '91%', path: 4, dur: 10, delay: 0.1 },
  { id: 'qm-10', size: '10rem',  left: '41%', path: 1, dur: 13, delay: 2.5 },
  { id: 'qm-11', size: '3.5rem', left: '28%', path: 3, dur: 8,  delay: 1 },
];

const AMB_QM_DATA = [
  { id: 'amb-0', size: '16rem', top: '8%',  left: '5%',  anim: 0, dur: 9,  delay: 0, opacity: 0.06 },
  { id: 'amb-1', size: '7rem',  top: '20%', left: '88%', anim: 1, dur: 7,  delay: 1.2, opacity: 0.09 },
  { id: 'amb-2', size: '22rem', top: '55%', left: '2%',  anim: 2, dur: 11, delay: 0.5, opacity: 0.04 },
  { id: 'amb-3', size: '10rem', top: '75%', left: '82%', anim: 0, dur: 8,  delay: 2, opacity: 0.07 },
  { id: 'amb-4', size: '13rem', top: '38%', left: '78%', anim: 1, dur: 10, delay: 0.8, opacity: 0.05 },
  { id: 'amb-5', size: '5rem',  top: '65%', left: '45%', anim: 2, dur: 6,  delay: 1.5, opacity: 0.1 },
  { id: 'amb-6', size: '18rem', top: '12%', left: '55%', anim: 0, dur: 12, delay: 3, opacity: 0.04 },
  { id: 'amb-7', size: '8rem',  top: '48%', left: '22%', anim: 1, dur: 8,  delay: 0.3, opacity: 0.08 },
];

const CARD_DATA = FLOATING_QUESTIONS.map((item, i) => ({
  ...item,
  left:  ['2%', '17%', '34%', '51%', '65%', '78%'][i],
  path:  i % 3,
  dur:   [16, 11, 21, 13, 19, 14][i],
  delay: [0, -5, -9, -2, -13, -6][i],
}));

export default function LandingPage() {
  const router = useRouter();

  function handleUebung() {
    router.push('/trainings-modus');
  }

  function handleUnranked() {
    router.push('/battle');
  }

  function handleRanked() {
    router.push('/battle?mode=ranked');
  }

  return (
    <>
      <style>{`
        @keyframes qmPath0 {
          0%   { transform: translateY(105vh) translateX(0px)   rotate(-3deg); opacity: 0; }
          8%   { opacity: 0.16; }
          30%  { transform: translateY(72vh)  translateX(22px)  rotate(4deg);  }
          60%  { transform: translateY(36vh)  translateX(-10px) rotate(-2deg); }
          92%  { opacity: 0.10; }
          100% { transform: translateY(-15vh) translateX(28px)  rotate(6deg);  opacity: 0; }
        }
        @keyframes qmPath1 {
          0%   { transform: translateY(105vh) translateX(0px)   rotate(5deg);  opacity: 0; }
          8%   { opacity: 0.16; }
          25%  { transform: translateY(76vh)  translateX(-32px) rotate(-4deg); }
          55%  { transform: translateY(40vh)  translateX(-18px) rotate(3deg);  }
          92%  { opacity: 0.10; }
          100% { transform: translateY(-15vh) translateX(-38px) rotate(-6deg); opacity: 0; }
        }
        @keyframes qmPath2 {
          0%   { transform: translateY(105vh) translateX(0px)   rotate(0deg);  opacity: 0; }
          8%   { opacity: 0.16; }
          20%  { transform: translateY(82vh)  translateX(42px)  rotate(-5deg); }
          50%  { transform: translateY(46vh)  translateX(58px)  rotate(8deg);  }
          80%  { transform: translateY(16vh)  translateX(32px)  rotate(-3deg); }
          92%  { opacity: 0.10; }
          100% { transform: translateY(-15vh) translateX(48px)  rotate(5deg);  opacity: 0; }
        }
        @keyframes qmPath3 {
          0%   { transform: translateY(105vh) translateX(0px)   rotate(-6deg); opacity: 0; }
          8%   { opacity: 0.16; }
          35%  { transform: translateY(66vh)  translateX(-52px) rotate(3deg);  }
          70%  { transform: translateY(26vh)  translateX(-36px) rotate(-4deg); }
          92%  { opacity: 0.10; }
          100% { transform: translateY(-15vh) translateX(-58px) rotate(7deg);  opacity: 0; }
        }
        @keyframes qmPath4 {
          0%   { transform: translateY(105vh) translateX(0px)   rotate(2deg);  opacity: 0; }
          8%   { opacity: 0.16; }
          20%  { transform: translateY(82vh)  translateX(26px)  rotate(-3deg); }
          40%  { transform: translateY(60vh)  translateX(-22px) rotate(5deg);  }
          60%  { transform: translateY(38vh)  translateX(36px)  rotate(-2deg); }
          80%  { transform: translateY(18vh)  translateX(-14px) rotate(4deg);  }
          92%  { opacity: 0.10; }
          100% { transform: translateY(-15vh) translateX(22px)  rotate(-5deg); opacity: 0; }
        }
        @keyframes ambFloat0 {
          0%   { transform: translateY(0px)  translateX(0px)   rotate(-4deg); }
          25%  { transform: translateY(-22px) translateX(14px)  rotate(3deg);  }
          50%  { transform: translateY(-8px)  translateX(28px)  rotate(-2deg); }
          75%  { transform: translateY(-30px) translateX(10px)  rotate(5deg);  }
          100% { transform: translateY(0px)  translateX(0px)   rotate(-4deg); }
        }
        @keyframes ambFloat1 {
          0%   { transform: translateY(0px)  translateX(0px)   rotate(6deg);  }
          30%  { transform: translateY(-18px) translateX(-20px) rotate(-3deg); }
          60%  { transform: translateY(-35px) translateX(-8px)  rotate(4deg);  }
          80%  { transform: translateY(-12px) translateX(-26px) rotate(-5deg); }
          100% { transform: translateY(0px)  translateX(0px)   rotate(6deg);  }
        }
        @keyframes ambFloat2 {
          0%   { transform: translateY(0px)  translateX(0px)   rotate(0deg);  }
          20%  { transform: translateY(-28px) translateX(18px)  rotate(-6deg); }
          45%  { transform: translateY(-14px) translateX(-12px) rotate(4deg);  }
          70%  { transform: translateY(-40px) translateX(8px)   rotate(-2deg); }
          100% { transform: translateY(0px)  translateX(0px)   rotate(0deg);  }
        }
        @keyframes cardPath0 {
          0%   { transform: translateY(110vh) translateX(0px)   rotate(-3deg) scale(0.95); opacity: 0; }
          6%   { opacity: 1; }
          30%  { transform: translateY(72vh)  translateX(18px)  rotate(2deg)  scale(0.95); }
          65%  { transform: translateY(32vh)  translateX(-12px) rotate(-1deg) scale(0.95); }
          94%  { opacity: 1; }
          100% { transform: translateY(-20vh) translateX(22px)  rotate(3deg)  scale(0.95); opacity: 0; }
        }
        @keyframes cardPath1 {
          0%   { transform: translateY(110vh) translateX(0px)   rotate(4deg)  scale(0.95); opacity: 0; }
          6%   { opacity: 1; }
          25%  { transform: translateY(78vh)  translateX(-28px) rotate(-2deg) scale(0.95); }
          60%  { transform: translateY(38vh)  translateX(-16px) rotate(3deg)  scale(0.95); }
          94%  { opacity: 1; }
          100% { transform: translateY(-20vh) translateX(-32px) rotate(-4deg) scale(0.95); opacity: 0; }
        }
        @keyframes cardPath2 {
          0%   { transform: translateY(110vh) translateX(0px)   rotate(-1deg) scale(0.95); opacity: 0; }
          6%   { opacity: 1; }
          20%  { transform: translateY(84vh)  translateX(35px)  rotate(3deg)  scale(0.95); }
          45%  { transform: translateY(52vh)  translateX(48px)  rotate(-2deg) scale(0.95); }
          75%  { transform: translateY(22vh)  translateX(28px)  rotate(4deg)  scale(0.95); }
          94%  { opacity: 1; }
          100% { transform: translateY(-20vh) translateX(40px)  rotate(-3deg) scale(0.95); opacity: 0; }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.12; transform: scale(1);    }
          50%       { opacity: 0.22; transform: scale(1.06); }
        }
        @keyframes shimmer {
          0%   { background-position: -300% center; }
          100% { background-position:  300% center; }
        }
        @keyframes subtleBob {
          0%, 100% { transform: translateY(0px);  }
          50%       { transform: translateY(-8px); }
        }
        .shimmer-text {
          background: linear-gradient(
            90deg, #d97706 0%, #fde68a 25%, #f59e0b 50%, #fde68a 75%, #d97706 100%
          );
          background-size: 300% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite, subtleBob 6s ease-in-out infinite;
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(167, 139, 250, 0.18);
          transition: background 0.3s ease, border-color 0.3s ease,
                      transform 0.3s ease, box-shadow 0.3s ease;
        }
        .glass-card:hover {
          background: rgba(139, 92, 246, 0.14);
          border-color: rgba(167, 139, 250, 0.55);
          transform: translateY(-6px);
          box-shadow: 0 24px 48px rgba(139, 92, 246, 0.22);
        }
      `}</style>

      <div className="min-h-screen relative overflow-hidden">
        {/* ── Background animation layer ── */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">

          <div
            className="absolute rounded-full"
            style={{
              width: '680px', height: '680px',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, rgba(109,40,217,0.06) 55%, transparent 100%)',
              animation: 'pulseGlow 5s ease-in-out infinite',
            }}
          />

          {AMB_QM_DATA.map((qm) => (
            <div
              key={qm.id}
              className="absolute font-bold select-none"
              style={{
                fontSize: qm.size, top: qm.top, left: qm.left,
                color: `rgba(167, 139, 250, ${qm.opacity})`,
                lineHeight: 1,
                animation: `ambFloat${qm.anim} ${qm.dur}s ease-in-out ${qm.delay}s infinite`,
              }}
            >?</div>
          ))}

          {QM_DATA.map((qm) => (
            <div
              key={qm.id}
              className="absolute font-bold select-none"
              style={{
                fontSize: qm.size, left: qm.left,
                color: 'rgba(167, 139, 250, 0.11)',
                lineHeight: 1,
                animation: `qmPath${qm.path} ${qm.dur}s ease-in-out ${qm.delay}s infinite`,
                animationFillMode: 'backwards',
              }}
            >?</div>
          ))}

          {CARD_DATA.map((item) => (
            <div
              key={item.q}
              className="absolute rounded-2xl p-4"
              style={{
                width: '210px', left: item.left,
                border: '1px solid rgba(167, 139, 250, 0.13)',
                background: 'rgba(139, 92, 246, 0.05)',
                backdropFilter: 'blur(6px)',
                animation: `cardPath${item.path} ${item.dur}s ease-in-out ${item.delay}s infinite`,
              }}
            >
              <div style={{ fontSize: '0.5rem', color: 'rgba(196, 181, 253, 0.45)', marginBottom: '5px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Frage</div>
              <div style={{ fontSize: '0.63rem', color: 'rgba(255, 255, 255, 0.35)', lineHeight: 1.45 }}>{item.q}</div>
              <div style={{ marginTop: '8px', fontSize: '0.6rem', color: 'rgba(245, 158, 11, 0.38)', fontWeight: 600 }}>{item.a}</div>
            </div>
          ))}
        </div>

        {/* ── Main content ── */}
        <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-73px)] px-4">

          <div className="text-center mb-16">
            <div
              className="text-sm font-medium tracking-widest uppercase mb-6"
              style={{ color: 'rgba(245, 158, 11, 0.65)', letterSpacing: '0.3em' }}
            >
              ✦ Das ultimative Quiz-Erlebnis ✦
            </div>
            <h1
              className="text-6xl md:text-8xl font-bold mb-5 shimmer-text"
              style={{ letterSpacing: '-0.02em' }}
            >
              Quizard of Oz
            </h1>
            <p className="text-lg" style={{ color: 'rgba(196, 181, 253, 0.55)' }}>
              Stelle dein Wissen auf die Probe
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 w-full max-w-sm">
            <button className="glass-card rounded-2xl px-16 py-5 text-center w-full" onClick={handleRanked}>
              <div className="text-3xl mb-2" style={{ filter: 'drop-shadow(0 0 12px rgba(245,158,11,0.4))' }}>🏆</div>
              <h3 className="text-lg font-semibold mb-1" style={{ color: '#ede9fe' }}>Ranked</h3>
              <p className="text-xs" style={{ color: 'rgba(196, 181, 253, 0.5)' }}>Wettbewerb · Login erforderlich</p>
            </button>

            <div className="grid grid-cols-2 gap-4 w-full">
              <button className="glass-card rounded-xl px-6 py-3 text-center" onClick={handleUnranked}>
                <div className="text-xl mb-1" style={{ filter: 'drop-shadow(0 0 10px rgba(139,92,246,0.4))' }}>⚡</div>
                <h3 className="text-sm font-semibold mb-0.5" style={{ color: '#ede9fe' }}>Unranked</h3>
                <p className="text-xs" style={{ color: 'rgba(196, 181, 253, 0.5)' }}>Frei spielen</p>
              </button>

              <button className="glass-card rounded-xl px-6 py-3 text-center" onClick={handleUebung}>
                <div className="text-xl mb-1" style={{ filter: 'drop-shadow(0 0 10px rgba(99,102,241,0.4))' }}>📚</div>
                <h3 className="text-sm font-semibold mb-0.5" style={{ color: '#ede9fe' }}>Übung</h3>
                <p className="text-xs" style={{ color: 'rgba(196, 181, 253, 0.5)' }}>Trainingsmodus</p>
              </button>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
