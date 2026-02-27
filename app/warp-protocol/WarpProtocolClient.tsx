'use client';

import { useEffect, useMemo, useReducer, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createInitialState, generateSeed, reduceGameState } from './engine';
import { CoreModule, CreditUpgradeKind, FluxPurchaseKind } from './types';

type WarpProtocolClientProps = {
  initialSeed?: string;
};

const moduleKinds: FluxPurchaseKind[] = ['flux-coil', 'sponsored-relay', 'stabilizer', 'volatile-lens', 'warp-core'];
const upgradeKinds: CreditUpgradeKind[] = ['slot-capacity', 'instability-threshold', 'draw-limit'];

function groupModules(modules: CoreModule[]): Array<{ module: CoreModule; count: number }> {
  const grouped = new Map<string, { module: CoreModule; count: number }>();
  for (const core of modules) {
    const existing = grouped.get(core.kind);
    if (existing) {
      existing.count += 1;
    } else {
      grouped.set(core.kind, { module: core, count: 1 });
    }
  }
  return Array.from(grouped.values()).sort((a, b) => a.module.tier - b.module.tier || a.module.name.localeCompare(b.module.name));
}

function moduleFlags(core: CoreModule): string {
  const flags: string[] = [];
  if (core.sponsored) flags.push('Sponsored');
  if (core.isWarpCore) flags.push('Warp Core');
  return flags.join(', ');
}

