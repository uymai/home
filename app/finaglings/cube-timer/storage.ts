export type Solve = {
  id: string;
  /** Elapsed time in milliseconds (full precision is kept even though it is not displayed). */
  ms: number;
  /** ISO timestamp of when the solve finished. */
  at: string;
};

const STORAGE_KEY = 'cube-timer-solves-v1';
const EXPORT_FORMAT = 'cube-timer-export';

function hasLocalStorage(): boolean {
  return typeof globalThis.localStorage !== 'undefined';
}

function sortByDateAsc(solves: Solve[]): Solve[] {
  return [...solves].sort((a, b) => a.at.localeCompare(b.at));
}

export function isValidSolve(value: unknown): value is Solve {
  if (!value || typeof value !== 'object') return false;
  const s = value as Partial<Solve>;
  return (
    typeof s.id === 'string' &&
    typeof s.ms === 'number' &&
    Number.isFinite(s.ms) &&
    s.ms >= 0 &&
    typeof s.at === 'string' &&
    !Number.isNaN(Date.parse(s.at))
  );
}

function persist(solves: Solve[]): Solve[] {
  const sorted = sortByDateAsc(solves);
  if (hasLocalStorage()) {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
  }
  return sorted;
}

export function loadSolves(): Solve[] {
  if (!hasLocalStorage()) return [];
  const raw = globalThis.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? sortByDateAsc(parsed.filter(isValidSolve)) : [];
  } catch {
    return [];
  }
}

export function addSolve(ms: number, at: Date = new Date()): Solve[] {
  const solve: Solve = { id: crypto.randomUUID(), ms, at: at.toISOString() };
  return persist([...loadSolves(), solve]);
}

export function deleteSolve(id: string): Solve[] {
  return persist(loadSolves().filter((s) => s.id !== id));
}

export function clearSolves(): Solve[] {
  return persist([]);
}

export function exportSolvesJson(solves: Solve[]): string {
  return JSON.stringify({ format: EXPORT_FORMAT, version: 1, solves: sortByDateAsc(solves) }, null, 2);
}

/** Parses an export and merges it into stored solves (existing ids are kept, not duplicated). */
export function importSolvesJson(json: string): { solves: Solve[]; added: number } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('That is not valid JSON.');
  }
  const list = Array.isArray(parsed) ? parsed : (parsed as { solves?: unknown } | null)?.solves;
  if (!Array.isArray(list) || !list.every(isValidSolve)) {
    throw new Error('That file does not look like a cube timer export.');
  }
  const existing = loadSolves();
  const ids = new Set(existing.map((s) => s.id));
  const fresh = list.filter((s) => !ids.has(s.id)).map((s) => ({ id: s.id, ms: s.ms, at: s.at }));
  return { solves: persist([...existing, ...fresh]), added: fresh.length };
}
