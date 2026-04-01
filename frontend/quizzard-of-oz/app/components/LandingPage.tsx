'use client';

import { useRouter } from 'next/navigation';

type ColorType = 'cyan' | 'fire' | 'gold';

const FLOAT_COLORS: Record<ColorType, (opacity: number) => string> = {
  cyan: (o) => `rgba(0, 212, 255, ${o})`,
  fire: (o) => `rgba(255, 60, 20, ${o})`,
  gold: (o) => `rgba(255, 200, 0, ${o})`,
};

// Rising floating elements — question marks, lightning, swords
const FLOAT_DATA: Array<{ id: string; char: string; size: string; left: string; type: ColorType; path: number; dur: number; delay: number }> = [
  { id: 'f-0',  char: '?',  size: '9rem',   left: '3%',  type: 'cyan', path: 0, dur: 11, delay: 0    },
  { id: 'f-1',  char: '?',  size: '4rem',   left: '14%', type: 'cyan', path: 2, dur: 9,  delay: 0.5  },
  { id: 'f-2',  char: '⚡', size: '5rem',   left: '22%', type: 'gold', path: 1, dur: 14, delay: 1.2  },
  { id: 'f-3',  char: '⚔', size: '4.5rem', left: '35%', type: 'fire', path: 3, dur: 10, delay: 0.3  },
  { id: 'f-4',  char: '?',  size: '8rem',   left: '47%', type: 'cyan', path: 4, dur: 12, delay: 1.8  },
  { id: 'f-5',  char: '⚡', size: '3rem',   left: '57%', type: 'gold', path: 0, dur: 8,  delay: 0.8  },
  { id: 'f-6',  char: '⚔', size: '6rem',   left: '66%', type: 'fire', path: 2, dur: 13, delay: 0.2  },
  { id: 'f-7',  char: '?',  size: '5rem',   left: '75%', type: 'cyan', path: 1, dur: 9,  delay: 0.4  },
  { id: 'f-8',  char: '⚡', size: '4rem',   left: '83%', type: 'gold', path: 3, dur: 11, delay: 1.5  },
  { id: 'f-9',  char: '?',  size: '3.5rem', left: '91%', type: 'cyan', path: 4, dur: 10, delay: 0.1  },
  { id: 'f-10', char: '⚔', size: '7rem',   left: '41%', type: 'fire', path: 1, dur: 13, delay: 2.5  },
  { id: 'f-11', char: '⚡', size: '3rem',   left: '28%', type: 'gold', path: 3, dur: 8,  delay: 1    },
];

// Large ambient background elements
const AMB_DATA: Array<{ id: string; char: string; size: string; top: string; left: string; type: ColorType; anim: number; dur: number; delay: number; opacity: number }> = [
  { id: 'a-0', char: '?',  size: '18rem', top: '8%',  left: '4%',  type: 'cyan', anim: 0, dur: 9,  delay: 0,   opacity: 0.05 },
  { id: 'a-1', char: '⚔', size: '8rem',  top: '20%', left: '88%', type: 'fire', anim: 1, dur: 7,  delay: 1.2, opacity: 0.07 },
  { id: 'a-2', char: '?',  size: '24rem', top: '55%', left: '1%',  type: 'cyan', anim: 2, dur: 11, delay: 0.5, opacity: 0.04 },
  { id: 'a-3', char: '⚔', size: '10rem', top: '72%', left: '82%', type: 'fire', anim: 0, dur: 8,  delay: 2,   opacity: 0.06 },
  { id: 'a-4', char: '⚡', size: '12rem', top: '40%', left: '78%', type: 'gold', anim: 1, dur: 10, delay: 0.8, opacity: 0.05 },
  { id: 'a-5', char: '⚡', size: '5rem',  top: '65%', left: '45%', type: 'gold', anim: 2, dur: 6,  delay: 1.5, opacity: 0.09 },
  { id: 'a-6', char: '?',  size: '16rem', top: '12%', left: '56%', type: 'cyan', anim: 0, dur: 12, delay: 3,   opacity: 0.04 },
  { id: 'a-7', char: '⚔', size: '7rem',  top: '48%', left: '22%', type: 'fire', anim: 1, dur: 8,  delay: 0.3, opacity: 0.07 },
];

function handleRanked() {
  console.log('TODO: handleRanked');
}

function handleUnranked() {
  console.log('TODO: handleUnranked');
}

