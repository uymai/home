'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { EFFECTS, type Effect } from './renderers';

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

const SPEEDS = [0.5, 1, 2, 3] as const;
const SPEED_LABELS = ['½×', '1×', '2×', '3×'] as const;
type Speed = typeof SPEEDS[number];

/**
 * Low-resolution canvas stretched to fill the screen, animated with
 * requestAnimationFrame. Remount (via `key`) to switch effects.
 */
function CanvasEffect({ effect, speed }: { effect: Effect; speed: Speed }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const speedRef = useRef(speed);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const renderer = effect.create();
    let image: ImageData | null = null;

    const resize = () => {
      const { cols, rows } = renderer.size(window.innerWidth, window.innerHeight);
      canvas.width = cols;
      canvas.height = rows;
      image = ctx.createImageData(cols, rows);
      renderer.init(cols, rows);
    };
    resize();
    window.addEventListener('resize', resize);

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000) * speedRef.current;
      last = now;
      if (image) {
        renderer.draw(image.data, image.width, image.height, dt);
        ctx.putImageData(image, 0, 0);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [effect]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ background: '#000', imageRendering: effect.pixelated ? 'pixelated' : 'auto' }}
    />
  );
}

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
      setPatternIdx(i => (i + (dx < 0 ? 1 : -1) + EFFECTS.length) % EFFECTS.length);
      setMenuVisible(false);
    } else if (dist < 15) {
      setMenuVisible(v => !v);
    }
  };

  return (
    <>

      <div
        className="absolute inset-0 touch-none select-none"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onContextMenu={e => e.preventDefault()}
      >
        <CanvasEffect key={patternIdx} effect={EFFECTS[patternIdx]} speed={speed} />

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
                {EFFECTS[patternIdx].name}
              </span>
              <div className="flex gap-2.5 items-center">
                {EFFECTS.map(({ name }, i) => (
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
