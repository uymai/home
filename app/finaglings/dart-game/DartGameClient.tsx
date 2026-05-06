'use client';

import { useState } from 'react';

const CX = 190;
const CY = 190;
const R_DOUBLE_BULL = 6.35;
const R_SINGLE_BULL = 15.9;
const R_SINGLE_INNER = 99;
const R_TRIPLE_OUTER = 107;
const R_DOUBLE_INNER = 162;
const R_DOUBLE_OUTER = 170;
const SEG_ANGLE = (2 * Math.PI) / 20;
const NUMBERS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

const C_SINGLE_A = '#f5f0dc';
const C_SINGLE_B = '#1a1a1a';
const C_SCORE_A = '#c41e3a';
const C_SCORE_B = '#1a6b3a';

type DartHit = { x: number; y: number; score: number; label: string };

function polarToXY(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.sin(angle), y: cy - r * Math.cos(angle) };
}

function arcPath(cx: number, cy: number, r1: number, r2: number, a1: number, a2: number): string {
  const p1 = polarToXY(cx, cy, r1, a1);
  const p2 = polarToXY(cx, cy, r2, a1);
  const p3 = polarToXY(cx, cy, r2, a2);
  const p4 = polarToXY(cx, cy, r1, a2);
  const large = a2 - a1 > Math.PI ? 1 : 0;
  return [
    `M ${p1.x} ${p1.y}`,
    `L ${p2.x} ${p2.y}`,
    `A ${r2} ${r2} 0 ${large} 1 ${p3.x} ${p3.y}`,
    `L ${p4.x} ${p4.y}`,
    `A ${r1} ${r1} 0 ${large} 0 ${p1.x} ${p1.y}`,
    'Z',
  ].join(' ');
}

function scoreClick(svgX: number, svgY: number): DartHit {
  const dx = svgX - CX;
  const dy = svgY - CY;
  const r = Math.sqrt(dx * dx + dy * dy);

  if (r <= R_DOUBLE_BULL) return { x: svgX, y: svgY, score: 50, label: 'D.Bull' };
  if (r <= R_SINGLE_BULL) return { x: svgX, y: svgY, score: 25, label: 'Bull' };
  if (r > R_DOUBLE_OUTER) return { x: svgX, y: svgY, score: 0, label: 'Miss' };

  let angle = Math.atan2(dx, -dy);
  if (angle < 0) angle += 2 * Math.PI;
  const adjusted = (angle + SEG_ANGLE / 2) % (2 * Math.PI);
  const segIdx = Math.floor(adjusted / SEG_ANGLE);
  const face = NUMBERS[segIdx];

  if (r > R_DOUBLE_INNER) return { x: svgX, y: svgY, score: face * 2, label: `D${face}` };
  if (r > R_SINGLE_INNER && r <= R_TRIPLE_OUTER) return { x: svgX, y: svgY, score: face * 3, label: `T${face}` };
  return { x: svgX, y: svgY, score: face, label: `${face}` };
}

