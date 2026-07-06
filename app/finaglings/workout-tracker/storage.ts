import { SessionState } from './types';

export type SavedActivityResult = {
  blockLabel: string;
  name: string;
  roundsCompleted: number;
  weight: string;
};

export type SavedSession = {
  id: string;
  programId: string;
  programName: string;
  dayId: string;
  dayLabel: string;
  completedAt: string;
  activities: SavedActivityResult[];
};

const STORAGE_KEY = 'workout-tracker-history-v1';

function hasLocalStorage(): boolean {
  return typeof globalThis.localStorage !== 'undefined';
}

function sortByCompletedAtDesc(history: SavedSession[]): SavedSession[] {
  return [...history].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}

export function loadHistory(): SavedSession[] {
  if (!hasLocalStorage()) return [];
  const raw = globalThis.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isValidSavedSession) : [];
  } catch {
    return [];
  }
}

function persist(history: SavedSession[]): SavedSession[] {
  const sorted = sortByCompletedAtDesc(history);
  if (hasLocalStorage()) {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
  }
  return sorted;
}

export function saveSession(session: SavedSession): SavedSession[] {
  return persist([...loadHistory(), session]);
}

export function deleteSession(id: string): SavedSession[] {
  return persist(loadHistory().filter((session) => session.id !== id));
}

export function isValidSavedSession(value: unknown): value is SavedSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<SavedSession>;

  return (
    typeof session.id === 'string' &&
    typeof session.programId === 'string' &&
    typeof session.programName === 'string' &&
    typeof session.dayId === 'string' &&
    typeof session.dayLabel === 'string' &&
    typeof session.completedAt === 'string' &&
    Array.isArray(session.activities) &&
    session.activities.every(
      (activity) =>
        activity &&
        typeof activity === 'object' &&
        typeof (activity as Partial<SavedActivityResult>).blockLabel === 'string' &&
        typeof (activity as Partial<SavedActivityResult>).name === 'string' &&
        typeof (activity as Partial<SavedActivityResult>).roundsCompleted === 'number' &&
        typeof (activity as Partial<SavedActivityResult>).weight === 'string',
    )
  );
}

export function exportHistoryJson(history: SavedSession[]): string {
  return JSON.stringify(sortByCompletedAtDesc(history), null, 2);
}

export function importHistoryJson(json: string): SavedSession[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('That is not valid JSON.');
  }

  if (!Array.isArray(parsed) || !parsed.every(isValidSavedSession)) {
    throw new Error('That JSON does not look like a workout history export.');
  }

  return persist(parsed);
}

export function buildSavedSession(
  state: SessionState,
  programName: string,
  dayLabel: string,
): SavedSession {
  return {
    id: crypto.randomUUID(),
    programId: state.programId ?? '',
    programName,
    dayId: state.dayId ?? '',
    dayLabel,
    completedAt: new Date().toISOString(),
    activities: state.blocks.flatMap((block) =>
      block.activities.map((activity) => ({
        blockLabel: block.label,
        name: activity.name,
        roundsCompleted: activity.roundsCompleted,
        weight: activity.weight,
      })),
    ),
  };
}
