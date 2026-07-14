'use client';

import { useReducer } from 'react';
import Link from 'next/link';
import {
  ACTIVE_CHARACTER_ID,
  RINK_COLS,
  RINK_ROWS,
  ROSTER,
  createInitialState,
  generateSeed,
  isBlueLine,
  isCenterLine,
  isCrease,
  isPlayableCell,
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

const RINK_CELLS = Array.from({ length: RINK_ROWS }, (_, row) =>
  Array.from({ length: RINK_COLS }, (_, col) => ({ col, row })),
).flat();

function cellClassName(col: number, row: number): string {
  if (!isPlayableCell(col, row)) {
    return 'bg-slate-300 dark:bg-slate-950';
  }
  if (isCrease(col, row)) {
    return 'bg-sky-200 dark:bg-sky-900';
  }
  if (isCenterLine(col)) {
    return 'bg-red-200 dark:bg-red-900';
  }
  if (isBlueLine(col)) {
    return 'bg-blue-200 dark:bg-blue-900';
  }
  return 'bg-sky-50 dark:bg-slate-800';
}

export default function HockeyClient() {
  const [state, dispatch] = useReducer(reduceGameState, generateSeed(), createInitialState);
  const midSkate = state.remainingPoints > 0;

  return (
    <div className="min-h-screen p-8 sm:p-12 max-w-4xl mx-auto">
      <header className="mb-12 text-center">
        <Link href="/" className="inline-block">
          <h1 className="text-4xl font-bold tracking-tight">Checks and Creases</h1>
          <p className="mt-2 text-xl text-gray-600 dark:text-gray-400">The start of an online hockey game</p>
        </Link>
      </header>

      <section
        className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-400 dark:border-slate-700"
        style={{ aspectRatio: `${RINK_COLS} / ${RINK_ROWS}` }}
      >
        <div
          className="grid h-full w-full"
          style={{
            gridTemplateColumns: `repeat(${RINK_COLS}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${RINK_ROWS}, minmax(0, 1fr))`,
          }}
        >
          {RINK_CELLS.map(({ col, row }) => (
            <div
              key={`${col}-${row}`}
              className={`border border-black/5 dark:border-white/5 ${cellClassName(col, row)}`}
            />
          ))}
        </div>
        <div
          className="absolute h-[8%] w-[8%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600 ring-2 ring-black transition-all duration-300 dark:ring-white"
          style={{
            left: `${((state.position.col + 0.5) / RINK_COLS) * 100}%`,
            top: `${((state.position.row + 0.5) / RINK_ROWS) * 100}%`,
          }}
          title={state.character.name}
        />
      </section>

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
