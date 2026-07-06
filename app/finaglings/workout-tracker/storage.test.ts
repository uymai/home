import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildSavedSession,
  deleteSession,
  exportHistoryJson,
  importHistoryJson,
  isValidSavedSession,
  loadHistory,
  saveSession,
  SavedSession,
} from './storage';
import { createInitialState } from './engine';

function fakeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  };
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: fakeLocalStorage(),
    configurable: true,
  });
});

function makeSession(overrides: Partial<SavedSession> = {}): SavedSession {
  return {
    id: 'session-1',
    programId: 'desity-with-andy-1',
    programName: 'Desity with Andy 1',
    dayId: 'day1',
    dayLabel: 'Day 1',
    completedAt: '2026-01-01T00:00:00.000Z',
    activities: [{ blockLabel: 'First block', name: 'Squat', roundsCompleted: 3, weight: '25' }],
    ...overrides,
  };
}

describe('Workout Tracker storage', () => {
  it('returns an empty history when nothing is saved', () => {
    expect(loadHistory()).toEqual([]);
  });

  it('saves and loads a session, sorted by completedAt descending', () => {
    const older = makeSession({ id: 'a', completedAt: '2026-01-01T00:00:00.000Z' });
    const newer = makeSession({ id: 'b', completedAt: '2026-02-01T00:00:00.000Z' });

    saveSession(older);
    const history = saveSession(newer);

    expect(history.map((s) => s.id)).toEqual(['b', 'a']);
    expect(loadHistory().map((s) => s.id)).toEqual(['b', 'a']);
  });

  it('deletes a session by id', () => {
    saveSession(makeSession({ id: 'a' }));
    saveSession(makeSession({ id: 'b' }));

    const remaining = deleteSession('a');

    expect(remaining.map((s) => s.id)).toEqual(['b']);
    expect(loadHistory().map((s) => s.id)).toEqual(['b']);
  });

  it('validates saved sessions with isValidSavedSession', () => {
    expect(isValidSavedSession(makeSession())).toBe(true);
    expect(isValidSavedSession({ ...makeSession(), activities: 'nope' })).toBe(false);
    expect(isValidSavedSession(null)).toBe(false);
    expect(isValidSavedSession(42)).toBe(false);
  });

  it('imports a valid history export, replacing what was stored', () => {
    saveSession(makeSession({ id: 'stale' }));

    const importedRaw = exportHistoryJson([makeSession({ id: 'fresh' })]);
    const result = importHistoryJson(importedRaw);

    expect(result.map((s) => s.id)).toEqual(['fresh']);
    expect(loadHistory().map((s) => s.id)).toEqual(['fresh']);
  });

  it('throws on malformed JSON without touching existing storage', () => {
    saveSession(makeSession({ id: 'kept' }));

    expect(() => importHistoryJson('not json')).toThrow();
    expect(loadHistory().map((s) => s.id)).toEqual(['kept']);
  });

  it('throws when the JSON is not an array of valid sessions', () => {
    saveSession(makeSession({ id: 'kept' }));

    expect(() => importHistoryJson(JSON.stringify({ not: 'an array' }))).toThrow();
    expect(() => importHistoryJson(JSON.stringify([{ missing: 'fields' }]))).toThrow();
    expect(loadHistory().map((s) => s.id)).toEqual(['kept']);
  });

  it('builds a saved session from live session state', () => {
    const state = {
      ...createInitialState(),
      programId: 'desity-with-andy-1',
      dayId: 'day1',
      blocks: [
        {
          id: 'day1-block1',
          label: 'First block',
          activities: [
            { name: 'Squat', weight: '25', roundsCompleted: 3 },
            { name: 'Press', weight: '', roundsCompleted: 2 },
          ],
        },
      ],
    };

    const saved = buildSavedSession(state, 'Desity with Andy 1', 'Day 1');

    expect(saved.programId).toBe('desity-with-andy-1');
    expect(saved.programName).toBe('Desity with Andy 1');
    expect(saved.dayId).toBe('day1');
    expect(saved.dayLabel).toBe('Day 1');
    expect(saved.activities).toEqual([
      { blockLabel: 'First block', name: 'Squat', roundsCompleted: 3, weight: '25' },
      { blockLabel: 'First block', name: 'Press', roundsCompleted: 2, weight: '' },
    ]);
    expect(typeof saved.id).toBe('string');
    expect(saved.id.length).toBeGreaterThan(0);
    expect(() => new Date(saved.completedAt).toISOString()).not.toThrow();
  });
});
