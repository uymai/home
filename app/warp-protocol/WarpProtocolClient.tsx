'use client';

import { useEffect, useMemo, useReducer } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createInitialState, generateSeed, reduceGameState } from './engine';
import { CoreKind } from './types';

type WarpProtocolClientProps = {
  initialSeed?: string;
};

const coreKinds: CoreKind[] = ['credit', 'capacity', 'unstable', 'stabilizer', 'warp'];

function coreLabel(kind: CoreKind): string {
  switch (kind) {
    case 'credit':
      return 'Credit';
    case 'capacity':
      return 'Capacity';
    case 'unstable':
      return 'Unstable';
    case 'stabilizer':
      return 'Stabilizer';
    case 'warp':
      return 'Warp';
    default:
      return kind;
  }
}

function coreCost(kind: CoreKind): number {
  switch (kind) {
    case 'credit':
      return 2;
    case 'capacity':
      return 3;
    case 'unstable':
      return 5;
    case 'stabilizer':
      return 4;
    case 'warp':
      return 9;
    default:
      return 999;
  }
}

export default function WarpProtocolClient({ initialSeed }: WarpProtocolClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  const seed = useMemo(() => {
    if (initialSeed && initialSeed.trim().length > 0) {
      return initialSeed.trim();
    }

    return generateSeed();
  }, [initialSeed]);

  const [state, dispatch] = useReducer(reduceGameState, seed, createInitialState);

  useEffect(() => {
    if (!initialSeed) {
      router.replace(`${pathname}?seed=${seed}`, { scroll: false });
    }
  }, [initialSeed, pathname, router, seed]);

  const shareUrl = `${pathname}?seed=${state.seed}`;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 sm:p-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Warp Protocol</h1>
          <Link href="/" className="text-sm text-cyan-300 hover:text-cyan-200">
            Back to home
          </Link>
        </div>

        <p className="text-sm text-slate-300">
          Objective: hit <span className="font-semibold text-cyan-300">5 warp cores in one run</span> without net
          instability reaching 3.
        </p>
        <p className="text-sm text-slate-300 break-all">
          Share link: <span className="font-mono text-cyan-300">{shareUrl}</span>
        </p>

        <section className="grid grid-cols-2 gap-3 rounded-lg border border-slate-700 bg-slate-900 p-4 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Runs" value={state.runs} />
          <Stat label="Score" value={state.score ?? '-'} />
          <Stat label="Credits" value={state.credits} />
          <Stat label="Capacity Pts" value={state.capacityPoints} />
          <Stat label="Slots / Run" value={state.slotsPerRun} />
          <Stat label="Status" value={state.status === 'won' ? 'Won' : 'Playing'} />
        </section>

        <section className="grid grid-cols-1 gap-3 rounded-lg border border-slate-700 bg-slate-900 p-4 sm:grid-cols-3">
          <Stat label="Bag Size" value={state.bag.length} />
          <Stat label="Discard Size" value={state.discard.length} />
          <Stat label="Next Slot Cost" value={`${state.nextSlotCost} cap`} />
        </section>

        <section className="space-y-3 rounded-lg border border-slate-700 bg-slate-900 p-4">
          <h2 className="text-lg font-semibold">Run Controls</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => dispatch({ type: 'run-reactor' })}
              disabled={state.status !== 'playing'}
              className="rounded bg-cyan-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              Run Reactor
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'buy-slot' })}
              disabled={state.status !== 'playing'}
              className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              Buy Slot ({state.nextSlotCost} cap)
            </button>
            <button
              type="button"
              onClick={() => {
                const nextSeed = generateSeed();
                dispatch({ type: 'new-run', seed: nextSeed });
                router.replace(`${pathname}?seed=${nextSeed}`, { scroll: false });
              }}
              className="rounded bg-fuchsia-600 px-3 py-2 text-sm font-semibold text-white"
            >
              New Run
            </button>
          </div>
        </section>

        <section className="space-y-3 rounded-lg border border-slate-700 bg-slate-900 p-4">
          <h2 className="text-lg font-semibold">Buy Cores</h2>
          <div className="flex flex-wrap gap-2">
            {coreKinds.map((kind) => {
              const cost = coreCost(kind);
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => dispatch({ type: 'buy-core', kind })}
                  disabled={state.status !== 'playing'}
                  className="rounded border border-slate-600 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {coreLabel(kind)} ({cost} cr)
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-lg border border-slate-700 bg-slate-900 p-4">
          <h2 className="mb-2 text-lg font-semibold">Last Run</h2>
          {!state.lastRun ? (
            <p className="text-sm text-slate-400">No run completed yet.</p>
          ) : (
            <div className="space-y-2 text-sm text-slate-300">
              <p>
                Drawn: <span className="font-mono">{state.lastRun.drawn.map((core) => core.kind).join(', ')}</span>
              </p>
              <p>
                Unstable: {state.lastRun.unstableCount} | Stabilizers: {state.lastRun.stabilizerCount} | Net:{' '}
                {state.lastRun.effectiveUnstable}
              </p>
              <p>
                Warp in run: {state.lastRun.warpCount}/{state.warpTargetPerRun}
              </p>
              <p>{state.lastRun.exploded ? 'Run exploded. No rewards earned.' : 'Run stable. Rewards granted.'}</p>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-slate-700 bg-slate-900 p-4">
          <h2 className="mb-2 text-lg font-semibold">Run Log</h2>
          <div className="max-h-64 overflow-y-auto rounded bg-slate-950 p-3">
            <ul className="space-y-2 text-sm text-slate-300">
              {state.log.map((entry, index) => (
                <li key={`${entry}-${index}`}>{entry}</li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}

type StatProps = {
  label: string;
  value: string | number;
};

function Stat({ label, value }: StatProps) {
  return (
    <div className="rounded border border-slate-700 bg-slate-950 px-2 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
