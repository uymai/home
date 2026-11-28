'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addSolve, clearSolves, deleteSolve, exportSolvesJson, importSolvesJson, loadSolves, Solve } from './storage';
import { averageOfLast, best, chartSeries, formatTime, mean, worst } from './stats';

type Phase = 'idle' | 'running';

function Chart({ solves }: { solves: Solve[] }) {
  const data = useMemo(() => chartSeries(solves).slice(-50), [solves]);
  if (data.length < 2) {
    return <p className="text-sm text-gray-500">Record at least two solves to see a chart.</p>;
  }
  const W = 600;
  const H = 220;
  const pad = { l: 44, r: 12, t: 12, b: 24 };
  const maxMs = Math.max(...data.map((d) => d.ms));
  const minMs = Math.min(...data.map((d) => d.ms));
  const span = Math.max(maxMs - minMs, 1000);
  const lo = Math.max(0, minMs - span * 0.1);
  const hi = maxMs + span * 0.1;
  const x = (i: number) => pad.l + (i / (data.length - 1)) * (W - pad.l - pad.r);
  const y = (ms: number) => pad.t + (1 - (ms - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const line = (pick: (d: (typeof data)[number]) => number) =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(pick(d)).toFixed(1)}`).join(' ');
  const ticks = [0, 0.5, 1].map((t) => lo + (hi - lo) * t);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Solve times chart">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="currentColor" strokeOpacity={0.15} />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill="currentColor" opacity={0.6}>
              {formatTime(t)}
            </text>
          </g>
        ))}
        <text x={pad.l} y={H - 6} fontSize={11} fill="currentColor" opacity={0.6}>#{data[0].index}</text>
        <text x={W - pad.r} y={H - 6} textAnchor="end" fontSize={11} fill="currentColor" opacity={0.6}>#{data[data.length - 1].index}</text>
        <path d={line((d) => d.ms)} fill="none" stroke="#94a3b8" strokeWidth={1.5} />
        {data.map((d, i) => (
          <circle key={d.index} cx={x(i)} cy={y(d.ms)} r={3} fill="#94a3b8" />
        ))}
        <path d={line((d) => d.runningAvg)} fill="none" stroke="#3b82f6" strokeWidth={2.5} />
        <path d={line((d) => d.bestSoFar)} fill="none" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 4" />
      </svg>
      <div className="flex gap-4 text-xs mt-1 flex-wrap">
        <span><span className="inline-block w-3 h-0.5 bg-slate-400 align-middle mr-1" />Solve</span>
        <span><span className="inline-block w-3 h-0.5 bg-blue-500 align-middle mr-1" />Running average</span>
        <span><span className="inline-block w-3 h-0.5 bg-green-500 align-middle mr-1" />Best so far</span>
        {solves.length > 50 && <span className="text-gray-500">(last 50 solves)</span>}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-center">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-xl font-mono font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export default function CubeTimerClient() {
  const [solves, setSolves] = useState<Solve[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [displayMs, setDisplayMs] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const startRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only available after mount
    setSolves(loadSolves());
  }, []);

  const start = useCallback(() => {
    startRef.current = performance.now();
    setDisplayMs(0);
    setPhase('running');
    setMessage(null);
    const loop = () => {
      // Setting the same value is a no-op, so React only re-renders when the hundredths change.
      setDisplayMs(Math.floor((performance.now() - startRef.current) / 10) * 10);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    // Full-precision time is recorded; only the display is truncated.
    const elapsed = performance.now() - startRef.current;
    setDisplayMs(elapsed);
    setPhase('idle');
    setSolves(addSolve(elapsed));
  }, []);

  const toggle = useCallback(() => (phase === 'running' ? stop() : start()), [phase, start, stop]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'BUTTON' || tag === 'TEXTAREA') return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  useEffect(() => () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);

  const times = solves.map((s) => s.ms);
  const bestMs = best(solves);
  const stats: [string, number | null][] = [
    ['Best', bestMs],
    ['Average', mean(times)],
    ['Ao5', averageOfLast(solves, 5)],
    ['Ao12', averageOfLast(solves, 12)],
    ['Worst', worst(solves)],
  ];

  const onExport = () => {
    const blob = new Blob([exportSolvesJson(solves)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cube-timer-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const result = importSolvesJson(await file.text());
      setSolves(result.solves);
      setMessage(`Imported ${result.added} new solve${result.added === 1 ? '' : 's'}.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Import failed.');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const onClear = () => {
    if (window.confirm('Delete all recorded solves? This cannot be undone.')) setSolves(clearSolves());
  };

  const recent = [...solves].reverse();

  return (
    <div className="space-y-8">
      <button
        type="button"
        onClick={toggle}
        className={`w-full rounded-2xl py-16 sm:py-20 select-none touch-manipulation transition-colors ${
          phase === 'running'
            ? 'bg-green-100 dark:bg-green-950'
            : 'bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800'
        }`}
        aria-label={phase === 'running' ? 'Stop timer' : 'Start timer'}
      >
        <div className="text-6xl sm:text-7xl font-mono font-bold tabular-nums">{formatTime(displayMs)}</div>
        <div className="mt-3 text-sm text-gray-500">{phase === 'running' ? 'Tap or press space to stop' : 'Tap or press space to start'}</div>
      </button>

      <section>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {stats.map(([label, v]) => (
            <Stat key={label} label={label} value={v === null ? '—' : formatTime(v)} />
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">{solves.length} solve{solves.length === 1 ? '' : 's'} · Ao5/Ao12 drop the best and worst time.</p>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-3">Progress</h2>
        <Chart solves={solves} />
      </section>

      <section>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-lg font-bold">Solves</h2>
          <div className="flex gap-2 flex-wrap text-sm">
            <button type="button" onClick={onExport} disabled={!solves.length} className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-40">Export</button>
            <button type="button" onClick={() => fileRef.current?.click()} className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600">Import</button>
            <button type="button" onClick={onClear} disabled={!solves.length} className="px-3 py-1.5 rounded-md border border-red-300 text-red-600 dark:border-red-800 dark:text-red-400 disabled:opacity-40">Delete all</button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onImport(e.target.files?.[0])} />
          </div>
        </div>
        {message && <p role="status" className="text-sm mb-3">{message}</p>}
        {recent.length === 0 ? (
          <p className="text-sm text-gray-500">No solves yet. Start the timer!</p>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-800 max-h-96 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
            {recent.map((s, i) => (
              <li key={s.id} className="flex items-center gap-3 px-3 py-2">
                <span className="w-10 text-xs text-gray-500 tabular-nums">#{solves.length - i}</span>
                <span className={`font-mono tabular-nums text-lg ${s.ms === bestMs ? 'text-green-600 dark:text-green-400 font-semibold' : ''}`}>{formatTime(s.ms)}</span>
                <span className="text-xs text-gray-500 ml-auto">{new Date(s.at).toLocaleString()}</span>
                <button type="button" onClick={() => setSolves(deleteSolve(s.id))} aria-label={`Delete solve ${formatTime(s.ms)}`} className="px-2 py-1 text-sm text-red-600 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-950">✕</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