export default function DartGameClient() {
  const [darts, setDarts] = useState<DartHit[]>([]);

  function handleBoardClick(e: React.MouseEvent<SVGSVGElement>) {
    if (darts.length >= 3) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * 380;
    const svgY = ((e.clientY - rect.top) / rect.height) * 380;
    setDarts(prev => [...prev, scoreClick(svgX, svgY)]);
  }

  const total = darts.reduce((s, d) => s + d.score, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
        <svg
          viewBox="0 0 380 380"
          width="100%"
          onClick={handleBoardClick}
          className={darts.length < 3 ? 'cursor-crosshair' : 'cursor-default'}
          aria-label="Dartboard — click to throw"
        >
          {/* Board background */}
          <circle cx={CX} cy={CY} r={R_DOUBLE_OUTER} fill="#111" />

          {/* Outer singles (r: tripleOuter → doubleInner) */}
          {NUMBERS.map((_, i) => {
            const a1 = i * SEG_ANGLE - SEG_ANGLE / 2;
            const a2 = a1 + SEG_ANGLE;
            return (
              <path
                key={`os${i}`}
                d={arcPath(CX, CY, R_TRIPLE_OUTER, R_DOUBLE_INNER, a1, a2)}
                fill={i % 2 === 0 ? C_SINGLE_A : C_SINGLE_B}
              />
            );
          })}

          {/* Triple ring (r: singleInner → tripleOuter) */}
          {NUMBERS.map((_, i) => {
            const a1 = i * SEG_ANGLE - SEG_ANGLE / 2;
            const a2 = a1 + SEG_ANGLE;
            return (
              <path
                key={`tr${i}`}
                d={arcPath(CX, CY, R_SINGLE_INNER, R_TRIPLE_OUTER, a1, a2)}
                fill={i % 2 === 0 ? C_SCORE_A : C_SCORE_B}
              />
            );
          })}

          {/* Inner singles (r: singleBull → singleInner) */}
          {NUMBERS.map((_, i) => {
            const a1 = i * SEG_ANGLE - SEG_ANGLE / 2;
            const a2 = a1 + SEG_ANGLE;
            return (
              <path
                key={`is${i}`}
                d={arcPath(CX, CY, R_SINGLE_BULL, R_SINGLE_INNER, a1, a2)}
                fill={i % 2 === 0 ? C_SINGLE_A : C_SINGLE_B}
              />
            );
          })}

          {/* Double ring (r: doubleInner → doubleOuter) */}
          {NUMBERS.map((_, i) => {
            const a1 = i * SEG_ANGLE - SEG_ANGLE / 2;
            const a2 = a1 + SEG_ANGLE;
            return (
              <path
                key={`db${i}`}
                d={arcPath(CX, CY, R_DOUBLE_INNER, R_DOUBLE_OUTER, a1, a2)}
                fill={i % 2 === 0 ? C_SCORE_A : C_SCORE_B}
              />
            );
          })}

          {/* Single bull */}
          <circle cx={CX} cy={CY} r={R_SINGLE_BULL} fill={C_SCORE_B} />
          {/* Double bull */}
          <circle cx={CX} cy={CY} r={R_DOUBLE_BULL} fill={C_SCORE_A} />

          {/* Thin wire lines between segments */}
          {NUMBERS.map((_, i) => {
            const a = i * SEG_ANGLE - SEG_ANGLE / 2;
            const inner = polarToXY(CX, CY, R_SINGLE_BULL, a);
            const outer = polarToXY(CX, CY, R_DOUBLE_OUTER, a);
            return (
              <line
                key={`w${i}`}
                x1={inner.x} y1={inner.y}
                x2={outer.x} y2={outer.y}
                stroke="#555" strokeWidth={0.5}
              />
            );
          })}

          {/* Ring wire circles */}
          {[R_SINGLE_BULL, R_SINGLE_INNER, R_TRIPLE_OUTER, R_DOUBLE_INNER, R_DOUBLE_OUTER].map(r => (
            <circle key={r} cx={CX} cy={CY} r={r} fill="none" stroke="#555" strokeWidth={0.5} />
          ))}

          {/* Number labels */}
          {NUMBERS.map((num, i) => {
            const pos = polarToXY(CX, CY, 184, i * SEG_ANGLE);
            return (
              <text
                key={`n${i}`}
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={11}
                fontWeight="bold"
                fill="#e5e5e5"
              >
                {num}
              </text>
            );
          })}

          {/* Dart markers */}
          {darts.map((dart, i) => (
            <g key={`dart${i}`} pointerEvents="none">
              <circle cx={dart.x} cy={dart.y} r={6} fill="none" stroke="white" strokeWidth={1.5} />
              <circle cx={dart.x} cy={dart.y} r={3} fill="#fbbf24" />
            </g>
          ))}
        </svg>
      </div>

      {/* Score panel */}
      <div className="flex gap-2">
        {[0, 1, 2].map(i => {
          const dart = darts[i];
          const isActive = i === darts.length && darts.length < 3;
          return (
            <div
              key={i}
              className={`flex-1 rounded-lg p-3 text-center transition-all
                ${dart ? 'bg-gray-100 dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900 opacity-60'}
                ${isActive ? 'ring-2 ring-amber-400' : ''}`}
            >
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Dart {i + 1}</div>
              <div className="text-2xl font-bold tabular-nums">{dart ? dart.score : '—'}</div>
              <div className="text-xs font-mono text-gray-500 dark:text-gray-400 h-4">
                {dart ? dart.label : ''}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl bg-gray-100 dark:bg-gray-800 p-4 text-center">
        <div className="text-sm text-gray-500 dark:text-gray-400">Total</div>
        <div className="text-5xl font-bold tabular-nums mt-1">{total}</div>
        {darts.length === 3 && (
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            {darts.map(d => d.label).join(' + ')}
          </div>
        )}
      </div>

      <button
        onClick={() => setDarts([])}
        className="w-full py-3 rounded-xl text-sm font-medium transition-colors
          bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
          border border-gray-200 dark:border-gray-700
          hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        Reset
      </button>
    </div>
  );
}
