'use client';

import { useState, useCallback, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

type Mode = 'play' | 'simulation';
type SimStrategy = 'random' | 'middle' | 'adaptive' | 'rob' | 'rob-hard';
type GameStatus = 'playing' | 'won';

interface SimResult {
  earnings: number;
  guessCount: number;
}

interface StepSimState {
  steveNumber: number;
  picks: number[];
  lo: number;
  hi: number;
  robRounds: number;
  firstGuessDone: boolean;
  history: number[];        // previous steve numbers (for adaptive strategy)
  roundIndex: number;       // 0-based
  roundResults: SimResult[];
  roundDone: boolean;
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

// Numbers 1–100 that require 6+ binary-search guesses (never changes)
const ROB_HARD_NUMBERS = [
  1, 2, 4, 5, 7, 8, 10, 11, 13, 14, 16, 17, 19, 20, 22, 23, 24,
  26, 27, 29, 30, 32, 33, 35, 36, 38, 39, 41, 42, 44, 45, 47, 48, 49,
  51, 52, 54, 55, 57, 58, 60, 61, 63, 64, 66, 67, 69, 70, 72, 73, 74,
  76, 77, 79, 80, 82, 83, 85, 86, 87, 89, 90, 92, 93, 95, 96, 98, 99, 100,
];

function initRoundState(
  strategy: SimStrategy,
  history: number[],
  roundIndex: number,
  roundResults: SimResult[],
): StepSimState {
  const steveNumber =
    strategy === 'rob-hard'
      ? ROB_HARD_NUMBERS[randomInt(0, ROB_HARD_NUMBERS.length - 1)]
      : randomInt(1, 100);
  return {
    steveNumber,
    picks: [],
    lo: 1,
    hi: 100,
    robRounds: 0,
    firstGuessDone: false,
    history,
    roundIndex,
    roundResults,
    roundDone: false,
  };
}

function computeNextPick(
  strategy: SimStrategy,
  lo: number,
  hi: number,
  robRounds: number,
  firstGuessDone: boolean,
  history: number[],
): number {
  if (strategy === 'adaptive' && !firstGuessDone) {
    return adaptiveFirstGuess(100, history);
  } else if (strategy === 'middle' || strategy === 'adaptive') {
    return Math.floor((lo + hi) / 2);
  } else if (strategy === 'rob' || strategy === 'rob-hard') {
    if (robRounds < 3) {
      const mid = Math.floor((lo + hi) / 2);
      const leftMid = Math.floor((lo + mid - 1) / 2);
      return Math.floor((leftMid + mid) / 2);
    } else {
      return Math.floor((lo + hi) / 2);
    }
  } else {
    return randomInt(lo, hi);
  }
}

function playSimGame(
  steveNumber: number,
  strategy: SimStrategy,
  history: number[] = [],
): { earnings: number; guessCount: number } {
  let lo = 1, hi = 100, guesses = 0;
  let firstGuessDone = false;
  let robRounds = 0; // tracks Rob's-theory picks used in this game
  while (true) {
    guesses++;
    let pick: number;
    if (strategy === 'adaptive' && !firstGuessDone) {
      pick = adaptiveFirstGuess(100, history);
      firstGuessDone = true;
    } else if (strategy === 'middle' || strategy === 'adaptive') {
      pick = Math.floor((lo + hi) / 2);
    } else if (strategy === 'rob' || strategy === 'rob-hard') {
      if (robRounds < 3) {
        // Worst-case BST: pick the depth-2 right-of-left node — harder to reach
        // than the midpoint via binary search (e.g. 37 for range [1,100])
        const mid = Math.floor((lo + hi) / 2);
        const leftMid = Math.floor((lo + mid - 1) / 2);
        pick = Math.floor((leftMid + mid) / 2);
        robRounds++;
      } else {
        // After 3 Rob's-theory picks, revert to standard binary search
        pick = Math.floor((lo + hi) / 2);
      }
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
  const [stepSim, setStepSim] = useState<StepSimState | null>(null);

  useEffect(() => {
    setStepSim(null);
  }, [simStrategy, simRuns]);

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

  const handleNextPick = useCallback(() => {
    setStepSim((prev) => {
      // All rounds done — no-op
      if (prev !== null && prev.roundDone && prev.roundIndex + 1 >= simRuns) {
        return prev;
      }

      let state: StepSimState;
      if (prev === null) {
        state = initRoundState(simStrategy, [], 0, []);
      } else if (prev.roundDone) {
        state = initRoundState(
          simStrategy,
          [...prev.history, prev.steveNumber],
          prev.roundIndex + 1,
          prev.roundResults,
        );
      } else {
        state = prev;
      }

      const pick = computeNextPick(
        simStrategy, state.lo, state.hi, state.robRounds, state.firstGuessDone, state.history,
      );
      const newPicks = [...state.picks, pick];
      const newFirstGuessDone = state.firstGuessDone || simStrategy === 'adaptive';
      const newRobRounds =
        (simStrategy === 'rob' || simStrategy === 'rob-hard') && state.robRounds < 3
          ? state.robRounds + 1
          : state.robRounds;

      if (pick === state.steveNumber) {
        const guessCount = newPicks.length;
        return {
          ...state,
          picks: newPicks,
          firstGuessDone: newFirstGuessDone,
          robRounds: newRobRounds,
          roundDone: true,
          roundResults: [...state.roundResults, { earnings: 6 - guessCount, guessCount }],
        };
      }
      return {
        ...state,
        picks: newPicks,
        firstGuessDone: newFirstGuessDone,
        robRounds: newRobRounds,
        lo: pick < state.steveNumber ? pick + 1 : state.lo,
        hi: pick > state.steveNumber ? pick - 1 : state.hi,
      };
    });
  }, [simRuns, simStrategy]);

  const handleNextRound = useCallback(() => {
    setStepSim((prev) => {
      // All rounds done — no-op
      if (prev !== null && prev.roundDone && prev.roundIndex + 1 >= simRuns) {
        return prev;
      }

      let state: StepSimState;
      if (prev === null) {
        state = initRoundState(simStrategy, [], 0, []);
      } else if (prev.roundDone) {
        state = initRoundState(
          simStrategy,
          [...prev.history, prev.steveNumber],
          prev.roundIndex + 1,
          prev.roundResults,
        );
      } else {
        state = prev;
      }

      // Run to completion
      let { lo, hi, robRounds, firstGuessDone } = state;
      let picks = [...state.picks];
      while (true) {
        const pick = computeNextPick(simStrategy, lo, hi, robRounds, firstGuessDone, state.history);
        picks = [...picks, pick];
        if (simStrategy === 'adaptive' && !firstGuessDone) firstGuessDone = true;
        if ((simStrategy === 'rob' || simStrategy === 'rob-hard') && robRounds < 3) robRounds++;
        if (pick === state.steveNumber) {
          const guessCount = picks.length;
          return {
            ...state,
            picks,
            lo,
            hi,
            robRounds,
            firstGuessDone,
            roundDone: true,
            roundResults: [...state.roundResults, { earnings: 6 - guessCount, guessCount }],
          };
        }
        if (pick < state.steveNumber) lo = pick + 1;
        else hi = pick - 1;
      }
    });
  }, [simRuns, simStrategy]);

  const handleRunSimulation = useCallback(() => {
    const results: SimResult[] = [];
    const history: number[] = [];
    for (let i = 0; i < simRuns; i++) {
      const steve = simStrategy === 'rob-hard'
        ? ROB_HARD_NUMBERS[randomInt(0, ROB_HARD_NUMBERS.length - 1)]
        : randomInt(1, 100);
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
                <option value="rob">Rob&apos;s Theory (Worst-Case BST)</option>
                <option value="rob-hard">Rob&apos;s Theory+ (Worst-Case BST + Hard Numbers)</option>
              </select>
            </div>
            <button
              onClick={handleRunSimulation}
              className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-full font-semibold transition-colors"
            >
              Run Simulation
            </button>
            <button
              onClick={handleNextPick}
              disabled={stepSim !== null && stepSim.roundDone && stepSim.roundIndex + 1 >= simRuns}
              className="px-5 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-full font-semibold transition-colors"
            >
              Next Pick
            </button>
            <button
              onClick={handleNextRound}
              disabled={stepSim !== null && stepSim.roundDone && stepSim.roundIndex + 1 >= simRuns}
              className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-full font-semibold transition-colors"
            >
              Next Round
            </button>
          </div>
          {simStrategy === 'rob' && (
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-4 mb-4">
              Rob&apos;s Theory: for the first 3 guesses per game, picks the depth-2 right-of-left node in the remaining range&apos;s BST (e.g. 37 for [1–100]) — harder to reach via binary search. Reverts to binary search after 3 picks.
            </p>
          )}
          {simStrategy === 'rob-hard' && (
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-4 mb-4">
              Rob&apos;s Theory+: uses Rob&apos;s Theory guessing, but Steve only picks from the ~{ROB_HARD_NUMBERS.length} numbers in [1–100] that take 6–7 guesses to find via binary search.
            </p>
          )}

          {/* Step-through display */}
          {stepSim && (
            <div className="mb-8 p-5 bg-blue-50 dark:bg-blue-950 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 dark:text-gray-200 text-lg">
                  Step-Through: Round {stepSim.roundIndex + 1} of {simRuns}
                </h3>
                {stepSim.roundResults.length > 0 && (
                  <div className="flex gap-4 text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                      Done: <span className="font-semibold text-gray-800 dark:text-gray-200">{stepSim.roundResults.length}</span>
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      Total:{' '}
                      <span className={`font-semibold ${earningsColor(stepSim.roundResults.reduce((s, r) => s + r.earnings, 0))}`}>
                        {formatEarnings(stepSim.roundResults.reduce((s, r) => s + r.earnings, 0))}
                      </span>
                    </span>
                  </div>
                )}
              </div>

              {stepSim.picks.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">No picks yet this round.</p>
              ) : (
                <ol className="space-y-1 mb-3">
                  {stepSim.picks.map((pick, idx) => {
                    const isLast = idx === stepSim.picks.length - 1;
                    const isCorrect = isLast && stepSim.roundDone;
                    const hint = isCorrect ? null : pick < stepSim.steveNumber ? 'higher' : 'lower';
                    return (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <span className="w-6 text-right text-gray-400 dark:text-gray-500 font-mono text-xs">{idx + 1}.</span>
                        <span className={`font-bold text-base ${isCorrect ? 'text-green-600 dark:text-green-400' : 'text-gray-800 dark:text-gray-200'}`}>
                          {pick}
                        </span>
                        {isCorrect ? (
                          <span className="text-green-600 dark:text-green-400 font-semibold">Correct!</span>
                        ) : (
                          <span className={hint === 'higher' ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}>
                            Go {hint}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}

              {!stepSim.roundDone && stepSim.picks.length > 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Current range: <span className="font-semibold">{stepSim.lo}–{stepSim.hi}</span>
                </p>
              )}

              {stepSim.roundDone && (() => {
                const lastResult = stepSim.roundResults[stepSim.roundResults.length - 1];
                return (
                  <div className="mt-3 flex flex-wrap gap-4 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Steve&apos;s number was{' '}
                      <span className="font-bold text-gray-900 dark:text-gray-100">{stepSim.steveNumber}</span>
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      Guesses: <span className="font-bold">{lastResult.guessCount}</span>
                    </span>
                    <span className={`font-bold ${earningsColor(lastResult.earnings)}`}>
                      {formatEarnings(lastResult.earnings)}
                    </span>
                    {stepSim.roundIndex + 1 >= simRuns && (
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">All rounds complete!</span>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

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
