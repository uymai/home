'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

type WakeLockSentinelLike = {
  addEventListener?: (type: 'release', listener: () => void) => void;
  onrelease?: (() => void) | null;
  release?: () => Promise<void>;
};

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinelLike>;
  };
};

const PATTERNS = ['Plasma', 'Aurora', 'Lava', 'Ocean', 'Embers'] as const;
const SPEEDS = [0.5, 1, 2, 3] as const;
const SPEED_LABELS = ['½×', '1×', '2×', '3×'] as const;
type Speed = typeof SPEEDS[number];

function Plasma() {
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ background: '#000', animation: 'nl-hue calc(25s / var(--nl-speed, 1)) linear infinite' }}
    >
      <div
        className="nl-blob"
        style={{
          width: '90vmax', height: '90vmax',
          background: 'radial-gradient(circle, #c800ff 0%, transparent 65%)',
          opacity: 0.22, top: '-30%', left: '-30%',
          animation: 'nl-b1 calc(20s / var(--nl-speed, 1)) ease-in-out infinite',
        }}
      />
      <div
        className="nl-blob"
        style={{
          width: '80vmax', height: '80vmax',
          background: 'radial-gradient(circle, #00e5ff 0%, transparent 65%)',
          opacity: 0.22, bottom: '-25%', right: '-20%',
          animation: 'nl-b2 calc(27s / var(--nl-speed, 1)) ease-in-out infinite',
        }}
      />
      <div
        className="nl-blob"
        style={{
          width: '70vmax', height: '70vmax',
          background: 'radial-gradient(circle, #ffd700 0%, transparent 65%)',
          opacity: 0.18, top: '20%', left: '20%',
          animation: 'nl-b3 calc(34s / var(--nl-speed, 1)) ease-in-out infinite',
        }}
      />
    </div>
  );
}

function Aurora() {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: '#030a12' }}>
      <div
        style={{
          position: 'absolute', left: '-10%', right: '-10%', top: '22%', height: 200,
          background: 'linear-gradient(180deg, transparent 0%, #00c87a 40%, #00a896 60%, transparent 100%)',
          filter: 'blur(40px)', animation: 'nl-a1 calc(15s / var(--nl-speed, 1)) ease-in-out infinite',
        }}
      />
      <div
        style={{
          position: 'absolute', left: '-10%', right: '-10%', top: '38%', height: 180,
          background: 'linear-gradient(180deg, transparent 0%, #0077b6 40%, #7b2ff7 60%, transparent 100%)',
          filter: 'blur(50px)', animation: 'nl-a2 calc(19s / var(--nl-speed, 1)) ease-in-out infinite',
        }}
      />
      <div
        style={{
          position: 'absolute', left: '-10%', right: '-10%', top: '10%', height: 160,
          background: 'linear-gradient(180deg, transparent 0%, #00f5d4 50%, transparent 100%)',
          filter: 'blur(65px)', animation: 'nl-a3 calc(23s / var(--nl-speed, 1)) ease-in-out infinite',
        }}
      />
    </div>
  );
}

function Lava() {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: '#0a0000' }}>
      <div
        className="nl-blob"
        style={{
          width: '80vmax', height: '80vmax',
          background: 'radial-gradient(circle, #ff3300 0%, transparent 65%)',
          opacity: 0.28, top: '-20%', left: '-20%',
          animation: 'nl-b1 calc(22s / var(--nl-speed, 1)) ease-in-out infinite',
        }}
      />
      <div
        className="nl-blob"
        style={{
          width: '70vmax', height: '70vmax',
          background: 'radial-gradient(circle, #ff8800 0%, transparent 65%)',
          opacity: 0.25, bottom: '-20%', right: '-15%',
          animation: 'nl-b2 calc(29s / var(--nl-speed, 1)) ease-in-out infinite',
        }}
      />
      <div
        className="nl-blob"
        style={{
          width: '60vmax', height: '60vmax',
          background: 'radial-gradient(circle, #cc0000 0%, transparent 65%)',
          opacity: 0.22, top: '30%', left: '25%',
          animation: 'nl-b3 calc(36s / var(--nl-speed, 1)) ease-in-out infinite',
        }}
      />
      <div
        className="nl-blob"
        style={{
          width: '50vmax', height: '50vmax',
          background: 'radial-gradient(circle, #ffcc00 0%, transparent 65%)',
          opacity: 0.18, bottom: '10%', left: '-10%',
          animation: 'nl-b4 calc(30s / var(--nl-speed, 1)) ease-in-out infinite',
        }}
      />
    </div>
  );
}

