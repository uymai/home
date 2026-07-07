'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createInitialState, reduceSessionState } from './engine';
import { PROGRAMS } from './programs';
import { SessionAction, SessionState } from './types';
import {
  buildSavedSession,
  clearInProgressSession,
  deleteSession,
  exportHistoryJson,
  getExerciseProgress,
  getPreviousWeights,
  importHistoryJson,
  loadHistory,
  loadInProgressSession,
  SavedSession,
  saveInProgressSession,
  saveSession,
} from './storage';

const ALL_DAYS_FILTER = 'all';

function dayFilterKey(session: Pick<SavedSession, 'programId' | 'dayId'>): string {
  return `${session.programId}|${session.dayId}`;
}

type WakeLockSentinelLike = {
  addEventListener?: (type: 'release', listener: () => void) => void;
  onrelease?: (() => void) | null;
  release?: () => Promise<void>;
};

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinelLike>;
  };
};

function useScreenWakeLock() {
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
  const [stayOnEnabled, setStayOnEnabled] = useState(false);
  const [wakeLockSupported, setWakeLockSupported] = useState(false);

  const requestWakeLock = useCallback(async () => {
    if (!wakeLockSupported || wakeLockRef.current) return;
    try {
      if (document.visibilityState !== 'visible') return;
      const sentinel = await (navigator as NavigatorWithWakeLock).wakeLock?.request('screen');
      if (!sentinel) return;
      wakeLockRef.current = sentinel;
      const onRelease = () => {
        wakeLockRef.current = null;
      };
      sentinel.addEventListener?.('release', onRelease);
      sentinel.onrelease = onRelease;
    } catch {
      wakeLockRef.current = null;
    }
  }, [wakeLockSupported]);

  const releaseWakeLock = async () => {
    try {
      await wakeLockRef.current?.release?.();
    } catch {
      // ignore
    } finally {
      wakeLockRef.current = null;
    }
  };

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      try {
        setWakeLockSupported(Boolean((navigator as NavigatorWithWakeLock).wakeLock?.request));
      } catch {
        setWakeLockSupported(false);
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && stayOnEnabled && !wakeLockRef.current) {
        void requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (wakeLockRef.current) {
        wakeLockRef.current
          .release?.()
          .catch(() => {})
          .finally(() => {
            wakeLockRef.current = null;
          });
      }
    };
  }, [requestWakeLock, stayOnEnabled]);

  const toggleWakeLock = async () => {
    if (!wakeLockSupported) return;
    const next = !stayOnEnabled;
    setStayOnEnabled(next);
    if (next) await requestWakeLock();
    else await releaseWakeLock();
  };

  return { stayOnEnabled, wakeLockSupported, toggleWakeLock };
}

function RowCard({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between bg-gray-50 dark:bg-gray-800/60 rounded-xl px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    >
      {children}
    </button>
  );
}

