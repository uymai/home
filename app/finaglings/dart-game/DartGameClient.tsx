'use client';

import { useRef, useState } from 'react';

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
const ZOOM_RADIUS = 45; // SVG units visible from center in zoom mode

const C_SINGLE_A = '#f5f0dc';
const C_SINGLE_B = '#1a1a1a';
const C_SCORE_A = '#c41e3a';
const C_SCORE_B = '#1a6b3a';

type DartHit = { x: number; y: number; score: number; label: string };
type Pos = { x: number; y: number };

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

function fullBoardCoords(clientX: number, clientY: number, rect: DOMRect): Pos {
  return {
    x: ((clientX - rect.left) / rect.width) * 380,
    y: ((clientY - rect.top) / rect.height) * 380,
  };
}

function zoomedCoords(clientX: number, clientY: number, rect: DOMRect, origin: Pos): Pos {
  return {
    x: (origin.x - ZOOM_RADIUS) + ((clientX - rect.left) / rect.width) * (ZOOM_RADIUS * 2),
    y: (origin.y - ZOOM_RADIUS) + ((clientY - rect.top) / rect.height) * (ZOOM_RADIUS * 2),
  };
}

export default function DartGameClient() {
  const [darts, setDarts] = useState<DartHit[]>([]);
  // zoomOrigin is stored in a ref so pointer-move always reads the latest
  // value without waiting for a re-render. aimPos is state so the crosshair
  // and live label re-render as the finger drags.
  const zoomOrigin = useRef<Pos | null>(null);
  const [aimPos, setAimPos] = useState<Pos | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const isZoomed = aimPos !== null;
  const liveHit = isZoomed ? scoreClick(aimPos.x, aimPos.y) : null;

  const viewBox = isZoomed && zoomOrigin.current
    ? `${zoomOrigin.current.x - ZOOM_RADIUS} ${zoomOrigin.current.y - ZOOM_RADIUS} ${ZOOM_RADIUS * 2} ${ZOOM_RADIUS * 2}`
    : '0 0 380 380';

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (darts.length >= 3) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = fullBoardCoords(e.clientX, e.clientY, rect);
    zoomOrigin.current = pos;
    setAimPos(pos);
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!zoomOrigin.current) return;
    const rect = svgRef.current!.getBoundingClientRect();
    setAimPos(zoomedCoords(e.clientX, e.clientY, rect, zoomOrigin.current));
  }

  function handlePointerUp() {
    if (!zoomOrigin.current || !aimPos) return;
    setDarts(prev => [...prev, scoreClick(aimPos.x, aimPos.y)]);
    zoomOrigin.current = null;
    setAimPos(null);
  }

  function handlePointerCancel() {
    zoomOrigin.current = null;
    setAimPos(null);
  }

  const total = darts.reduce((s, d) => s + d.score, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className={`rounded-xl overflow-hidden border transition-colors ${isZoomed ? 'border-amber-400' : 'border-gray-200 dark:border-gray-700'}`}>
        <svg
          ref={svgRef}
          viewBox={viewBox}
          width="100%"
          style={{ touchAction: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          className={darts.length < 3 ? 'cursor-crosshair' : 'cursor-default'}
          aria-label="Dartboard — press and hold to zoom, drag to aim, release to throw"
        >
          {/* Board background */}
          <circle cx={CX} cy={CY} r={R_DOUBLE_OUTER} fill="#111" />

          {/* Outer singles (tripleOuter → doubleInner) */}
          {NUMBERS.map((_, i) => {
            const a1 = i * SEG_ANGLE - SEG_ANGLE / 2;
            return (
              <path
                key={`os${i}`}
                d={arcPath(CX, CY, R_TRIPLE_OUTER, R_DOUBLE_INNER, a1, a1 + SEG_ANGLE)}
                fill={i % 2 === 0 ? C_SINGLE_A : C_SINGLE_B}
              />
            );
          })}

          {/* Triple ring (singleInner → tripleOuter) */}
          {NUMBERS.map((_, i) => {
            const a1 = i * SEG_ANGLE - SEG_ANGLE / 2;
            return (
              <path
                key={`tr${i}`}
                d={arcPath(CX, CY, R_SINGLE_INNER, R_TRIPLE_OUTER, a1, a1 + SEG_ANGLE)}
                fill={i % 2 === 0 ? C_SCORE_A : C_SCORE_B}
              />
            );
          })}

          {/* Inner singles (singleBull → singleInner) */}
          {NUMBERS.map((_, i) => {
            const a1 = i * SEG_ANGLE - SEG_ANGLE / 2;
            return (
              <path
                key={`is${i}`}
                d={arcPath(CX, CY, R_SINGLE_BULL, R_SINGLE_INNER, a1, a1 + SEG_ANGLE)}
                fill={i % 2 === 0 ? C_SINGLE_A : C_SINGLE_B}
              />
            );
          })}

          {/* Double ring (doubleInner → doubleOuter) */}
          {NUMBERS.map((_, i) => {
            const a1 = i * SEG_ANGLE - SEG_ANGLE / 2;
            return (
              <path
                key={`db${i}`}
                d={arcPath(CX, CY, R_DOUBLE_INNER, R_DOUBLE_OUTER, a1, a1 + SEG_ANGLE)}
                fill={i % 2 === 0 ? C_SCORE_A : C_SCORE_B}
              />
            );
          })}

          {/* Single bull */}
          <circle cx={CX} cy={CY} r={R_SINGLE_BULL} fill={C_SCORE_B} />
          {/* Double bull */}
          <circle cx={CX} cy={CY} r={R_DOUBLE_BULL} fill={C_SCORE_A} />

          {/* Wire lines between segments */}
          {NUMBERS.map((_, i) => {
            const a = i * SEG_ANGLE - SEG_ANGLE / 2;
            const inner = polarToXY(CX, CY, R_SINGLE_BULL, a);
            const outer = polarToXY(CX, CY, R_DOUBLE_OUTER, a);
            return (
              <line key={`w${i}`} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="#555" strokeWidth={0.5} />
            );
          })}

          {/* Ring wire circles */}
          {[R_SINGLE_BULL, R_SINGLE_INNER, R_TRIPLE_OUTER, R_DOUBLE_INNER, R_DOUBLE_OUTER].map(r => (
            <circle key={r} cx={CX} cy={CY} r={r} fill="none" stroke="#555" strokeWidth={0.5} />
          ))}

          {/* Number labels (only shown when not zoomed, they'd be huge/off-screen when zoomed) */}
          {!isZoomed && NUMBERS.map((num, i) => {
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

          {/* Dart markers (always shown so landed darts are visible when zoomed) */}
          {darts.map((dart, i) => (
            <g key={`dart${i}`} pointerEvents="none">
              <circle cx={dart.x} cy={dart.y} r={6} fill="none" stroke="white" strokeWidth={1.5} />
              <circle cx={dart.x} cy={dart.y} r={3} fill="#fbbf24" />
            </g>
          ))}

          {/* Aim crosshair while zoomed */}
          {isZoomed && aimPos && (
            <g pointerEvents="none">
              <line x1={aimPos.x - 8} y1={aimPos.y} x2={aimPos.x + 8} y2={aimPos.y} stroke="white" strokeWidth={1} />
              <line x1={aimPos.x} y1={aimPos.y - 8} x2={aimPos.x} y2={aimPos.y + 8} stroke="white" strokeWidth={1} />
              <circle cx={aimPos.x} cy={aimPos.y} r={3} fill="none" stroke="white" strokeWidth={1} />
            </g>
          )}
        </svg>
      </div>

      {/* Live aim label while zoomed */}
      <div className="h-6 text-center text-sm font-mono">
        {isZoomed && liveHit ? (
          <span className="text-amber-500 font-bold">
            {liveHit.label} &mdash; {liveHit.score} pts
          </span>
        ) : (
          <span className="text-gray-400 dark:text-gray-600 text-xs">
            {darts.length < 3 ? 'Hold & drag to aim, release to throw' : ''}
          </span>
        )}
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
