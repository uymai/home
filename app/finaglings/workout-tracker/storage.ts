import { ActivityState, BlockState, SessionPhase, SessionState } from './types';

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

export function getPreviousWeights(history: SavedSession[]): Record<string, string> {
  const weights: Record<string, string> = {};
  for (const session of history) {
    for (const activity of session.activities) {
      if (activity.weight && !(activity.name in weights)) {
        weights[activity.name] = activity.weight;
      }
    }
  }
  return weights;
}

const IN_PROGRESS_KEY = 'workout-tracker-in-progress-v1';
const SESSION_PHASES: SessionPhase[] = ['select-program', 'select-day', 'block', 'summary'];

function isValidActivityState(value: unknown): value is ActivityState {
  if (!value || typeof value !== 'object') return false;
  const activity = value as Partial<ActivityState>;
  return (
    typeof activity.name === 'string' &&
    typeof activity.weight === 'string' &&
    typeof activity.roundsCompleted === 'number' &&
    (activity.noWeight === undefined || typeof activity.noWeight === 'boolean')
  );
}

function isValidBlockState(value: unknown): value is BlockState {
  if (!value || typeof value !== 'object') return false;
  const block = value as Partial<BlockState>;
  return (
    typeof block.id === 'string' &&
    typeof block.label === 'string' &&
    typeof block.started === 'boolean' &&
    Array.isArray(block.activities) &&
    block.activities.every(isValidActivityState)
  );
}

export function isValidSessionState(value: unknown): value is SessionState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<SessionState>;
  return (
    typeof state.phase === 'string' &&
    SESSION_PHASES.includes(state.phase as SessionPhase) &&
    (state.programId === null || typeof state.programId === 'string') &&
    (state.dayId === null || typeof state.dayId === 'string') &&
    Array.isArray(state.blocks) &&
    state.blocks.every(isValidBlockState) &&
    typeof state.currentBlockIndex === 'number'
  );
}

export function loadInProgressSession(): SessionState | null {
  if (!hasLocalStorage()) return null;
  const raw = globalThis.localStorage.getItem(IN_PROGRESS_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isValidSessionState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveInProgressSession(state: SessionState): void {
  if (!hasLocalStorage()) return;
  globalThis.localStorage.setItem(IN_PROGRESS_KEY, JSON.stringify(state));
}

export function clearInProgressSession(): void {
  if (!hasLocalStorage()) return;
  globalThis.localStorage.removeItem(IN_PROGRESS_KEY);
}

export type ExerciseProgressEntry = {
  completedAt: string;
  weight: string;
  roundsCompleted: number;
};

export function getExerciseProgress(history: SavedSession[]): Record<string, ExerciseProgressEntry[]> {
  const chronological = [...history].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  const progress: Record<string, ExerciseProgressEntry[]> = {};
  for (const session of chronological) {
    for (const activity of session.activities) {
      const entry = { completedAt: session.completedAt, weight: activity.weight, roundsCompleted: activity.roundsCompleted };
      (progress[activity.name] ??= []).push(entry);
    }
  }
  return progress;
}