function formatRounds(rounds: number): string {
  return `${rounds} round${rounds === 1 ? '' : 's'}`;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-amber-50 dark:bg-amber-950 rounded-xl px-5 py-3 flex flex-col items-center min-w-[110px]">
      <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

export default function WorkoutTrackerClient() {
  // Start from a fresh session on both server and first client render (matches SSR output),
  // then resume any in-progress session in an effect below — see NightlightClient.tsx for the
  // same read-localStorage-after-mount pattern, avoiding a hydration mismatch.
  const [state, setState] = useState<SessionState>(createInitialState);
  const [view, setView] = useState<'session' | 'history'>('session');
  const [history, setHistory] = useState<SavedSession[]>([]);
  const [historyText, setHistoryText] = useState('');
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [dayFilter, setDayFilter] = useState<string>(ALL_DAYS_FILTER);
  const { stayOnEnabled, wakeLockSupported, toggleWakeLock } = useScreenWakeLock();

  const send = (action: SessionAction) => {
    setState((prev) => reduceSessionState(prev, action, PROGRAMS));
  };

  useEffect(() => {
    const resumed = loadInProgressSession();
    if (resumed) setState(resumed);
  }, []);

  useEffect(() => {
    if (state.phase === 'block') saveInProgressSession(state);
  }, [state]);

  const refreshHistory = useCallback(() => {
    const next = loadHistory();
    setHistory(next);
    setHistoryText(exportHistoryJson(next));
  }, []);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  const program = useMemo(() => PROGRAMS.find((p) => p.id === state.programId) ?? null, [state.programId]);
  const day = useMemo(() => program?.days.find((d) => d.id === state.dayId) ?? null, [program, state.dayId]);

  useEffect(() => {
    if (state.phase === 'summary' && program && day) {
      const saved = buildSavedSession(state, program.name, day.label);
      saveSession(saved);
      clearInProgressSession();
      refreshHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  function openHistory() {
    refreshHistory();
    setHistoryError(null);
    setDayFilter(ALL_DAYS_FILTER);
    setView('history');
  }

  const dayFilterOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const session of history) {
      const key = dayFilterKey(session);
      if (!seen.has(key)) seen.set(key, `${session.programName} · ${session.dayLabel}`);
    }
    return Array.from(seen, ([key, label]) => ({ key, label }));
  }, [history]);

  const filteredHistory = useMemo(
    () => (dayFilter === ALL_DAYS_FILTER ? history : history.filter((session) => dayFilterKey(session) === dayFilter)),
    [history, dayFilter],
  );

  const exerciseProgress = useMemo(() => getExerciseProgress(filteredHistory), [filteredHistory]);

  function handleRemoveSession(id: string) {
    setHistory(deleteSession(id));
    setHistoryText(exportHistoryJson(loadHistory()));
  }

  function handleSaveHistoryText() {
    try {
      const next = importHistoryJson(historyText);
      setHistory(next);
      setHistoryText(exportHistoryJson(next));
      setHistoryError(null);
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'Could not import that JSON.');
    }
  }

  function restartDay() {
    clearInProgressSession();
    send({ type: 'restart-day' });
  }

  function restartProgram() {
    clearInProgressSession();
    send({ type: 'restart-program' });
  }

  if (view === 'history') {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setView('session')}
          className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          ‹ Back to workout
        </button>

        <h2 className="text-xl font-bold">History</h2>

        {history.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">No saved sessions yet.</p>
        )}

        {dayFilterOptions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setDayFilter(ALL_DAYS_FILTER)}
              className={`px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
                dayFilter === ALL_DAYS_FILTER
                  ? 'bg-orange-100 dark:bg-orange-950'
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              All
            </button>
            {dayFilterOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => setDayFilter(option.key)}
                className={`px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
                  dayFilter === option.key
                    ? 'bg-orange-100 dark:bg-orange-950'
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {Object.keys(exerciseProgress).length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Progress</h3>
            <div className="space-y-3">
              {Object.entries(exerciseProgress).map(([name, entries]) => (
                <div key={name} className="bg-gray-50 dark:bg-gray-800/60 rounded-xl px-4 py-3 space-y-1">
                  <div className="font-medium">{name}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
                    {entries.map((entry, index) => (
                      <div key={index}>
                        {new Date(entry.completedAt).toLocaleDateString()}: {formatRounds(entry.roundsCompleted)}
                        {entry.weight ? ` @ ${entry.weight}` : ''}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {filteredHistory.map((session) => (
            <div key={session.id} className="bg-gray-50 dark:bg-gray-800/60 rounded-xl px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{session.programName} · {session.dayLabel}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(session.completedAt).toLocaleString()} ·{' '}
                    {formatRounds(session.activities.reduce((sum, a) => sum + a.roundsCompleted, 0))} total
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveSession(session.id)}
                  className="text-sm text-red-600 dark:text-red-400 hover:underline"
                >
                  Remove
                </button>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
                {session.activities.map((activity, index) => (
                  <div key={index}>
                    {activity.name}: {formatRounds(activity.roundsCompleted)}{activity.weight ? ` @ ${activity.weight}` : ''}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Import / Export</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Copy the text below to export, or paste in new JSON and hit Save to import.
          </p>
          <textarea
            value={historyText}
            onChange={(e) => setHistoryText(e.target.value)}
            rows={10}
            className="w-full font-mono text-xs bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
          />
          {historyError && <p className="text-sm text-red-600 dark:text-red-400">{historyError}</p>}
          <button
            onClick={handleSaveHistoryText}
            className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full font-semibold transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  if (state.phase === 'select-program') {
    return (
      <div className="space-y-4">
        {PROGRAMS.map((p) => (
          <RowCard key={p.id} onClick={() => send({ type: 'select-program', programId: p.id })}>
            <span className="font-semibold">{p.name}</span>
            <span className="text-gray-400">›</span>
          </RowCard>
        ))}
        <button
          onClick={openHistory}
          className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          View history
        </button>
      </div>
    );
  }

  if (state.phase === 'select-day') {
    return (
      <div className="space-y-4">
        <div className="space-y-4">
          {program?.days.map((d) => (
            <RowCard
              key={d.id}
              onClick={() =>
                send({ type: 'select-day', dayId: d.id, previousWeights: getPreviousWeights(loadHistory()) })
              }
            >
              <span className="font-semibold">{d.label}</span>
              <span className="text-gray-400">›</span>
            </RowCard>
          ))}
        </div>
        <button
          onClick={restartProgram}
          className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          Choose a different program
        </button>
      </div>
    );
  }

  if (state.phase === 'block') {
    const blockIndex = state.currentBlockIndex;
    const block = state.blocks[blockIndex];
    const isFirstBlock = blockIndex === 0;
    const isLastBlock = blockIndex === state.blocks.length - 1;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{program?.name} · {day?.label}</h2>
          {wakeLockSupported && (
            <button
              onClick={toggleWakeLock}
              aria-pressed={stayOnEnabled}
              className={`px-3 py-1 rounded-lg text-sm flex items-center gap-2 border font-medium transition-colors ${
                stayOnEnabled
                  ? 'bg-green-600 text-white border-green-700 hover:bg-green-700'
                  : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${stayOnEnabled ? 'bg-white' : 'bg-gray-400 dark:bg-gray-500'}`} />
              {stayOnEnabled ? 'Stay On: ON' : 'Stay On: OFF'}
            </button>
          )}
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          Block {blockIndex + 1} of {state.blocks.length}: {block.label}
        </p>

        <div className="space-y-3">
          {block.activities.map((activity, activityIndex) => (
            <div key={activityIndex} className="bg-gray-50 dark:bg-gray-800/60 rounded-xl px-4 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{activity.name}</span>
                {activity.noWeight ? (
                  <span className="text-xs uppercase tracking-wide text-gray-400">bodyweight</span>
                ) : (
                  <input
                    type="text"
                    inputMode="decimal"
                    value={activity.weight}
                    onChange={(e) =>
                      send({ type: 'set-weight', blockIndex, activityIndex, value: e.target.value })
                    }
                    placeholder="weight"
                    className="w-20 text-right bg-white dark:bg-gray-700 rounded-lg px-2 py-1 border border-gray-200 dark:border-gray-600"
                  />
                )}
              </div>
              {block.started && (
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => send({ type: 'decrement-round', blockIndex, activityIndex })}
                    className="w-12 h-12 flex items-center justify-center rounded-lg bg-white dark:bg-gray-700 shadow-sm text-xl leading-none hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    aria-label={`Remove a round from ${activity.name}`}
                  >
                    −1
                  </button>
                  <div className="text-4xl font-bold tabular-nums w-16 text-center">{activity.roundsCompleted}</div>
                  <button
                    onClick={() => send({ type: 'increment-round', blockIndex, activityIndex })}
                    className="flex-1 h-14 flex items-center justify-center rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-lg font-semibold transition-colors"
                    aria-label={`Add a round to ${activity.name}`}
                  >
                    +1 Round
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {!block.started && (
          <button
            onClick={() => send({ type: 'start-block' })}
            className="w-full px-5 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full font-semibold transition-colors"
          >
            Start
          </button>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => send({ type: 'prev-block' })}
            disabled={isFirstBlock}
            className="flex-1 px-5 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-full font-semibold transition-colors"
          >
            ‹ Previous Block
          </button>
          <button
            onClick={() => send({ type: 'next-block' })}
            disabled={isLastBlock}
            className="flex-1 px-5 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-full font-semibold transition-colors"
          >
            Next Block ›
          </button>
        </div>

        <button
          onClick={() => send({ type: 'finish-day' })}
          className="w-full px-5 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full font-semibold hover:opacity-80 transition-opacity"
        >
          Finish Day
        </button>
      </div>
    );
  }

  const totalRounds = state.blocks.reduce(
    (sum, block) => sum + block.activities.reduce((s, a) => s + a.roundsCompleted, 0),
    0,
  );

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">{program?.name} · {day?.label} complete!</h2>

      <div className="flex justify-center">
        <Stat label="Total Rounds" value={totalRounds} />
      </div>

      {state.blocks.map((block) => (
        <div key={block.id} className="space-y-2">
          <h3 className="font-semibold">{block.label}</h3>
          {block.activities.map((activity, index) => (
            <div
              key={index}
              className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/60 rounded-xl px-4 py-3"
            >
              <span>{activity.name}</span>
              <span className="text-gray-500 dark:text-gray-400">
                {formatRounds(activity.roundsCompleted)}{activity.weight ? ` @ ${activity.weight}` : ''}
              </span>
            </div>
          ))}
        </div>
      ))}

      <div className="flex gap-3">
        <button
          onClick={restartDay}
          className="flex-1 px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full font-semibold transition-colors"
        >
          Do Another Day
        </button>
        <button
          onClick={restartProgram}
          className="flex-1 px-5 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full font-semibold transition-colors"
        >
          Choose Different Program
        </button>
      </div>
    </div>
  );
}