export default function LandingPage() {
  const router = useRouter();

  function handleUebung() {
    router.push('/trainings-modus');
  }

  return (
    <>
      <style>{`
        /* ── Float paths ── */
        @keyframes floatPath0 {
          0%   { transform: translateY(105vh) translateX(0px)   rotate(-3deg); opacity: 0; }
          8%   { opacity: 1; }
          30%  { transform: translateY(72vh)  translateX(22px)  rotate(4deg);  }
          60%  { transform: translateY(36vh)  translateX(-10px) rotate(-2deg); }
          92%  { opacity: 0.7; }
          100% { transform: translateY(-15vh) translateX(28px)  rotate(6deg);  opacity: 0; }
        }
        @keyframes floatPath1 {
          0%   { transform: translateY(105vh) translateX(0px)   rotate(5deg);  opacity: 0; }
          8%   { opacity: 1; }
          25%  { transform: translateY(76vh)  translateX(-32px) rotate(-4deg); }
          55%  { transform: translateY(40vh)  translateX(-18px) rotate(3deg);  }
          92%  { opacity: 0.7; }
          100% { transform: translateY(-15vh) translateX(-38px) rotate(-6deg); opacity: 0; }
        }
        @keyframes floatPath2 {
          0%   { transform: translateY(105vh) translateX(0px)   rotate(0deg);  opacity: 0; }
          8%   { opacity: 1; }
          20%  { transform: translateY(82vh)  translateX(42px)  rotate(-5deg); }
          50%  { transform: translateY(46vh)  translateX(58px)  rotate(8deg);  }
          80%  { transform: translateY(16vh)  translateX(32px)  rotate(-3deg); }
          92%  { opacity: 0.7; }
          100% { transform: translateY(-15vh) translateX(48px)  rotate(5deg);  opacity: 0; }
        }
        @keyframes floatPath3 {
          0%   { transform: translateY(105vh) translateX(0px)   rotate(-6deg); opacity: 0; }
          8%   { opacity: 1; }
          35%  { transform: translateY(66vh)  translateX(-52px) rotate(3deg);  }
          70%  { transform: translateY(26vh)  translateX(-36px) rotate(-4deg); }
          92%  { opacity: 0.7; }
          100% { transform: translateY(-15vh) translateX(-58px) rotate(7deg);  opacity: 0; }
        }
        @keyframes floatPath4 {
          0%   { transform: translateY(105vh) translateX(0px)   rotate(2deg);  opacity: 0; }
          8%   { opacity: 1; }
          20%  { transform: translateY(82vh)  translateX(26px)  rotate(-3deg); }
          40%  { transform: translateY(60vh)  translateX(-22px) rotate(5deg);  }
          60%  { transform: translateY(38vh)  translateX(36px)  rotate(-2deg); }
          80%  { transform: translateY(18vh)  translateX(-14px) rotate(4deg);  }
          92%  { opacity: 0.7; }
          100% { transform: translateY(-15vh) translateX(22px)  rotate(-5deg); opacity: 0; }
        }

        /* ── Ambient float ── */
        @keyframes ambFloat0 {
          0%,100% { transform: translateY(0px)   translateX(0px)   rotate(-4deg); }
          25%     { transform: translateY(-22px)  translateX(14px)  rotate(3deg);  }
          50%     { transform: translateY(-8px)   translateX(28px)  rotate(-2deg); }
          75%     { transform: translateY(-30px)  translateX(10px)  rotate(5deg);  }
        }
        @keyframes ambFloat1 {
          0%,100% { transform: translateY(0px)   translateX(0px)   rotate(6deg);  }
          30%     { transform: translateY(-18px)  translateX(-20px) rotate(-3deg); }
          60%     { transform: translateY(-35px)  translateX(-8px)  rotate(4deg);  }
          80%     { transform: translateY(-12px)  translateX(-26px) rotate(-5deg); }
        }
        @keyframes ambFloat2 {
          0%,100% { transform: translateY(0px)   translateX(0px)   rotate(0deg);  }
          20%     { transform: translateY(-28px)  translateX(18px)  rotate(-6deg); }
          45%     { transform: translateY(-14px)  translateX(-12px) rotate(4deg);  }
          70%     { transform: translateY(-40px)  translateX(8px)   rotate(-2deg); }
        }

        /* ── Battle button fire pulse ── */
        @keyframes battlePulse {
          0%,100% {
            box-shadow: 0 0 24px rgba(255,60,20,0.28), 0 0 65px rgba(255,60,20,0.09), 0 6px 32px rgba(0,0,0,0.55);
            border-color: rgba(255,80,40,0.6);
          }
          50% {
            box-shadow: 0 0 48px rgba(255,60,20,0.58), 0 0 110px rgba(255,60,20,0.2), 0 6px 32px rgba(0,0,0,0.55);
            border-color: rgba(255,120,60,0.95);
          }
        }

        /* ── Title neon glow ── */
        @keyframes titleGlow {
          0%,100% { text-shadow: 0 0 18px rgba(0,212,255,0.32), 0 0 38px rgba(0,212,255,0.14); }
          50%     { text-shadow: 0 0 30px rgba(0,212,255,0.65), 0 0 60px rgba(0,212,255,0.28), 0 0 90px rgba(0,212,255,0.13); }
        }

        /* ── Orb pulse ── */
        @keyframes orbPulse {
          0%,100% { opacity: 0.9; transform: translate(-50%,-50%) scale(1);    }
          50%     { opacity: 1;   transform: translate(-50%,-50%) scale(1.07); }
        }

        /* ── Badge flash ── */
        @keyframes badgeFlash {
          0%,100% { opacity: 0.85; }
          50%     { opacity: 1; filter: brightness(1.25); }
        }

        /* ── Scan line ── */
        @keyframes scanDown {
          0%   { top: -5%; opacity: 0; }
          4%   { opacity: 1; }
          96%  { opacity: 0.55; }
          100% { top: 105%; opacity: 0; }
        }

        /* ── Underline reveal ── */
        @keyframes lineReveal {
          0%   { width: 0;     opacity: 0; }
          100% { width: 200px; opacity: 1; }
        }

        /* ── Button classes ── */
        .battle-btn {
          background: linear-gradient(155deg, rgba(255,60,20,0.11) 0%, rgba(140,18,0,0.06) 100%);
          border: 2px solid rgba(255,80,40,0.6);
          border-radius: 1.25rem;
          transition: transform 0.2s ease, background 0.2s ease;
          animation: battlePulse 2.8s ease-in-out infinite;
        }
        .battle-btn:hover {
          background: linear-gradient(155deg, rgba(255,60,20,0.24) 0%, rgba(180,30,5,0.15) 100%);
          transform: translateY(-5px) scale(1.015);
        }

        .cyan-card {
          background: rgba(0,212,255,0.04);
          border: 1px solid rgba(0,212,255,0.2);
          border-radius: 0.875rem;
          transition: background 0.25s ease, border-color 0.25s ease,
                      transform 0.25s ease, box-shadow 0.25s ease;
        }
        .cyan-card:hover {
          background: rgba(0,212,255,0.1);
          border-color: rgba(0,212,255,0.65);
          transform: translateY(-5px);
          box-shadow: 0 18px 42px rgba(0,212,255,0.14);
        }

        .gold-card {
          background: rgba(255,200,0,0.04);
          border: 1px solid rgba(255,200,0,0.2);
          border-radius: 0.875rem;
          transition: background 0.25s ease, border-color 0.25s ease,
                      transform 0.25s ease, box-shadow 0.25s ease;
        }
        .gold-card:hover {
          background: rgba(255,200,0,0.1);
          border-color: rgba(255,200,0,0.65);
          transform: translateY(-5px);
          box-shadow: 0 18px 42px rgba(255,200,0,0.11);
        }

        /* ── Typography ── */
        .arena-title {
          font-family: 'Bebas Neue', 'Impact', 'Arial Black', sans-serif;
          letter-spacing: 0.06em;
          color: #EAF5FF;
          animation: titleGlow 4s ease-in-out infinite;
          line-height: 0.9;
        }

        .neon-line {
          display: block;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(0,212,255,0.9), transparent);
          animation: lineReveal 0.9s cubic-bezier(0.22,1,0.36,1) 0.2s both;
          margin: 12px auto 18px;
        }
      `}</style>

      <div className="min-h-screen relative overflow-hidden">

        {/* ── Background layer ── */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">

          {/* Subtle dot/grid pattern */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(rgba(0,212,255,0.032) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,212,255,0.032) 1px, transparent 1px)
              `,
              backgroundSize: '64px 64px',
            }}
          />

          {/* Horizontal scan line */}
          <div
            className="absolute left-0 right-0"
            style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent 0%, rgba(0,212,255,0.18) 40%, rgba(0,212,255,0.18) 60%, transparent 100%)',
              animation: 'scanDown 9s linear 0.5s infinite',
            }}
          />

          {/* Cyan glow orb — left */}
          <div
            className="absolute"
            style={{
              width: '700px', height: '700px',
              top: '10%', left: '-15%',
              background: 'radial-gradient(circle, rgba(0,212,255,0.065) 0%, transparent 65%)',
              animation: 'ambFloat0 14s ease-in-out infinite',
            }}
          />

          {/* Fire glow orb — right */}
          <div
            className="absolute"
            style={{
              width: '560px', height: '560px',
              top: '5%', right: '-10%',
              background: 'radial-gradient(circle, rgba(255,60,20,0.06) 0%, transparent 65%)',
              animation: 'ambFloat1 12s ease-in-out 1.5s infinite',
            }}
          />

          {/* Center depth orb */}
          <div
            className="absolute rounded-full"
            style={{
              width: '600px', height: '600px',
              top: '50%', left: '50%',
              background: 'radial-gradient(circle, rgba(0,212,255,0.04) 0%, rgba(0,18,40,0.5) 50%, transparent 100%)',
              animation: 'orbPulse 7s ease-in-out infinite',
            }}
          />

          {/* Ambient large background chars */}
          {AMB_DATA.map((item) => (
            <div
              key={item.id}
              className="absolute font-bold select-none"
              style={{
                fontSize: item.size,
                top: item.top,
                left: item.left,
                color: FLOAT_COLORS[item.type](item.opacity),
                lineHeight: 1,
                animation: `ambFloat${item.anim} ${item.dur}s ease-in-out ${item.delay}s infinite`,
              }}
            >
              {item.char}
            </div>
          ))}

          {/* Rising floating chars */}
          {FLOAT_DATA.map((item) => (
            <div
              key={item.id}
              className="absolute font-bold select-none"
              style={{
                fontSize: item.size,
                left: item.left,
                color: FLOAT_COLORS[item.type](0.1),
                lineHeight: 1,
                animation: `floatPath${item.path} ${item.dur}s ease-in-out ${item.delay}s infinite`,
                animationFillMode: 'backwards',
              }}
            >
              {item.char}
            </div>
          ))}
        </div>

        {/* ── Main content ── */}
        <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-73px)] px-4">


          {/* Title */}
          <div className="text-center mb-1">
            <h1 className="arena-title text-[5.5rem] md:text-[9rem]">
              Quizard of Oz
            </h1>
            <span className="neon-line" style={{ width: '200px' }} />
            <p
              className="text-sm md:text-base mt-1 mb-6" // 'mb-6' für Abstand nach unten
              style={{ color: 'rgba(140, 200, 230, 0.52)', letterSpacing: '0.04em' }}
            >
              Beweise dein Wissen. Besiege deine Rivalen.
            </p>
          </div>

          {/* ── Action buttons ── */}
          <div className="flex flex-col items-center gap-4 w-full max-w-sm">

            {/* RANKED BATTLE — fire CTA */}
            <button
              className="battle-btn px-16 py-5 text-center w-full"
              onClick={handleRanked}
            >
              <div
                className="text-3xl mb-2"
                style={{ filter: 'drop-shadow(0 0 14px rgba(255,80,40,0.7))' }}
              >
                ⚔
              </div>
              <h3
                className="font-black mb-1 tracking-widest uppercase"
                style={{
                  fontFamily: "'Bebas Neue', Impact, 'Arial Black', sans-serif",
                  fontSize: '1.6rem',
                  letterSpacing: '0.14em',
                  color: '#FFCDB0',
                }}
              >
                Ranked Battle
              </h3>
              <p
                className="text-xs"
                style={{ color: 'rgba(255,160,110,0.6)', letterSpacing: '0.05em' }}
              >
                Compete · Rank · Dominate · Login erforderlich
              </p>
            </button>

            {/* UNRANKED + ÜBUNG */}
            <div className="grid grid-cols-2 gap-4 w-full">
              <button className="cyan-card px-6 py-4 text-center" onClick={handleUnranked}>
                <div
                  className="text-xl mb-1"
                  style={{ filter: 'drop-shadow(0 0 10px rgba(0,212,255,0.55))' }}
                >
                  ⚡
                </div>
                <h3
                  className="text-sm font-semibold mb-0.5"
                  style={{ color: 'rgba(160,215,240,0.9)' }}
                >
                  Unranked
                </h3>
                <p className="text-xs" style={{ color: 'rgba(140,200,230,0.45)' }}>
                  Frei spielen
                </p>
              </button>

              <button className="gold-card px-6 py-4 text-center" onClick={handleUebung}>
                <div
                  className="text-xl mb-1"
                  style={{ filter: 'drop-shadow(0 0 10px rgba(255,200,0,0.55))' }}
                >
                  🎯
                </div>
                <h3
                  className="text-sm font-semibold mb-0.5"
                  style={{ color: 'rgba(255,225,140,0.9)' }}
                >
                  Übung
                </h3>
                <p className="text-xs" style={{ color: 'rgba(255,220,130,0.45)' }}>
                  Trainingsmodus
                </p>
              </button>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
