'use client';

import { useState, useCallback } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

type Mode = 'play' | 'simulation';
type SimStrategy = 'random' | 'middle' | 'adaptive';
type GameStatus = 'playing' | 'won';

interface SimResult {
  earnings: number;
  guessCount: number;
}

function randomInt(lo: number, hi: number): number {
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

function adaptiveFirstGuess(N: number, history: number[]): number {
  if (history.length === 0) return Math.round(N * 0.5);
  const total = history.length;
  const lowCount  = history.filter(n => n < N / 3).length;
  const highCount = history.filter(n => n > (2 * N) / 3).length;
  if (lowCount  / total > 0.4) return Math.round(N * 0.25);
  if (highCount / total > 0.4) return Math.round(N * 0.75);
  return Math.round(N * 0.5);
}

function playSimGame(
  steveNumber: number,
  strategy: SimStrategy,
  history: number[] = [],
): { earnings: number; guessCount: number } {
  let lo = 1, hi = 100, guesses = 0;
  let firstGuessDone = false;
  while (true) {
    guesses++;
    let pick: number;
    if (strategy === 'adaptive' && !firstGuessDone) {
      pick = adaptiveFirstGuess(100, history);
      firstGuessDone = true;
    } else if (strategy === 'middle' || strategy === 'adaptive') {
      pick = Math.floor((lo + hi) / 2);
    } else {
      pick = randomInt(lo, hi);
    }
    if (pick === steveNumber) break;
    if (pick < steveNumber) lo = pick + 1;
    else hi = pick - 1;
  }
  return { earnings: 6 - guesses, guessCount: guesses };
}

function earningsColor(n: number): string {
  if (n > 0) return 'text-green-600 dark:text-green-400';
  if (n < 0) return 'text-red-600 dark:text-red-400';
  return 'text-gray-500 dark:text-gray-400';
}

function formatEarnings(n: number): string {
  if (n >= 0) return `+$${n}`;
  return `-$${Math.abs(n)}`;
}

export default function StevesGameClient() {
  const [mode, setMode] = useState<Mode>('play');

  // --- Play mode state ---
  const [steveNumber, setSteveNumber] = useState<number>(() => randomInt(1, 100));
  const [guesses, setGuesses] = useState<number[]>([]);
  const [lowerBound, setLowerBound] = useState(1);
  const [upperBound, setUpperBound] = useState(100);
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing');
  const [sessionTotal, setSessionTotal] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [lastHint, setLastHint] = useState<'higher' | 'lower' | null>(null);

  // --- Simulation state ---
  const [simRuns, setSimRuns] = useState(1000);
  const [simStrategy, setSimStrategy] = useState<SimStrategy>('middle');
  const [simResults, setSimResults] = useState<SimResult[] | null>(null);
  const [showSimDetail, setShowSimDetail] = useState(false);

  const currentEarnings = 6 - (guesses.length + (gameStatus === 'won' ? 1 : 0));

  const handleGuess = useCallback(
    (num: number) => {
      if (gameStatus !== 'playing') return;
      if (num < lowerBound || num > upperBound) return;
      if (guesses.includes(num)) return;

      if (num === steveNumber) {
        const finalGuessCount = guesses.length + 1;
        const earned = 6 - finalGuessCount;
        setGuesses((g) => [...g, num]);
        setGameStatus('won');
        setSessionTotal((t) => t + earned);
        setGamesPlayed((p) => p + 1);
        setLastHint(null);
      } else {
        setGuesses((g) => [...g, num]);
        if (num < steveNumber) {
          setLowerBound(num + 1);
          setLastHint('higher');
        } else {
          setUpperBound(num - 1);
          setLastHint('lower');
        }
      }
    },
    [gameStatus, guesses, lowerBound, upperBound, steveNumber]
  );

  const handlePlayAgain = useCallback(() => {
    setSteveNumber(randomInt(1, 100));
    setGuesses([]);
    setLowerBound(1);
    setUpperBound(100);
    setGameStatus('playing');
    setLastHint(null);
  }, []);

  const handleRunSimulation = useCallback(() => {
    const results: SimResult[] = [];
    const history: number[] = [];
    for (let i = 0; i < simRuns; i++) {
      const steve = randomInt(1, 100);
      results.push(playSimGame(steve, simStrategy, history));
      history.push(steve);
    }
    setSimResults(results);
    setShowSimDetail(false);
  }, [simRuns, simStrategy]);

  // Compute simulation stats
  const simStats = simResults
    ? (() => {
        const total = simResults.reduce((s, r) => s + r.earnings, 0);
        const avg = total / simResults.length;
        const min = Math.min(...simResults.map((r) => r.earnings));
        const max = Math.max(...simResults.map((r) => r.earnings));
        const wins = simResults.filter((r) => r.earnings > 0).length;
        const winRate = (wins / simResults.length) * 100;

        // Histogram of guess counts
        const dist: Record<number, number> = {};
        for (const r of simResults) {
          dist[r.guessCount] = (dist[r.guessCount] ?? 0) + 1;
        }
        const maxCount = Math.max(...Object.values(dist));
        const histBars = Object.entries(dist)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([guessCount, count]) => ({
            guessCount: Number(guessCount),
            count,
            width: Math.round((count / maxCount) * 100),
            earnings: 6 - Number(guessCount),
          }));

        return { total, avg, min, max, wins, winRate, histBars };
      })()
    : null;

  return (
    <div className="min-h-screen p-8 sm:p-12 max-w-5xl mx-auto">
      <Header
        title="Steve's Game"
        subtitle="Steve picks a number 1–100. Guess it for $5. Each additional guess costs $1."
      />

      {/* Mode tabs */}
      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setMode('play')}
          className={`px-5 py-2 rounded-full font-semibold transition-colors ${
            mode === 'play'
              ? 'bg-amber-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-amber-100 dark:hover:bg-amber-900'
          }`}
        >
          Play
        </button>
        <button
          onClick={() => setMode('simulation')}
          className={`px-5 py-2 rounded-full font-semibold transition-colors ${
            mode === 'simulation'
              ? 'bg-amber-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-amber-100 dark:hover:bg-amber-900'
          }`}
        >
          Simulation
        </button>
      </div>

      {/* ===== PLAY MODE ===== */}
      {mode === 'play' && (
        <div>
          {/* Score panel */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="bg-amber-50 dark:bg-amber-950 rounded-xl px-5 py-3 flex flex-col items-center min-w-[110px]">
              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Guesses
              </span>
              <span className="text-2xl font-bold">
                {gameStatus === 'won' ? guesses.length : guesses.length}
              </span>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950 rounded-xl px-5 py-3 flex flex-col items-center min-w-[110px]">
              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                This Game
              </span>
              <span className={`text-2xl font-bold ${earningsColor(currentEarnings)}`}>
                {gameStatus === 'won'
                  ? formatEarnings(6 - guesses.length)
                  : formatEarnings(6 - guesses.length - 1)}
              </span>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950 rounded-xl px-5 py-3 flex flex-col items-center min-w-[140px]">
              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Session Total
              </span>
              <span className={`text-2xl font-bold ${earningsColor(sessionTotal)}`}>
                {formatEarnings(sessionTotal)}
              </span>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950 rounded-xl px-5 py-3 flex flex-col items-center min-w-[110px]">
              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Games
              </span>
              <span className="text-2xl font-bold">{gamesPlayed}</span>
            </div>
          </div>

          {/* Status message */}
          <div className="mb-5 h-10 flex items-center">
            {gameStatus === 'won' ? (
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                  Correct! Steve&apos;s number was {steveNumber}.{' '}
                  You earned{' '}
                  <span className="font-bold">{formatEarnings(6 - guesses.length)}</span>
                  {guesses.length === 1 ? ' (first guess!)' : ` in ${guesses.length} guesses`}.
                </span>
                <button
                  onClick={handlePlayAgain}
                  className="ml-2 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full text-sm font-semibold transition-colors"
                >
                  Play Again
                </button>
              </div>
            ) : lastHint ? (
              <span className="text-lg font-semibold">
                Steve&apos;s number is{' '}
                <span className={lastHint === 'higher' ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}>
                  {lastHint}
                </span>{' '}
                than {guesses[guesses.length - 1]}.{' '}
                <span className="text-sm text-gray-500">
                  Range: {lowerBound}–{upperBound}
                </span>
              </span>
            ) : (
              <span className="text-gray-500 dark:text-gray-400">
                Pick a number between 1 and 100.
              </span>
            )}
          </div>

          {/* 10×10 number grid */}
          <div className="grid grid-cols-10 gap-1.5 mb-6">
            {Array.from({ length: 100 }, (_, i) => i + 1).map((num) => {
              const outOfRange = num < lowerBound || num > upperBound;
              const isWrongGuess = guesses.includes(num) && num !== steveNumber;
              const isCorrect = guesses.includes(num) && num === steveNumber;

              let btnClass =
                'w-full aspect-square rounded-lg text-sm font-semibold transition-all select-none ';

              if (isCorrect) {
                btnClass += 'bg-green-500 text-white scale-110 shadow-lg cursor-default';
              } else if (isWrongGuess) {
                btnClass += 'bg-red-200 dark:bg-red-900 text-red-700 dark:text-red-300 cursor-default opacity-70';
              } else if (outOfRange) {
                btnClass += 'bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed';
              } else {
                btnClass +=
                  'bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-100 hover:bg-amber-300 dark:hover:bg-amber-700 hover:scale-105 cursor-pointer active:scale-95';
              }

              return (
                <button
                  key={num}
                  onClick={() => handleGuess(num)}
                  disabled={outOfRange || isWrongGuess || isCorrect || gameStatus === 'won'}
                  className={btnClass}
                  aria-label={`Guess ${num}`}
                >
                  {num}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-600">
            Scoring: 1st guess = $5 &bull; each additional guess −$1 &bull; 6+ guesses means you owe Steve
          </p>
        </div>
      )}

      {/* ===== SIMULATION MODE ===== */}
      {mode === 'simulation' && (
        <div>
          {/* Controls */}
          <div className="flex flex-wrap items-end gap-4 mb-8 p-5 bg-amber-50 dark:bg-amber-950 rounded-xl">
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                Number of runs
              </label>
              <input
                type="number"
                min={1}
                max={10000}
                value={simRuns}
                onChange={(e) => setSimRuns(Math.max(1, Math.min(10000, Number(e.target.value))))}
                className="w-28 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                Strategy
              </label>
              <select
                value={simStrategy}
                onChange={(e) => setSimStrategy(e.target.value as SimStrategy)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
              >
                <option value="middle">Pick the Middle (Binary Search)</option>
                <option value="random">Random</option>
                <option value="adaptive">Adaptive First Guess + Binary Search</option>
              </select>
            </div>
            <button
              onClick={handleRunSimulation}
              className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-full font-semibold transition-colors"
            >
              Run Simulation
            </button>
          </div>

          {/* Results */}
          {simStats && simResults && (
            <div>
              {/* Summary stats */}
              <div className="flex flex-wrap gap-4 mb-6">
                {[
                  { label: 'Total Earnings', value: formatEarnings(simStats.total), color: earningsColor(simStats.total) },
                  { label: 'Avg per Game', value: `${simStats.avg >= 0 ? '+' : ''}$${simStats.avg.toFixed(2)}`, color: earningsColor(simStats.avg) },
                  { label: 'Best', value: formatEarnings(simStats.max), color: earningsColor(simStats.max) },
                  { label: 'Worst', value: formatEarnings(simStats.min), color: earningsColor(simStats.min) },
                  { label: 'Win Rate', value: `${simStats.winRate.toFixed(1)}%`, color: simStats.winRate >= 50 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-gray-100 dark:bg-gray-800 rounded-xl px-5 py-3 flex flex-col items-center min-w-[110px]">
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{label}</span>
                    <span className={`text-xl font-bold ${color}`}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Histogram */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3 text-gray-700 dark:text-gray-300">Guess count distribution</h3>
                <div className="space-y-1.5">
                  {simStats.histBars.map(({ guessCount, count, width, earnings }) => (
                    <div key={guessCount} className="flex items-center gap-3 text-sm">
                      <span className="w-8 text-right font-mono text-gray-600 dark:text-gray-400">{guessCount}</span>
                      <span className={`w-14 text-right text-xs font-semibold ${earningsColor(earnings)}`}>
                        {formatEarnings(earnings)}
                      </span>
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded h-5 relative overflow-hidden">
                        <div
                          className={`h-full rounded transition-all ${earnings > 0 ? 'bg-green-400 dark:bg-green-600' : earnings === 0 ? 'bg-gray-400 dark:bg-gray-500' : 'bg-red-400 dark:bg-red-600'}`}
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <span className="w-14 text-xs text-gray-500 dark:text-gray-400">
                        {count.toLocaleString()} ({((count / simResults.length) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detail toggle */}
              <button
                onClick={() => setShowSimDetail((v) => !v)}
                className="text-sm text-amber-600 dark:text-amber-400 underline mb-3"
              >
                {showSimDetail ? 'Hide' : 'Show'} first 20 results
              </button>
              {showSimDetail && (
                <div className="overflow-x-auto">
                  <table className="text-sm w-full max-w-sm">
                    <thead>
                      <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                        <th className="pb-1 pr-6">Game</th>
                        <th className="pb-1 pr-6">Guesses</th>
                        <th className="pb-1">Earnings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {simResults.slice(0, 20).map((r, i) => (
                        <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                          <td className="py-1 pr-6 text-gray-600 dark:text-gray-400">{i + 1}</td>
                          <td className="py-1 pr-6">{r.guessCount}</td>
                          <td className={`py-1 font-semibold ${earningsColor(r.earnings)}`}>
                            {formatEarnings(r.earnings)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Footer />
    </div>
  );
}
