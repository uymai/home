'use client';

import { useState } from 'react';

type RoundResult = {
  number: number;
  hits: 0 | 1 | 2 | 3;
  delta: number;
  runningScore: number;
};

function calcDelta(number: number, hits: 0 | 1 | 2 | 3): number {
  return hits > 0 ? hits * number * 2 : -number;
}

export default function Bobs27Client() {
  const [results, setResults] = useState<RoundResult[]>([]);
  const [score, setScore] = useState(27);

  const currentRound = results.length + 1;
  const gameComplete = results.length === 20;
  const bust = score <= 0 && results.length > 0;
  const gameOver = gameComplete || bust;

  function recordHits(hits: 0 | 1 | 2 | 3) {
    const number = currentRound;
    const delta = calcDelta(number, hits);
    const newScore = score + delta;
    setResults(prev => [...prev, { number, hits, delta, runningScore: newScore }]);
    setScore(newScore);
  }

  function reset() {
    setResults([]);
    setScore(27);
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
        <div className="overflow-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-3 py-2 text-left">Round</th>
                <th className="px-3 py-2 text-left">Target</th>
                <th className="px-3 py-2 text-center">Hits</th>
                <th className="px-3 py-2 text-right">Change</th>
                <th className="px-3 py-2 text-right">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {results.map((r, i) => (
                <tr key={i} className="tabular-nums">
                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{i + 1}</td>
                  <td className="px-3 py-2 font-medium">D{r.number}</td>
                  <td className="px-3 py-2 text-center">{r.hits}</td>
                  <td
                    className={`px-3 py-2 text-right font-medium ${
                      r.delta > 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {r.delta > 0 ? '+' : ''}{r.delta}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold">{r.runningScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