function moduleStatLine(core: CoreModule): string {
  const flags = moduleFlags(core);
  const base = `Tier ${core.tier} | Cost ${core.costFlux} flux${core.costCredits > 0 ? ` + ${core.costCredits} credits` : ''} | +${core.genFlux} flux | +${core.genCredits} credits | instability ${core.addInstability >= 0 ? '+' : ''}${core.addInstability}`;
  return flags ? `${base} | ${flags}` : base;
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

function BagPanel({ bag }: { bag: CoreModule[] }) {
  const [showDetails, setShowDetails] = useState(false);
  const grouped = useMemo(() => groupModules(bag), [bag]);

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-900 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Bag Panel</h2>
        <button
          type="button"
          onClick={() => setShowDetails((current) => !current)}
          className="rounded bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-200"
        >
          {showDetails ? 'Hide details' : 'Show details'}
        </button>
      </div>
      {grouped.length === 0 ? (
        <p className="text-sm text-slate-400">Bag is empty.</p>
      ) : (
        <ul className="space-y-2 text-sm text-slate-300">
          {grouped.map(({ module, count }) => (
            <li key={module.kind}>
              <p className="font-semibold">
                {count}x {module.name}
              </p>
              <p className="text-xs text-slate-400">{moduleStatLine(module)}</p>
            </li>
          ))}
        </ul>
      )}

      {showDetails ? (
        <div className="mt-4 rounded bg-slate-950 p-3">
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Instances</p>
          {bag.length === 0 ? (
            <p className="text-sm text-slate-500">No module instances.</p>
          ) : (
            <ul className="space-y-1 text-xs text-slate-300">
              {bag.map((module) => (
                <li key={module.id}>
                  {module.name} ({module.id})
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}

function DiscardPanel({ discard, lastDiscarded }: { discard: CoreModule[]; lastDiscarded: CoreModule[] }) {
  const groupedDiscard = useMemo(() => groupModules(discard), [discard]);
  return (
    <section className="rounded-lg border border-slate-700 bg-slate-900 p-4">
      <h2 className="mb-3 text-lg font-semibold">Discard Panel</h2>
      {groupedDiscard.length === 0 ? (
        <p className="text-sm text-slate-400">Discard is empty.</p>
      ) : (
        <ul className="space-y-2 text-sm text-slate-300">
          {groupedDiscard.map(({ module, count }) => (
            <li key={module.kind}>
              <p className="font-semibold">
                {count}x {module.name}
              </p>
              <p className="text-xs text-slate-400">{moduleStatLine(module)}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 rounded bg-slate-950 p-3">
        <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Last round to discard</p>
        {lastDiscarded.length === 0 ? (
          <p className="text-sm text-slate-500">No recent discard.</p>
        ) : (
          <ul className="space-y-1 text-sm text-slate-300">
            {lastDiscarded.map((module) => (
              <li key={module.id}>{module.name}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ModuleLegend({ modules }: { modules: CoreModule[] }) {
  const grouped = useMemo(() => groupModules(modules), [modules]);
  return (
    <section className="rounded-lg border border-slate-700 bg-slate-900 p-4">
      <h2 className="mb-3 text-lg font-semibold">Module Legend</h2>
      {grouped.length === 0 ? (
        <p className="text-sm text-slate-400">No modules unlocked yet.</p>
      ) : (
        <ul className="space-y-2 text-sm text-slate-300">
          {grouped.map(({ module }) => (
            <li key={module.kind}>
              <p className="font-semibold">{module.name}</p>
              <p className="text-xs text-slate-400">{moduleStatLine(module)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function WarpProtocolClient({ initialSeed }: WarpProtocolClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const seed = useMemo(() => (initialSeed && initialSeed.trim() ? initialSeed.trim() : generateSeed()), [initialSeed]);
  const [state, dispatch] = useReducer(reduceGameState, seed, createInitialState);

  useEffect(() => {
    if (!initialSeed) {
      router.replace(`${pathname}?seed=${seed}`, { scroll: false });
    }
  }, [initialSeed, pathname, router, seed]);

  const canDraw = state.status === 'playing' && state.roundStatus === 'drawing';
  const canManageBetweenRounds = state.status === 'playing' && state.roundStatus !== 'drawing';
  const instabilityWarning = canDraw && state.roundInstability >= state.instabilityThreshold - 1;
  const shareUrl = `${pathname}?seed=${state.seed}`;
  const allKnownModules = useMemo(() => [...state.bag, ...state.discard, ...state.activePile], [state.bag, state.discard, state.activePile]);

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100 sm:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Warp Protocol</h1>
          <Link href="/" className="text-sm text-cyan-300 hover:text-cyan-200">
            Back to home
          </Link>
        </div>

        <p className="text-sm text-slate-300">Push your luck: draw one module at a time, stop and bank, or bust the round if instability spikes.</p>
        <p className="text-sm text-slate-300 break-all">
          Share link: <span className="font-mono text-cyan-300">{shareUrl}</span>
        </p>

        <section className="grid grid-cols-2 gap-3 rounded-lg border border-slate-700 bg-slate-900 p-4 sm:grid-cols-4 lg:grid-cols-8">
          <Stat label="Run Status" value={state.status.toUpperCase()} />
          <Stat label="Round Status" value={state.roundStatus.toUpperCase()} />
          <Stat label="Rounds" value={state.rounds} />
          <Stat label="Bag Size" value={state.bag.length} />
          <Stat label="Discard Size" value={state.discard.length} />
          <Stat label="Banked Flux" value={state.bankedFlux} />
          <Stat label="Banked Credits" value={state.bankedCredits} />
          <Stat label="Warp Progress" value={`${state.warpProgress}/${state.warpProgressTarget}`} />
        </section>

        <section className="grid grid-cols-1 gap-3 rounded-lg border border-slate-700 bg-slate-900 p-4 sm:grid-cols-3">
          <Stat label="Instability Meter" value={`${state.roundInstability}/${state.instabilityThreshold}`} />
          <Stat label="Round Flux (Unbanked)" value={state.roundFlux} />
          <Stat label="Round Credits (Unbanked)" value={state.roundCredits} />
        </section>

        {instabilityWarning ? (
          <div className="rounded-lg border border-amber-500 bg-amber-500/10 p-3 text-sm text-amber-200">Warning: another risky draw can bust this round.</div>
        ) : null}

        <section className="space-y-3 rounded-lg border border-slate-700 bg-slate-900 p-4">
          <h2 className="text-lg font-semibold">Round Controls</h2>
          <p className="text-sm text-slate-300">{state.seedModifier}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => dispatch({ type: 'draw-module' })}
              disabled={!canDraw}
              className="rounded bg-cyan-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              Draw 1
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'stop-and-bank' })}
              disabled={!canDraw}
              className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              Stop &amp; Bank
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'start-next-round' })}
              disabled={!canManageBetweenRounds}
              className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              Start Next Round
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
          <h2 className="text-lg font-semibold">Shop</h2>
          <p className="text-sm text-slate-300">Buy modules with Flux/Credits and upgrades with Credits between rounds.</p>
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {moduleKinds.map((kind) => {
              const template = allKnownModules.find((module) => module.kind === kind) ?? {
                id: kind,
                name:
                  kind === 'flux-coil'
                    ? 'Flux Coil'
                    : kind === 'sponsored-relay'
                      ? 'Sponsored Relay'
                      : kind === 'stabilizer'
                        ? 'Stabilizer'
                        : kind === 'volatile-lens'
                          ? 'Volatile Lens'
                          : 'Warp Core',
                kind,
                tier: kind === 'volatile-lens' ? 2 : kind === 'warp-core' ? 3 : 1,
                costFlux: kind === 'flux-coil' ? 3 : kind === 'sponsored-relay' ? 5 : kind === 'stabilizer' ? 4 : kind === 'volatile-lens' ? 7 : 10,
                costCredits: 0,
                genFlux: kind === 'flux-coil' ? 2 : kind === 'sponsored-relay' ? 1 : kind === 'stabilizer' ? 0 : kind === 'volatile-lens' ? 4 : 1,
                genCredits: kind === 'sponsored-relay' ? 2 : 0,
                addInstability: kind === 'stabilizer' ? -1 : kind === 'volatile-lens' ? 2 : kind === 'warp-core' ? 2 : 1,
                sponsored: kind === 'sponsored-relay',
                isWarpCore: kind === 'warp-core',
              };
              return (
                <div key={kind} className="rounded border border-slate-700 bg-slate-950 p-3">
                  <p className="font-semibold">{template.name}</p>
                  <p className="text-xs text-slate-400">{moduleStatLine(template)}</p>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'buy-module', kind })}
                    disabled={!canManageBetweenRounds}
                    className="mt-2 rounded bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Purchase
                  </button>
                </div>
              );
            })}
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
                  disabled={!canManageBetweenRounds}
                  className="rounded bg-slate-800 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {upgradeLabel(kind)} ({cost} credits)
                </button>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BagPanel bag={state.bag} />
          <DiscardPanel discard={state.discard} lastDiscarded={state.lastDiscarded} />
        </div>

        <ModuleLegend modules={allKnownModules} />

        <section className="rounded-lg border border-slate-700 bg-slate-900 p-4">
          <h2 className="mb-2 text-lg font-semibold">Active Pile</h2>
          {state.activePile.length === 0 ? (
            <p className="text-sm text-slate-400">No active modules in current round.</p>
          ) : (
            <ul className="space-y-1 text-sm text-slate-300">
              {state.activePile.map((core) => (
                <li key={core.id}>{core.name}</li>
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
                Round {state.lastRound.number}: {state.lastRound.status.toUpperCase()}
              </p>
              <p>
                Flux {state.lastRound.roundFlux} | Credits {state.lastRound.roundCredits} | Instability {state.lastRound.roundInstability}
              </p>
              <p>
                Drawn: <span className="font-mono">{state.lastRound.drawn.map((core) => core.kind).join(', ') || '-'}</span>
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
