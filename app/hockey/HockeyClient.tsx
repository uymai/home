'use client';

import { useEffect, useMemo, useReducer, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import Link from 'next/link';
import {
  ACTIVE_CHARACTER_ID,
  BLUE_LINE_X_FT,
  CENTER_LINE_X_FT,
  CORNER_RADIUS_FT,
  CREASE_RADIUS_FT,
  FACEOFF_CIRCLES,
  FACEOFF_CIRCLE_RADIUS_FT,
  FACEOFF_DOT_RADIUS_FT,
  FEET_PER_CELL,
  GOAL_LINE_X_FT,
  RINK_LENGTH_FT,
  RINK_WIDTH_FT,
  ROSTER,
  createInitialState,
  generateSeed,
  reduceGameState,
} from './engine';
import { Direction } from './types';

const DIRECTION_LABELS: Record<Direction, string> = {
  N: '↑',
  NE: '↗',
  E: '→',
  SE: '↘',
  S: '↓',
  SW: '↙',
  W: '←',
  NW: '↖',
};

const COMPASS_LAYOUT: Array<Direction | null> = ['NW', 'N', 'NE', 'W', null, 'E', 'SW', 'S', 'SE'];

const PX_PER_FOOT = 8;
const RINK_PX_WIDTH = RINK_LENGTH_FT * PX_PER_FOOT;
const RINK_PX_HEIGHT = RINK_WIDTH_FT * PX_PER_FOOT;
const RINK_MID_WIDTH_FT = RINK_WIDTH_FT / 2;

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  scrollLeft: number;
  scrollTop: number;
};

