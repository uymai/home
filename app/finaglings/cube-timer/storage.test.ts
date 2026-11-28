import { beforeEach, describe, expect, it } from 'vitest';
import {
  addSolve,
  clearSolves,
  deleteSolve,
  exportSolvesJson,
  importSolvesJson,
  loadSolves,
} from './storage';
import { averageOfLast, best, chartSeries, formatTime, mean } from './stats';

beforeEach(() => {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
    configurable: true,
  });
});

describe('formatTime', () => {
  it('truncates to two decimals, never three', () => {
    expect(formatTime(12345)).toBe('12.34');
    expect(formatTime(12999)).toBe('12.99');
    expect(formatTime(5)).toBe('0.00');
  });
  it('shows minutes past 60 seconds', () => {
    expect(formatTime(61230)).toBe('1:01.23');
  });
});

describe('stats', () => {
  const solves = [10000, 12000, 8000, 9000, 15000].map((ms, i) => ({
    id: String(i),
    ms,
    at: new Date(2026, 0, i + 1).toISOString(),
  }));
  it('computes best and mean', () => {
    expect(best(solves)).toBe(8000);
    expect(mean(solves.map((s) => s.ms))).toBe(10800);
    expect(best([])).toBeNull();
  });
  it('computes ao5 dropping best and worst', () => {
    expect(averageOfLast(solves, 5)).toBe(10333.333333333334);
    expect(averageOfLast(solves, 12)).toBeNull();
  });
  it('builds chart series', () => {
    const series = chartSeries(solves);
    expect(series[2]).toMatchObject({ index: 3, ms: 8000, bestSoFar: 8000 });
    expect(series[1].runningAvg).toBe(11000);
  });
});

describe('storage', () => {
  it('adds, keeps full ms precision, and deletes', () => {
    addSolve(12345.6, new Date('2026-01-01'));
    const all = addSolve(9000, new Date('2026-01-02'));
    expect(all.map((s) => s.ms)).toEqual([12345.6, 9000]);
    expect(deleteSolve(all[0].id).map((s) => s.ms)).toEqual([9000]);
    expect(clearSolves()).toEqual([]);
    expect(loadSolves()).toEqual([]);
  });
  it('round-trips export/import without duplicating', () => {
    const solves = addSolve(10000);
    const json = exportSolvesJson(solves);
    expect(importSolvesJson(json).added).toBe(0);
    clearSolves();
    const result = importSolvesJson(json);
    expect(result.added).toBe(1);
    expect(result.solves[0].ms).toBe(10000);
  });
  it('rejects bad imports', () => {
    expect(() => importSolvesJson('nope')).toThrow('valid JSON');
    expect(() => importSolvesJson('{"solves":[{"x":1}]}')).toThrow('cube timer export');
  });
});
