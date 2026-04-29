'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { NOTE_NAMES, ROOT_FRETS, SCALES, type NoteName } from './scales';

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

const FRET_WIDTH = 65;
const STRING_GAP = 48;
const LEFT_MARGIN = 36;
const TOP_MARGIN = 28;
const RIGHT_PAD = 12;
const BOT_PAD = 12;
const DOT_R = 16;
const STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'e'];
const STRING_WIDTHS = [2.5, 2, 1.5, 1.5, 1, 1];

const INLAY_FRETS = new Set([3, 5, 7, 9, 15, 17, 19, 21]);

export default function GuitarLizardClient() {
  const [scaleIdx, setScaleIdx] = useState(0);
  const [keyNote, setKeyNote] = useState<NoteName>('A');
  const [posIdx, setPosIdx] = useState(0);

  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
  const [stayOnEnabled, setStayOnEnabled] = useState(false);
  const [wakeLockSupported, setWakeLockSupported] = useState(false);

  const scale = SCALES[scaleIdx];
  const position = scale.positions[posIdx];
  const rootFret = ROOT_FRETS[keyNote];

  let startFret = rootFret + position.startOffset;
  if (startFret < 0) startFret += 12;

  const svgWidth = LEFT_MARGIN + position.windowSize * FRET_WIDTH + RIGHT_PAD;
  const svgHeight = TOP_MARGIN + 5 * STRING_GAP + BOT_PAD;

  const requestWakeLock = useCallback(async () => {
    if (!wakeLockSupported || wakeLockRef.current) return;
    try {
      if (document.visibilityState !== 'visible') return;
      const sentinel = await (navigator as NavigatorWithWakeLock).wakeLock?.request('screen');
      if (!sentinel) return;
      wakeLockRef.current = sentinel;
      const onRelease = () => {
        wakeLockRef.current = null;
      };
      sentinel.addEventListener?.('release', onRelease);
      sentinel.onrelease = onRelease;
    } catch {
      wakeLockRef.current = null;
    }
  }, [wakeLockSupported]);

  const releaseWakeLock = async () => {
    try {
      await wakeLockRef.current?.release?.();
    } catch {
      // ignore
    } finally {
      wakeLockRef.current = null;
    }
  };

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      try {
        const supported = Boolean((navigator as NavigatorWithWakeLock).wakeLock?.request);
        setWakeLockSupported(supported);
      } catch {
        setWakeLockSupported(false);
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && stayOnEnabled && !wakeLockRef.current) {
        void requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (wakeLockRef.current) {
        wakeLockRef.current.release?.().catch(() => {}).finally(() => {
          wakeLockRef.current = null;
        });
      }
    };
  }, [requestWakeLock, stayOnEnabled]);

  const toggleWakeLock = async () => {
    if (!wakeLockSupported) return;
    const next = !stayOnEnabled;
    setStayOnEnabled(next);
    if (next) await requestWakeLock();
    else await releaseWakeLock();
  };

  const prevKey = () => {
    const idx = NOTE_NAMES.indexOf(keyNote);
    setKeyNote(NOTE_NAMES[(idx - 1 + NOTE_NAMES.length) % NOTE_NAMES.length]);
  };
  const nextKey = () => {
    const idx = NOTE_NAMES.indexOf(keyNote);
    setKeyNote(NOTE_NAMES[(idx + 1) % NOTE_NAMES.length]);
  };

  const prevPos = () => setPosIdx(i => (i - 1 + scale.positions.length) % scale.positions.length);
  const nextPos = () => setPosIdx(i => (i + 1) % scale.positions.length);

  return (
    <div className="flex flex-col gap-4">

      {/* Scale type selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
        {SCALES.map((s, i) => (
          <button
            key={s.id}
            onClick={() => { setScaleIdx(i); setPosIdx(0); }}
            className={`whitespace-nowrap px-4 py-2.5 rounded-full text-sm font-medium transition-colors flex-shrink-0 ${
              i === scaleIdx
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Key selector */}
      <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/60 rounded-xl px-4 py-3">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Key</span>
        <div className="flex items-center gap-3">
          <button
            onClick={prevKey}
            aria-label="Previous key"
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-white dark:bg-gray-700 shadow-sm text-xl leading-none hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            ‹
          </button>
          <span className="text-2xl font-bold w-10 text-center tabular-nums">{keyNote}</span>
          <button
            onClick={nextKey}
            aria-label="Next key"
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-white dark:bg-gray-700 shadow-sm text-xl leading-none hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            ›
          </button>
        </div>
      </div>

      {/* Fretboard diagram */}
      <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 p-3 overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          width="100%"
          aria-label={`${keyNote} ${scale.name} ${position.label}, frets ${startFret} to ${startFret + position.windowSize - 1}`}
        >
          {/* Fret number labels */}
          {Array.from({ length: position.windowSize }, (_, i) => (
            <text
              key={i}
              x={LEFT_MARGIN + (i + 0.5) * FRET_WIDTH}
              y={18}
              textAnchor="middle"
              fontSize={13}
              className="fill-gray-400 dark:fill-gray-500"
            >
              {startFret + i === 0 ? 'O' : startFret + i}
            </text>
          ))}

          {/* String name labels */}
          {STRING_NAMES.map((name, i) => (
            <text
              key={i}
              x={LEFT_MARGIN - 8}
              y={TOP_MARGIN + i * STRING_GAP + 5}
              textAnchor="end"
              fontSize={12}
              fontWeight={i === 0 ? 'bold' : 'normal'}
              className="fill-gray-500 dark:fill-gray-400"
            >
              {name}
            </text>
          ))}

          {/* Nut (when at open position) */}
          {startFret === 0 && (
            <rect
              x={LEFT_MARGIN - 3}
              y={TOP_MARGIN - 8}
              width={5}
              height={5 * STRING_GAP + 16}
              className="fill-gray-700 dark:fill-gray-200"
            />
          )}

          {/* Fret vertical lines */}
          {Array.from({ length: position.windowSize + 1 }, (_, i) => (
            <line
              key={i}
              x1={LEFT_MARGIN + i * FRET_WIDTH}
              y1={TOP_MARGIN}
              x2={LEFT_MARGIN + i * FRET_WIDTH}
              y2={TOP_MARGIN + 5 * STRING_GAP}
              strokeWidth={startFret === 0 && i === 0 ? 0 : 1}
              className="stroke-gray-300 dark:stroke-gray-600"
            />
          ))}

          {/* String horizontal lines */}
          {STRING_NAMES.map((_, i) => (
            <line
              key={i}
              x1={LEFT_MARGIN}
              y1={TOP_MARGIN + i * STRING_GAP}
              x2={LEFT_MARGIN + position.windowSize * FRET_WIDTH}
              y2={TOP_MARGIN + i * STRING_GAP}
              strokeWidth={STRING_WIDTHS[i]}
              className="stroke-gray-600 dark:stroke-gray-400"
            />
          ))}

          {/* Inlay position markers */}
          {Array.from({ length: position.windowSize }, (_, i) => {
            const fretNum = startFret + i;
            const cx = LEFT_MARGIN + (i + 0.5) * FRET_WIDTH;
            const midY = TOP_MARGIN + 2.5 * STRING_GAP;
            if (fretNum > 0 && fretNum % 12 === 0) {
              return (
                <g key={i}>
                  <circle cx={cx} cy={midY - STRING_GAP * 0.7} r={4} className="fill-amber-200 dark:fill-amber-800/60" />
                  <circle cx={cx} cy={midY + STRING_GAP * 0.7} r={4} className="fill-amber-200 dark:fill-amber-800/60" />
                </g>
              );
            }
            if (INLAY_FRETS.has(fretNum)) {
              return <circle key={i} cx={cx} cy={midY} r={4} className="fill-amber-200 dark:fill-amber-800/60" />;
            }
            return null;
          })}

          {/* Scale dots */}
          {position.dots.map((dot, i) => {
            const cx = LEFT_MARGIN + (dot.fretOffset + 0.5) * FRET_WIDTH;
            const cy = TOP_MARGIN + dot.stringIdx * STRING_GAP;
            const fill =
              dot.type === 'root' ? '#f97316' :
              dot.type === 'blue' ? '#0ea5e9' :
              '#6b7280';
            return (
              <g key={i}>
                <circle cx={cx} cy={cy} r={DOT_R} fill={fill} />
                {dot.type === 'root' && (
                  <text x={cx} y={cy + 5} textAnchor="middle" fontSize={12} fontWeight="bold" fill="white">
                    R
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-1 px-1">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center">
              <span className="text-white text-[9px] font-bold leading-none">R</span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">Root</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-gray-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Note</span>
          </div>
          {scale.id === 'blues' && (
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-sky-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Blue note</span>
            </div>
          )}
        </div>
      </div>

      {/* Position navigator */}
      <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/60 rounded-xl px-4 py-3">
        <button
          onClick={prevPos}
          aria-label="Previous position"
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-white dark:bg-gray-700 shadow-sm text-xl leading-none hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
        >
          ‹
        </button>
        <span className="text-sm font-medium text-center">
          {position.label}
          <span className="text-gray-400 dark:text-gray-500"> / {scale.positions.length}</span>
        </span>
        <button
          onClick={nextPos}
          aria-label="Next position"
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-white dark:bg-gray-700 shadow-sm text-xl leading-none hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
        >
          ›
        </button>
      </div>

      {/* Wake Lock toggle */}
      <button
        onClick={toggleWakeLock}
        disabled={!wakeLockSupported}
        aria-pressed={stayOnEnabled}
        title={
          !wakeLockSupported
            ? 'Screen stay-on not supported in this browser'
            : stayOnEnabled
            ? 'Screen is staying on. Tap to allow sleep.'
            : 'Keep screen on while practicing'
        }
        className={`w-full py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 border ${
          stayOnEnabled
            ? 'bg-green-600 text-white border-green-700 hover:bg-green-700'
            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
        } ${!wakeLockSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span
          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${stayOnEnabled ? 'bg-white' : 'bg-gray-400 dark:bg-gray-500'}`}
          aria-hidden
        />
        {!wakeLockSupported
          ? 'Stay On: Not supported'
          : stayOnEnabled
          ? 'Screen: Stay On'
          : 'Screen: Sleep normally'}
      </button>

    </div>
  );
}
