'use client';

import { useEffect, useMemo, useReducer } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createInitialState, generateSeed, reduceGameState } from './engine';
import { CreditUpgradeKind, FluxPurchaseKind, ModuleCard } from './types';

type WarpProtocolClientProps = {
  initialSeed?: string;
};

const moduleKinds: FluxPurchaseKind[] = ['flux-coil', 'sponsored-relay', 'stabilizer', 'volatile-lens', 'warp-core'];
const upgradeKinds: CreditUpgradeKind[] = ['slot-capacity', 'instability-threshold', 'draw-limit'];

function moduleLabel(kind: FluxPurchaseKind): string {
  switch (kind) {
    case 'flux-coil':
      return 'Flux Coil';
    case 'sponsored-relay':
      return 'Sponsored Relay';
    case 'stabilizer':
      return 'Stabilizer';
    case 'volatile-lens':
      return 'Volatile Lens';
    case 'warp-core':
      return 'Warp Core';
    default:
      return kind;
  }
}

function moduleFluxCost(kind: FluxPurchaseKind): number {
  switch (kind) {
    case 'flux-coil':
      return 3;
    case 'sponsored-relay':
      return 5;
    case 'stabilizer':
      return 4;
    case 'volatile-lens':
      return 7;
    case 'warp-core':
      return 10;
    default:
      return 999;
  }
}

function upgradeLabel(kind: CreditUpgradeKind): string {
  switch (kind) {
    case 'slot-capacity':
      return 'Slot Capacity';
    case 'instability-threshold':
      return 'Instability Tolerance';
    case 'draw-limit':
      return 'Draw Limit';
    default:
      return kind;
  }
}

function moduleSummary(module: ModuleCard): string {
  return `${module.kind} (flux ${module.fluxValue}, credits ${module.creditValue}, instability ${module.instabilityValue})`;
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
  const instabilityWarning = state.phase === 'draw' && state.roundInstability >= state.instabilityThreshold - 1;

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100 sm:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Warp Protocol</h1>
          <Link href="/" className="text-sm text-cyan-300 hover:text-cyan-200">
            Back to home
          </Link>
        </div>

        <p className="text-sm text-slate-300">
          Draw one module at a time. Stop to bank rewards. If instability reaches threshold, meltdown ends the run.
        </p>
        <p className="text-sm text-slate-300 break-all">
          Share link: <span className="font-mono text-cyan-300">{shareUrl}</span>
        </p>

        <section className="grid grid-cols-2 gap-3 rounded-lg border border-slate-700 bg-slate-900 p-4 sm:grid-cols-4 lg:grid-cols-8">
          <Stat label="Status" value={state.status.toUpperCase()} />
          <Stat label="Phase" value={state.phase.toUpperCase()} />
          <Stat label="Rounds Banked" value={state.rounds} />
          <Stat label="Flux" value={state.flux} />
          <Stat label="Credits" value={state.credits} />
          <Stat label="Warp Progress" value={`${state.warpProgress}/${state.warpProgressTarget}`} />
          <Stat label="Draw Limit" value={state.drawLimit} />
          <Stat label="Slot Capacity" value={state.slotCapacity} />
        </section>

        <section className="grid grid-cols-1 gap-3 rounded-lg border border-slate-700 bg-slate-900 p-4 sm:grid-cols-3">
          <Stat label="Round Flux" value={state.roundFlux} />
          <Stat label="Round Credits" value={state.roundCredits} />
          <Stat label="Round Instability" value={`${state.roundInstability}/${state.instabilityThreshold}`} />
        </section>

        {instabilityWarning ? (
          <div className="rounded-lg border border-amber-500 bg-amber-500/10 p-3 text-sm text-amber-200">
            Warning: one more unstable draw can trigger an immediate meltdown.
          </div>
        ) : null}

        <section className="space-y-3 rounded-lg border border-slate-700 bg-slate-900 p-4">
          <h2 className="text-lg font-semibold">Draw Phase</h2>
          <p className="text-sm text-slate-300">{state.seedModifier}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => dispatch({ type: 'draw-module' })}
              disabled={state.status !== 'playing' || state.phase !== 'draw'}
              className="rounded bg-cyan-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              Draw 1 Module
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'stop-and-bank' })}
              disabled={state.status !== 'playing' || state.phase !== 'draw'}
              className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              Stop and Bank
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
          <h2 className="text-lg font-semibold">Buy Phase</h2>
          <p className="text-sm text-slate-300">Spend Flux on modules, Credits on throughput upgrades.</p>
          <div className="flex flex-wrap gap-2">
            {moduleKinds.map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => dispatch({ type: 'buy-module', kind })}
                disabled={state.status !== 'playing' || state.phase !== 'buy'}
                className="rounded border border-slate-600 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {moduleLabel(kind)} ({moduleFluxCost(kind)} flux)
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {upgradeKinds.map((kind) => {
              const cost =
                kind === 'slot-capacity'
                  ? state.nextSlotCapacityCost
                  : kind === 'instability-threshold'
                    ? state.nextInstabilityCost
                    : state.nextDrawLimitCost;
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => dispatch({ type: 'buy-upgrade', kind })}
                  disabled={state.status !== 'playing' || state.phase !== 'buy'}
                  className="rounded bg-slate-800 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {upgradeLabel(kind)} ({cost} credits)
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => dispatch({ type: 'start-next-round' })}
            disabled={state.status !== 'playing' || state.phase !== 'buy'}
            className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            Start Next Round
          </button>
        </section>

        <section className="rounded-lg border border-slate-700 bg-slate-900 p-4">
          <h2 className="mb-2 text-lg font-semibold">Active Pile</h2>
          {state.activePile.length === 0 ? (
            <p className="text-sm text-slate-400">No modules currently active.</p>
          ) : (
            <ul className="space-y-1 text-sm text-slate-300">
              {state.activePile.map((module) => (
                <li key={module.id}>{moduleSummary(module)}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-slate-700 bg-slate-900 p-4">
          <h2 className="mb-2 text-lg font-semibold">Last Round</h2>
          {!state.lastRound ? (
            <p className="text-sm text-slate-400">No completed round yet.</p>
          ) : (
            <div className="space-y-2 text-sm text-slate-300">
              <p>
                Round {state.lastRound.number}: {state.lastRound.exploded ? 'Meltdown' : 'Banked'}
              </p>
              <p>
                Flux {state.lastRound.roundFlux} | Credits {state.lastRound.roundCredits} | Instability{' '}
                {state.lastRound.roundInstability}
              </p>
              <p>
                Drawn: <span className="font-mono">{state.lastRound.drawn.map((module) => module.kind).join(', ') || '-'}</span>
              </p>
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
