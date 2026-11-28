import type { Solve } from './storage';

/** Formats ms as `s.cc` or `m:ss.cc`. Truncates (never shows a third decimal). */
export function formatTime(ms: number): string {
  const totalCentis = Math.floor(ms / 10);
  const centis = totalCentis % 100;
  const totalSeconds = Math.floor(totalCentis / 100);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  const cc = String(centis).padStart(2, '0');
  if (minutes === 0) return `${seconds}.${cc}`;
  return `${minutes}:${String(seconds).padStart(2, '0')}.${cc}`;
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function best(solves: Solve[]): number | null {
  return solves.length ? Math.min(...solves.map((s) => s.ms)) : null;
}

export function worst(solves: Solve[]): number | null {
  return solves.length ? Math.max(...solves.map((s) => s.ms)) : null;
}

/**
 * Speedcubing-style average of the last `n` solves: drop the best and worst, mean the rest.
 * Returns null until there are `n` solves.
 */
export function averageOfLast(solves: Solve[], n: number): number | null {
  if (solves.length < n || n < 3) return null;
  const times = solves.slice(-n).map((s) => s.ms).sort((a, b) => a - b);
  return mean(times.slice(1, -1));
}

export type ChartPoint = { index: number; ms: number; runningAvg: number; bestSoFar: number };

export function chartSeries(solves: Solve[]): ChartPoint[] {
  let sum = 0;
  let bestSoFar = Infinity;
  return solves.map((s, i) => {
    sum += s.ms;
    bestSoFar = Math.min(bestSoFar, s.ms);
    return { index: i + 1, ms: s.ms, runningAvg: sum / (i + 1), bestSoFar };
  });
}