function Ocean() {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: '#000818' }}>
      <div
        style={{
          position: 'absolute', inset: '-20%',
          background: 'linear-gradient(135deg, #001a4d, #003366, #004080, #001a4d, #000d26)',
          backgroundSize: '400% 400%',
          animation: 'nl-oc calc(18s / var(--nl-speed, 1)) ease infinite',
          opacity: 0.9,
        }}
      />
      <div
        className="nl-blob"
        style={{
          width: '100vmax', height: '60vmax',
          background: 'radial-gradient(circle, #0066cc 0%, transparent 60%)',
          opacity: 0.2, bottom: '-30%', left: '-20%',
          animation: 'nl-b1 calc(24s / var(--nl-speed, 1)) ease-in-out infinite',
        }}
      />
      <div
        className="nl-blob"
        style={{
          width: '80vmax', height: '50vmax',
          background: 'radial-gradient(circle, #00cccc 0%, transparent 65%)',
          opacity: 0.15, top: '10%', right: '-20%',
          animation: 'nl-b3 calc(30s / var(--nl-speed, 1)) ease-in-out infinite',
        }}
      />
    </div>
  );
}

function Embers() {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: '#000' }}>
      <div
        style={{
          position: 'absolute', bottom: '-20%', left: '-20%', right: '-20%', height: '100vmax',
          background: 'radial-gradient(ellipse at 50% 90%, #ff4400 0%, #cc1100 20%, transparent 60%)',
          filter: 'blur(40px)',
          animation: 'nl-eg calc(7s / var(--nl-speed, 1)) ease-in-out infinite',
        }}
      />
      <div
        className="nl-blob"
        style={{
          width: '60vmax', height: '60vmax',
          background: 'radial-gradient(circle, #ff8800 0%, transparent 60%)',
          opacity: 0.2, bottom: '-10%', left: '30%',
          animation: 'nl-er calc(9s / var(--nl-speed, 1)) ease-in-out infinite',
        }}
      />
      <div
        className="nl-blob"
        style={{
          width: '50vmax', height: '50vmax',
          background: 'radial-gradient(circle, #cc0000 0%, transparent 65%)',
          opacity: 0.18, bottom: '-10%', right: '10%',
          animationName: 'nl-er',
          animationDuration: 'calc(12s / var(--nl-speed, 1))',
          animationTimingFunction: 'ease-in-out',
          animationIterationCount: 'infinite',
          animationDelay: '2s',
        }}
      />
    </div>
  );
}

const PatternComponents = [Plasma, Aurora, Lava, Ocean, Embers];

