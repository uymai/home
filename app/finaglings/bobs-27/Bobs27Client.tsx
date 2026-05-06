'use client';

import { useRef, useState } from 'react';

type RoundResult = {
  number: number;
  hits: 0 | 1 | 2 | 3;
  delta: number;
  runningScore: number;
};

function calcDelta(number: number, hits: 0 | 1 | 2 | 3): number {
  return hits > 0 ? hits * number * 2 : -number;
}

const DELETE_THRESHOLD = 80;

export default function Bobs27Client() {
  const [results, setResults] = useState<RoundResult[]>([]);
  const [score, setScore] = useState(27);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const swipeDir = useRef<'h' | 'v' | null>(null);

  const currentRound = results.length + 1;
  const gameComplete = results.length === 20;
  const bust = score <= 0 && results.length > 0;
  const gameOver = gameComplete || bust;
  const isDeleting = swipeOffset >= DELETE_THRESHOLD;

  function recordHits(hits: 0 | 1 | 2 | 3) {
    const number = currentRound;
    const delta = calcDelta(number, hits);
    const newScore = score + delta;
    setResults(prev => [...prev, { number, hits, delta, runningScore: newScore }]);
    setScore(newScore);
    setSwipeOffset(0);
    setIsSwiping(false);
  }

  function deleteLastRound() {
    const last = results[results.length - 1];
    if (!last) return;
    setResults(prev => prev.slice(0, -1));
    setScore(s => s - last.delta);
    setSwipeOffset(0);
    setIsSwiping(false);
  }

  function reset() {
    setResults([]);
    setScore(27);
    setSwipeOffset(0);
    setIsSwiping(false);
  }

  function onPointerDown(e: React.PointerEvent) {
    startX.current = e.clientX;
    startY.current = e.clientY;
    swipeDir.current = null;
  }

  function onPointerMove(e: React.PointerEvent) {
    if (startX.current === null || startY.current === null) return;
    const dx = startX.current - e.clientX;
    const dy = Math.abs(e.clientY - startY.current);

    if (swipeDir.current === null && (Math.abs(dx) > 5 || dy > 5)) {
      swipeDir.current = Math.abs(dx) > dy ? 'h' : 'v';
      if (swipeDir.current === 'h') {
        setIsSwiping(true);
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    }
    if (swipeDir.current !== 'h') return;
    setSwipeOffset(Math.max(0, Math.min(dx, DELETE_THRESHOLD + 40)));
  }

  function onPointerUp() {
    if (swipeOffset >= DELETE_THRESHOLD) {
      deleteLastRound();
    } else {
      setSwipeOffset(0);
      setIsSwiping(false);
    }
    startX.current = null;
    startY.current = null;
    swipeDir.current = null;
  }

  return (
    <div className="space-y-6">
      <div className="text-center py-6">
        <div
          className={`text-7xl font-bold tabular-nums ${
            score > 0
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}
        >
          {score}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">points</div>
      </div>

      {!gameOver && (
        <>
          <div className="text-center">
            <div className="text-lg font-semibold">
              Round {currentRound} of 20 — Double {currentRound}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {currentRound * 2} pts per hit · miss all 3 = −{currentRound}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {([0, 1, 2, 3] as const).map(h => (
              <button
                key={h}
                onClick={() => recordHits(h)}
                className="py-4 rounded-xl font-semibold text-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
              >
                {h}
                <span className="block text-xs font-normal text-gray-500 dark:text-gray-400">
                  {h === 1 ? 'hit' : 'hits'}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {gameOver && (
        <div className="text-center py-4 space-y-3">
          {bust ? (
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">Bust!</div>
          ) : (
            <div className="text-2xl font-bold">Game Complete!</div>
          )}
          <div className="text-gray-600 dark:text-gray-400">
            Final score: <span className="font-semibold">{score}</span>
          </div>
          <button
            onClick={reset}
            className="mt-2 px-6 py-2 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-lg font-semibold hover:opacity-80 transition-opacity"
          >
            Play Again
          </button>
        </div>
      )}

      {results.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden text-sm">
          <div className="grid grid-cols-5 px-3 py-2 bg-gray-50 dark:bg-gray-800 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
            <div>#</div>
            <div>Tgt</div>
            <div className="text-center">Hits</div>
            <div className="text-right">Chg</div>
            <div className="text-right">Score</div>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {results.map((r, i) => {
              const isLast = i === results.length - 1;
              return (
                <div key={i} className="relative overflow-hidden">
                  {isLast && (
                    <div
                      className={`absolute inset-y-0 right-0 w-24 flex items-center justify-center text-white text-xs font-semibold uppercase tracking-wide transition-colors duration-100 ${
                        isDeleting ? 'bg-red-600' : 'bg-red-400'
                      }`}
                    >
                      {isDeleting ? 'Release' : 'Delete'}
                    </div>
                  )}
                  <div
                    className="grid grid-cols-5 px-3 py-2 tabular-nums bg-white dark:bg-gray-900 select-none"
                    style={
                      isLast
                        ? {
                            transform: `translateX(-${swipeOffset}px)`,
                            transition: isSwiping ? 'none' : 'transform 0.2s ease-out',
                            touchAction: 'pan-y',
                          }
                        : undefined
                    }
                    onPointerDown={isLast ? onPointerDown : undefined}
                    onPointerMove={isLast ? onPointerMove : undefined}
                    onPointerUp={isLast ? onPointerUp : undefined}
                    onPointerCancel={isLast ? onPointerUp : undefined}
                  >
                    <div className="text-gray-500 dark:text-gray-400">{i + 1}</div>
                    <div className="font-medium">D{r.number}</div>
                    <div className="text-center">{r.hits}</div>
                    <div
                      className={`text-right font-medium ${
                        r.delta > 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {r.delta > 0 ? '+' : ''}{r.delta}
                    </div>
                    <div className="text-right font-semibold">{r.runningScore}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!gameOver && results.length > 0 && (
        <div className="text-center">
          <button
            onClick={reset}
            className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
