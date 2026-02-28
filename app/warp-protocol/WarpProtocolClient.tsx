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

const moduleTemplates: Record<FluxPurchaseKind, Omit<CoreModule, 'id'>> = {
  'flux-coil': {
    name: 'Flux Coil',
    kind: 'flux-coil',
    tier: 1,
    costFlux: 3,
    costCredits: 0,
    genFlux: 2,
    genCredits: 0,
    addInstability: 1,
  },
  'sponsored-relay': {
    name: 'Sponsored Relay',
    kind: 'sponsored-relay',
    tier: 1,
    costFlux: 5,
    costCredits: 0,
    genFlux: 1,
    genCredits: 2,
    addInstability: 1,
    sponsored: true,
  },
  stabilizer: {
    name: 'Stabilizer',
    kind: 'stabilizer',
    tier: 1,
    costFlux: 4,
    costCredits: 0,
    genFlux: 0,
    genCredits: 0,
    addInstability: -1,
  },
  'volatile-lens': {
    name: 'Volatile Lens',
    kind: 'volatile-lens',
    tier: 2,
    costFlux: 7,
    costCredits: 0,
    genFlux: 4,
    genCredits: 0,
    addInstability: 2,
  },
  'warp-core': {
    name: 'Warp Core',
    kind: 'warp-core',
    tier: 3,
    costFlux: 10,
    costCredits: 0,
    genFlux: 1,
    genCredits: 0,
    addInstability: 2,
    isWarpCore: true,
  },
};

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

function BagPanel({ bag, title }: { bag: CoreModule[]; title: string }) {
  const [showDetails, setShowDetails] = useState(false);
  const grouped = useMemo(() => groupModules(bag), [bag]);

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-900 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
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
      <h2 className="mb-3 text-lg font-semibold">Discard</h2>
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
        <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Last round moved here</p>
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
  const phaseLabel = canDraw ? 'Run Phase' : 'Buy Phase';
  const nextRoundBag = useMemo(() => [...state.bag, ...state.discard], [state.bag, state.discard]);

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100 sm:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Warp Protocol</h1>
          <Link href="/" className="text-sm text-cyan-300 hover:text-cyan-200">
            Back to home
          </Link>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-cyan-300">{phaseLabel}</p>
            <p className="text-xs text-slate-400">Seed: {state.seed}</p>
          </div>
          <p className="mt-2 text-sm text-slate-300 break-all">Share link: <span className="font-mono text-cyan-300">{shareUrl}</span></p>
        </div>

        {canDraw ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <section className="rounded-lg border border-slate-700 bg-slate-900 p-4 lg:col-span-2">
              <h2 className="mb-3 text-lg font-semibold">Current Run</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Stat label="Instability" value={`${state.roundInstability}/${state.instabilityThreshold}`} />
                <Stat label="Unbanked Flux" value={state.roundFlux} />
                <Stat label="Unbanked Credits" value={state.roundCredits} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Bag" value={state.bag.length} />
                <Stat label="Discard" value={state.discard.length} />
                <Stat label="Banked Flux" value={state.bankedFlux} />
                <Stat label="Banked Credits" value={state.bankedCredits} />
              </div>
              {instabilityWarning ? (
                <div className="mt-3 rounded border border-amber-500 bg-amber-500/10 p-3 text-sm text-amber-200">Warning: another risky draw can bust this round.</div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
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

            <section className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h2 className="mb-2 text-lg font-semibold">What You&apos;re Drawing</h2>
              {state.activePile.length === 0 ? (
                <p className="text-sm text-slate-400">No active modules yet this round.</p>
              ) : (
                <ul className="space-y-1 text-sm text-slate-300">
                  {state.activePile.map((core) => (
                    <li key={core.id}>{core.name}</li>
                  ))}
                </ul>
              )}
            </section>

            <BagPanel bag={state.bag} title="Tokens Left In Bag" />
            <DiscardPanel discard={state.discard} lastDiscarded={state.lastDiscarded} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <section className="rounded-lg border border-slate-700 bg-slate-900 p-4 lg:col-span-1">
              <h2 className="mb-3 text-lg font-semibold">Your Resources</h2>
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Banked Flux" value={state.bankedFlux} />
                <Stat label="Banked Credits" value={state.bankedCredits} />
                <Stat label="Warp Goal" value={`${state.warpCoreTarget} in one round`} />
                <Stat label="Round Result" value={state.roundStatus.toUpperCase()} />
              </div>
              <p className="mt-3 text-xs text-slate-400">{state.seedModifier}</p>
              <button
                type="button"
                onClick={() => dispatch({ type: 'start-next-round' })}
                disabled={!canManageBetweenRounds}
                className="mt-4 rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-700"
              >
                Start Next Round
              </button>
            </section>

            <section className="rounded-lg border border-slate-700 bg-slate-900 p-4 lg:col-span-2">
              <h2 className="mb-3 text-lg font-semibold">Buy Modules</h2>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {moduleKinds.map((kind) => {
                  const template = moduleTemplates[kind];
                  const affordable =
                    canManageBetweenRounds &&
                    state.bankedFlux >= template.costFlux &&
                    state.bankedCredits >= template.costCredits;
                  return (
                    <div
                      key={kind}
                      className={`rounded border border-slate-700 bg-slate-950 p-3 ${affordable ? '' : 'opacity-40'}`}
                    >
                      <p className="font-semibold">{template.name}</p>
                      <p className="text-xs text-slate-400">{moduleStatLine({ id: kind, ...template })}</p>
                      <button
                        type="button"
                        onClick={() => dispatch({ type: 'buy-module', kind })}
                        disabled={!affordable}
                        className="mt-2 rounded bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Purchase
                      </button>
                    </div>
                  );
                })}
              </div>
              <h3 className="mt-4 mb-2 text-sm font-semibold uppercase tracking-wide text-slate-300">Upgrades</h3>
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

            <BagPanel bag={nextRoundBag} title="Next Round Bag" />
            <DiscardPanel discard={state.discard} lastDiscarded={state.lastDiscarded} />
          </div>
        )}

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