export default function NightlightClient() {
  const [patternIdx, setPatternIdx] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const [stayOnEnabled, setStayOnEnabled] = useState(false);
  const [wakeLockSupported, setWakeLockSupported] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);

  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const pointerOnMenuRef = useRef(false);

  const requestWakeLock = useCallback(async () => {
    if (!wakeLockSupported || wakeLockRef.current) return;
    try {
      if (document.visibilityState !== 'visible') return;
      const sentinel = await (navigator as NavigatorWithWakeLock).wakeLock?.request('screen');
      if (!sentinel) return;
      wakeLockRef.current = sentinel;
      const onRelease = () => { wakeLockRef.current = null; };
      sentinel.addEventListener?.('release', onRelease);
      sentinel.onrelease = onRelease;
    } catch {
      wakeLockRef.current = null;
    }
  }, [wakeLockSupported]);

  const releaseWakeLock = async () => {
    try { await wakeLockRef.current?.release?.(); } catch { /* ignore */ }
    finally { wakeLockRef.current = null; }
  };

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      try {
        setWakeLockSupported(Boolean((navigator as NavigatorWithWakeLock).wakeLock?.request));
      } catch { setWakeLockSupported(false); }
    }

    // Restore persisted speed
    try {
      const saved = localStorage.getItem('nl-speed');
      if (saved && SPEEDS.includes(Number(saved) as Speed)) {
        setSpeed(Number(saved) as Speed);
      }
    } catch { /* ignore */ }

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && stayOnEnabled && !wakeLockRef.current) {
        void requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      wakeLockRef.current?.release?.().catch(() => {}).finally(() => { wakeLockRef.current = null; });
    };
  }, [requestWakeLock, stayOnEnabled]);

  const toggleWakeLock = async () => {
    if (!wakeLockSupported) return;
    const next = !stayOnEnabled;
    setStayOnEnabled(next);
    if (next) await requestWakeLock();
    else await releaseWakeLock();
  };

  const changeSpeed = (s: Speed) => {
    setSpeed(s);
    try { localStorage.setItem('nl-speed', String(s)); } catch { /* ignore */ }
  };

  // Auto-dismiss menu 4s after it appears
  useEffect(() => {
    if (!menuVisible) return;
    const t = setTimeout(() => setMenuVisible(false), 4000);
    return () => clearTimeout(t);
  }, [menuVisible]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (menuRef.current?.contains(e.target as Node)) {
      pointerOnMenuRef.current = true;
      return;
    }
    pointerOnMenuRef.current = false;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (pointerOnMenuRef.current) return;
    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      setPatternIdx(i => (i + (dx < 0 ? 1 : -1) + PATTERNS.length) % PATTERNS.length);
      setMenuVisible(false);
    } else if (dist < 15) {
      setMenuVisible(v => !v);
    }
  };

  return (
    <>
      <style>{`
        .nl-blob { position: absolute; border-radius: 50%; filter: blur(65px); }
        @keyframes nl-hue { from { filter: hue-rotate(0deg); } to { filter: hue-rotate(360deg); } }
        @keyframes nl-b1 {
          0%,100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(20vw,15vh) scale(1.1); }
          66% { transform: translate(-10vw,25vh) scale(0.9); }
        }
        @keyframes nl-b2 {
          0%,100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(-25vw,-20vh) scale(0.8); }
          66% { transform: translate(15vw,-10vh) scale(1.2); }
        }
        @keyframes nl-b3 {
          0%,100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(-20vw,20vh) scale(1.15); }
        }
        @keyframes nl-b4 {
          0%,100% { transform: translate(0,0) scale(1); }
          40% { transform: translate(15vw,-15vh) scale(0.85); }
          80% { transform: translate(-10vw,10vh) scale(1.1); }
        }
        @keyframes nl-a1 {
          0%,100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(-12vh); opacity: 0.7; }
        }
        @keyframes nl-a2 {
          0%,100% { transform: translateY(0); opacity: 0.35; }
          50% { transform: translateY(8vh); opacity: 0.55; }
        }
        @keyframes nl-a3 {
          0%,100% { transform: translateY(0); opacity: 0.25; }
          50% { transform: translateY(-5vh); opacity: 0.45; }
        }
        @keyframes nl-oc {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes nl-eg {
          0%,100% { opacity: 0.35; }
          50% { opacity: 0.52; }
        }
        @keyframes nl-er {
          0%,100% { transform: translateY(0) scale(1); opacity: 0.2; }
          50% { transform: translateY(-8vh) scale(1.05); opacity: 0.3; }
        }
      `}</style>

      <div
        className="absolute inset-0 touch-none select-none"
        style={{ '--nl-speed': speed } as React.CSSProperties}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onContextMenu={e => e.preventDefault()}
      >
        {PatternComponents.map((Pattern, i) => (
          <div
            key={i}
            style={{ display: patternIdx === i ? 'block' : 'none', position: 'absolute', inset: 0 }}
          >
            <Pattern />
          </div>
        ))}

        {/* Slide-up menu */}
        <div
          ref={menuRef}
          className="fixed bottom-0 left-0 right-0 transition-transform duration-300 ease-out"
          style={{ transform: menuVisible ? 'translateY(0)' : 'translateY(110%)', zIndex: 10 }}
        >
          <div
            className="mx-4 mb-6 rounded-2xl p-5 flex flex-col gap-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(16px)' }}
          >
            {/* Pattern name + dot picker */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>
                {PATTERNS[patternIdx]}
              </span>
              <div className="flex gap-2.5 items-center">
                {PATTERNS.map((name, i) => (
                  <button
                    key={i}
                    onClick={() => setPatternIdx(i)}
                    aria-label={`Switch to ${name}`}
                    style={{
                      width: i === patternIdx ? 10 : 8,
                      height: i === patternIdx ? 10 : 8,
                      borderRadius: '50%',
                      background: i === patternIdx ? 'white' : 'rgba(255,255,255,0.3)',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      padding: 0,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Speed control */}
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Speed</span>
              <div className="flex gap-2">
                {SPEEDS.map((s, i) => (
                  <button
                    key={s}
                    onClick={() => changeSpeed(s)}
                    aria-label={`Set speed to ${SPEED_LABELS[i]}`}
                    style={{
                      padding: '5px 10px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                      background: speed === s ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                      color: speed === s ? 'white' : 'rgba(255,255,255,0.45)',
                      border: speed === s ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {SPEED_LABELS[i]}
                  </button>
                ))}
              </div>
            </div>

            {/* Wake lock toggle */}
            <button
              onClick={toggleWakeLock}
              disabled={!wakeLockSupported}
              aria-pressed={stayOnEnabled}
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 12, fontSize: 14, fontWeight: 500,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: stayOnEnabled ? 'rgba(22,163,74,0.65)' : 'rgba(255,255,255,0.1)',
                color: stayOnEnabled ? 'white' : 'rgba(255,255,255,0.6)',
                border: 'none', cursor: wakeLockSupported ? 'pointer' : 'not-allowed',
                opacity: wakeLockSupported ? 1 : 0.4,
              }}
            >
              <span
                style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: stayOnEnabled ? 'white' : 'rgba(255,255,255,0.4)',
                }}
                aria-hidden
              />
              {!wakeLockSupported
                ? 'Stay On: Not supported'
                : stayOnEnabled
                ? 'Screen: Stay On'
                : 'Screen: Sleep normally'}
            </button>

            {/* Back link */}
            <Link
              href="/finaglings"
              style={{
                textAlign: 'center', color: 'rgba(255,255,255,0.4)',
                fontSize: 14, textDecoration: 'none',
              }}
            >
              ← Back to Finaglings
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