export default function HockeyClient() {
  const [state, dispatch] = useReducer(reduceGameState, generateSeed(), createInitialState);
  const midSkate = state.remainingPoints > 0;

  const viewportRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const hasCenteredRef = useRef(false);

  const characterPx = useMemo(
    () => ({
      x: (state.position.col + 0.5) * FEET_PER_CELL * PX_PER_FOOT,
      y: (state.position.row + 0.5) * FEET_PER_CELL * PX_PER_FOOT,
    }),
    [state.position],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    viewport.scrollTo({
      left: characterPx.x - viewport.clientWidth / 2,
      top: characterPx.y - viewport.clientHeight / 2,
      behavior: hasCenteredRef.current ? 'smooth' : 'auto',
    });
    hasCenteredRef.current = true;
  }, [characterPx]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    viewport.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    const viewport = viewportRef.current;
    if (!drag || !viewport || drag.pointerId !== event.pointerId) {
      return;
    }
    viewport.scrollLeft = drag.scrollLeft - (event.clientX - drag.startX);
    viewport.scrollTop = drag.scrollTop - (event.clientY - drag.startY);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    viewportRef.current?.releasePointerCapture(event.pointerId);
    dragStateRef.current = null;
  };

  return (
    <div className="min-h-screen p-8 sm:p-12 max-w-4xl mx-auto">
      <header className="mb-12 text-center">
        <Link href="/" className="inline-block">
          <h1 className="text-4xl font-bold tracking-tight">Checks and Creases</h1>
          <p className="mt-2 text-xl text-gray-600 dark:text-gray-400">The start of an online hockey game</p>
        </Link>
      </header>

      <div
        ref={viewportRef}
        className="relative mx-auto h-[65vh] w-full max-w-3xl overflow-auto rounded-2xl border border-slate-400 [touch-action:none] cursor-grab active:cursor-grabbing dark:border-slate-700"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="relative" style={{ width: RINK_PX_WIDTH, height: RINK_PX_HEIGHT }}>
          <svg
            width={RINK_PX_WIDTH}
            height={RINK_PX_HEIGHT}
            viewBox={`0 0 ${RINK_LENGTH_FT} ${RINK_WIDTH_FT}`}
            className="block select-none"
          >
            <rect
              x={0.5}
              y={0.5}
              width={RINK_LENGTH_FT - 1}
              height={RINK_WIDTH_FT - 1}
              rx={CORNER_RADIUS_FT}
              ry={CORNER_RADIUS_FT}
              className="fill-sky-50 stroke-slate-400 dark:fill-slate-800 dark:stroke-slate-600"
              strokeWidth={0.5}
            />

            {GOAL_LINE_X_FT.map((goalX, index) => {
              const sweep = index === 0 ? 1 : 0;
              return (
                <path
                  key={`crease-${index}`}
                  d={`M ${goalX} ${RINK_MID_WIDTH_FT - CREASE_RADIUS_FT} A ${CREASE_RADIUS_FT} ${CREASE_RADIUS_FT} 0 0 ${sweep} ${goalX} ${
                    RINK_MID_WIDTH_FT + CREASE_RADIUS_FT
                  } Z`}
                  className="fill-sky-200 dark:fill-sky-900"
                />
              );
            })}

            {GOAL_LINE_X_FT.map((x, index) => (
              <line key={`goal-${index}`} x1={x} y1={0} x2={x} y2={RINK_WIDTH_FT} className="stroke-red-500" strokeWidth={0.5} />
            ))}

            {BLUE_LINE_X_FT.map((x, index) => (
              <line key={`blue-${index}`} x1={x} y1={0} x2={x} y2={RINK_WIDTH_FT} className="stroke-blue-500" strokeWidth={0.8} />
            ))}

            <line x1={CENTER_LINE_X_FT} y1={0} x2={CENTER_LINE_X_FT} y2={RINK_WIDTH_FT} className="stroke-red-500" strokeWidth={0.8} />

            {FACEOFF_CIRCLES.map((circle, index) => (
              <g key={`faceoff-${index}`}>
                <circle
                  cx={circle.x}
                  cy={circle.y}
                  r={FACEOFF_CIRCLE_RADIUS_FT}
                  fill="none"
                  className={circle.color === 'blue' ? 'stroke-blue-500' : 'stroke-red-500'}
                  strokeWidth={0.5}
                />
                <circle
                  cx={circle.x}
                  cy={circle.y}
                  r={FACEOFF_DOT_RADIUS_FT}
                  className={circle.color === 'blue' ? 'fill-blue-500' : 'fill-red-500'}
                />
              </g>
            ))}
          </svg>

          <div
            className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600 ring-2 ring-black transition-all duration-300 dark:ring-white"
            style={{ left: characterPx.x, top: characterPx.y }}
            title={state.character.name}
          />
        </div>
      </div>

      <section className="mt-8 flex flex-col items-center gap-4">
        <p className="text-lg font-semibold">Points remaining: {state.remainingPoints}</p>

        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => dispatch({ type: 'roll' })}
            disabled={midSkate}
            className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
          >
            Take a Skate
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'end-skate' })}
            disabled={!midSkate}
            className="rounded-lg bg-slate-600 px-4 py-2 font-semibold text-white transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
          >
            End Skate
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'new-game' })}
            className="rounded-lg bg-gray-500 px-4 py-2 font-semibold text-white transition-all hover:scale-105 dark:bg-gray-700"
          >
            New Game
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {COMPASS_LAYOUT.map((direction, index) =>
            direction ? (
              <button
                key={direction}
                type="button"
                onClick={() => dispatch({ type: 'step', direction })}
                disabled={!midSkate}
                className="h-12 w-12 rounded-lg bg-sky-600 text-xl font-bold text-white transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
              >
                {DIRECTION_LABELS[direction]}
              </button>
            ) : (
              <div key={`spacer-${index}`} />
            ),
          )}
        </div>
      </section>

      <section className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2">
        <div>
          <h2 className="mb-3 text-xl font-bold">Roster</h2>
          <ul className="flex flex-col gap-2">
            {ROSTER.map((character) => (
              <li
                key={character.id}
                className={`rounded-lg p-3 ${character.color} ${
                  character.id === state.character.id ? 'ring-2 ring-black dark:ring-white' : ''
                }`}
              >
                <p className="font-semibold">{character.name}</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {character.role} · d{character.dieSides}
                  {character.id === ACTIVE_CHARACTER_ID ? ' · on the ice' : ''}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-3 text-xl font-bold">Log</h2>
          <ul className="flex max-h-64 flex-col-reverse gap-1 overflow-y-auto rounded-lg border border-gray-300 p-3 text-sm dark:border-gray-700">
            {state.log.map((entry, index) => (
              <li key={index}>{entry}</li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="mt-16 pb-8 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>© {new Date().getFullYear()} uymai.net. All rights reserved.</p>
      </footer>
    </div>
  );
}
