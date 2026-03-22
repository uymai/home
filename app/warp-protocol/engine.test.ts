import { describe, expect, it } from 'vitest';
import { createInitialState, formatSeed, generateDailySeed, reduceGameState } from './engine';
import { CoreKind, CoreModule, GameAction, GameState, ResolvedEffect } from './types';

function createTestModule(kind: CoreKind, id: number): CoreModule {
  switch (kind) {
    case 'flux-coil':
      return {
        id: `module-${id}`,
        name: 'Flux Coil',
        kind,
        tier: 1,
        costFlux: 3,
        costCredits: 0,
        genFlux: 2,
        genCredits: 0,
        addInstability: 1,
      };
    case 'sponsored-relay':
      return {
        id: `module-${id}`,
        name: 'Sponsored Relay',
        kind,
        tier: 1,
        costFlux: 5,
        costCredits: 0,
        genFlux: 1,
        genCredits: 2,
        addInstability: 1,
        sponsored: true,
      };
    case 'stabilizer':
      return {
        id: `module-${id}`,
        name: 'Stabilizer',
        kind,
        tier: 1,
        costFlux: 4,
        costCredits: 0,
        genFlux: 0,
        genCredits: 0,
        addInstability: -1,
      };
    case 'volatile-lens':
      return {
        id: `module-${id}`,
        name: 'Volatile Lens',
        kind,
        tier: 2,
        costFlux: 7,
        costCredits: 0,
        genFlux: 4,
        genCredits: 0,
        addInstability: 2,
      };
    case 'warp-core':
      return {
        id: `module-${id}`,
        name: 'Warp Core',
        kind,
        tier: 3,
        costFlux: 10,
        costCredits: 0,
        genFlux: 1,
        genCredits: 0,
        addInstability: 2,
        isWarpCore: true,
      };
    case 'surge-tap':
      return {
        id: `module-${id}`,
        name: 'Surge Tap',
        kind,
        tier: 2,
        costFlux: 5,
        costCredits: 0,
        genFlux: 0,
        genCredits: 0,
        addInstability: 1,
        effectDescription: '+1 flux per module already installed this round | +0 credits | instability +1',
      };
    case 'harmony-core':
      return {
        id: `module-${id}`,
        name: 'Harmony Core',
        kind,
        tier: 2,
        costFlux: 6,
        costCredits: 0,
        genFlux: 0,
        genCredits: 0,
        addInstability: 0,
        effectDescription: '+0 flux | +2 credits per Stabilizer owned | instability +0',
      };
    case 'redline-capacitor':
      return {
        id: `module-${id}`,
        name: 'Redline Capacitor',
        kind,
        tier: 2,
        costFlux: 6,
        costCredits: 0,
        genFlux: 1,
        genCredits: 0,
        addInstability: 1,
        effectDescription: '+5 flux if within 2 of instability threshold, else +1 flux | +0 credits | instability +1',
      };
    case 'echo-module':
      return {
        id: `module-${id}`,
        name: 'Echo Module',
        kind,
        tier: 3,
        costFlux: 8,
        costCredits: 0,
        genFlux: 0,
        genCredits: 0,
        addInstability: 1,
        effectDescription: 'Copies the effect of the previously drawn module (+1 instability on top)',
      };
    default:
      throw new Error(`No test module factory for kind: ${kind}`);
  }
}

function applyActions(initialState: GameState, actions: GameAction[]): GameState {
  return actions.reduce((state, action) => reduceGameState(state, action), initialState);
}

function findSeedForThreshold(targetThreshold: number): string {
  for (let index = 0; index < 500; index += 1) {
    const seed = `threshold-${targetThreshold}-${index}`;
    if (createInitialState(seed).instabilityThreshold === targetThreshold) {
      return seed;
    }
  }
  throw new Error(`Could not find seed for instability threshold ${targetThreshold}.`);
}

function firstDrawKind(seed: string): CoreKind {
  const drawnState = reduceGameState(createInitialState(seed), { type: 'draw-module' });
  const drawnModule = drawnState.activePile[0] ?? drawnState.lastRound?.drawn[0];
  if (!drawnModule) {
    throw new Error(`No module drawn for seed ${seed}.`);
  }
  return drawnModule.kind;
}

describe('Warp Protocol engine', () => {
  it('creates the expected initial state', () => {
    const state = createInitialState('baseline-seed');

    expect(state.roundStatus).toBe('drawing');
    expect(state.rounds).toBe(0);
    expect(state.gameVersion).toBe('1.0.0');
    expect(state.availableModuleCount).toBe(5);
    expect(state.availableModuleKinds).toEqual(['flux-coil', 'sponsored-relay', 'stabilizer', 'volatile-lens', 'warp-core']);
    expect(state.bankedFlux).toBe(0);
    expect(state.bankedCredits).toBe(0);
    expect(state.roundFlux).toBe(0);
    expect(state.roundCredits).toBe(0);
    expect(state.roundInstability).toBe(0);
    expect(state.nextModuleId).toBe(6);
    expect(state.bag).toHaveLength(5);
    expect(state.bag.map((module) => module.kind)).toEqual([
      'flux-coil',
      'flux-coil',
      'sponsored-relay',
      'stabilizer',
      'volatile-lens',
    ]);
    expect(state.lastResolvedEffect).toBeNull();
  });

  it('applies seed instability modifiers without dropping below the floor', () => {
    const volatileSeed = findSeedForThreshold(3);
    const neutralSeed = findSeedForThreshold(4);
    const reinforcedSeed = findSeedForThreshold(5);

    expect(createInitialState(volatileSeed).instabilityThreshold).toBe(3);
    expect(createInitialState(neutralSeed).instabilityThreshold).toBe(4);
    expect(createInitialState(reinforcedSeed).instabilityThreshold).toBe(5);

    for (let index = 0; index < 100; index += 1) {
      expect(createInitialState(`floor-check-${index}`).instabilityThreshold).toBeGreaterThanOrEqual(2);
    }
  });

  it('keeps legacy seeds playable while assigning default seed metadata', () => {
    const state = createInitialState('v1:core:legacy-seed');

    expect(state.seed).toBe('v1:core:legacy-seed');
    expect(state.gameVersion).toBe('1.0.0');
    expect(state.availableModuleCount).toBe(5);
  });

  it('derives daily mode metadata from explicit and implicit daily seeds', () => {
    const explicit = createInitialState(generateDailySeed('2026-03-01'), {
      mode: 'daily',
      dailyDate: '2026-03-01',
    });
    const implicit = createInitialState('daily-2026-03-02', {
      mode: 'daily',
    });
    const versioned = createInitialState(generateDailySeed('2026-03-03'), {
      mode: 'daily',
    });

    expect(explicit.dailyDate).toBe('2026-03-01');
    expect(explicit.seed).toBe('game-1.2.0:mods-9:daily-2026-03-01');
    expect(implicit.dailyDate).toBe('2026-03-02');
    expect(versioned.seed).toBe('game-1.2.0:mods-9:daily-2026-03-03');
    expect(versioned.dailyDate).toBe('2026-03-03');
  });

  it('produces identical state transitions for identical seeded runs', () => {
    const actions: GameAction[] = [{ type: 'draw-module' }, { type: 'draw-module' }, { type: 'stop-and-bank' }];
    const seed = formatSeed('deterministic-seed');
    const firstRun = applyActions(createInitialState(seed), actions);
    const secondRun = applyActions(createInitialState(seed), actions);

    expect(firstRun).toEqual(secondRun);
  });

  it('uses distinct rng states across different seeds and yields varied early draws', () => {
    const alpha = createInitialState('alpha-seed');
    const beta = createInitialState('beta-seed');
    const firstDraws = new Set(
      ['alpha-seed', 'beta-seed', 'gamma-seed', 'delta-seed', 'epsilon-seed', 'zeta-seed'].map(firstDrawKind),
    );

    expect(alpha.rngState).not.toBe(beta.rngState);
    expect(firstDraws.size).toBeGreaterThan(1);
  });

  it('deterministically selects a run-specific module lineup for newer game versions', () => {
    const first = createInitialState(formatSeed('lineup-seed'));
    const second = createInitialState(formatSeed('lineup-seed'));

    expect(first.gameVersion).toBe('1.2.0');
    expect(first.availableModuleCount).toBe(9);
    expect(first.availableModuleKinds).toHaveLength(9);
    // All 9 module types are always available in v1.2.0
    expect(first.availableModuleKinds).toContain('warp-core');
    expect(first.availableModuleKinds).toContain('surge-tap');
    expect(first.availableModuleKinds).toContain('harmony-core');
    expect(first.availableModuleKinds).toContain('redline-capacitor');
    expect(first.availableModuleKinds).toContain('echo-module');
    // Same seed always produces the same lineup
    expect(first.availableModuleKinds).toEqual(second.availableModuleKinds);
  });

  it('draws modules into the active pile and updates unbanked resources', () => {
    const state = createInitialState('draw-seed');
    const nextState = reduceGameState(state, { type: 'draw-module' });
    const drawnModule = nextState.activePile[0];

    expect(drawnModule).toBeDefined();
    expect(nextState.bag).toHaveLength(4);
    expect(nextState.activePile).toHaveLength(1);
    expect(nextState.lastResolvedEffect).not.toBeNull();
  });

  it('treats draw actions as no-ops outside an active round', () => {
    const stoppedState: GameState = {
      ...createInitialState('stopped-seed'),
      roundStatus: 'stopped',
    };
    const wonState: GameState = {
      ...createInitialState('won-seed'),
      status: 'won',
      score: 1,
    };

    expect(reduceGameState(stoppedState, { type: 'draw-module' })).toBe(stoppedState);
    expect(reduceGameState(wonState, { type: 'draw-module' })).toBe(wonState);
  });

  it('reshuffles discard into the bag when drawing from an empty bag', () => {
    const recycledModule = createTestModule('flux-coil', 99);
    const state: GameState = {
      ...createInitialState('reshuffle-seed'),
      bag: [],
      discard: [recycledModule],
      activePile: [],
      roundFlux: 0,
      roundCredits: 0,
      roundInstability: 0,
    };

    const nextState = reduceGameState(state, { type: 'draw-module' });

    expect(nextState.activePile).toEqual([recycledModule]);
    expect(nextState.discard).toEqual([]);
    expect(nextState.log).toContain('Reshuffled discard into bag.');
  });

  it('banks round resources and records the round snapshot on manual bank', () => {
    const drawnModules = [createTestModule('flux-coil', 1), createTestModule('sponsored-relay', 2)];
    const state: GameState = {
      ...createInitialState('bank-seed'),
      activePile: drawnModules,
      roundFlux: 3,
      roundCredits: 2,
      roundInstability: 2,
    };

    const nextState = reduceGameState(state, { type: 'stop-and-bank' });

    expect(nextState.rounds).toBe(1);
    expect(nextState.roundStatus).toBe('stopped');
    expect(nextState.bankedFlux).toBe(3);
    expect(nextState.bankedCredits).toBe(2);
    expect(nextState.roundWarpCores).toBe(0);
    expect(nextState.roundFlux).toBe(0);
    expect(nextState.roundCredits).toBe(0);
    expect(nextState.roundInstability).toBe(0);
    expect(nextState.activePile).toEqual([]);
    expect(nextState.discard).toEqual(drawnModules);
    expect(nextState.lastDiscarded).toEqual(drawnModules);
    expect(nextState.lastResolvedEffect).toBeNull();
    expect(nextState.lastRound).toMatchObject({
      number: 1,
      status: 'stopped',
      bankReason: 'manual',
      roundWarpCores: 0,
      roundFlux: 3,
      roundCredits: 2,
      roundInstability: 2,
      drawn: drawnModules,
    });
  });

  it('ignores manual bank requests outside the draw phase', () => {
    const state: GameState = {
      ...createInitialState('bank-noop-seed'),
      roundStatus: 'stopped',
    };

    expect(reduceGameState(state, { type: 'stop-and-bank' })).toBe(state);
  });

  it('busts immediately when instability meets the threshold', () => {
    const volatileLens = createTestModule('volatile-lens', 7);
    const state: GameState = {
      ...createInitialState('bust-seed'),
      bag: [volatileLens],
      discard: [],
      instabilityThreshold: 2,
      roundInstability: 0,
      activePile: [],
      bankedFlux: 5,
      bankedCredits: 1,
    };

    const nextState = reduceGameState(state, { type: 'draw-module' });

    expect(nextState.rounds).toBe(1);
    expect(nextState.roundStatus).toBe('busted');
    expect(nextState.volatilityExceededCount).toBe(1);
    expect(nextState.bankedFlux).toBe(5);
    expect(nextState.bankedCredits).toBe(1);
    expect(nextState.roundWarpCores).toBe(0);
    expect(nextState.roundFlux).toBe(0);
    expect(nextState.roundCredits).toBe(0);
    expect(nextState.roundInstability).toBe(0);
    expect(nextState.activePile).toEqual([]);
    expect(nextState.discard).toEqual([volatileLens]);
    expect(nextState.lastResolvedEffect).toBeNull();
    expect(nextState.lastRound).toMatchObject({
      status: 'busted',
      roundWarpCores: 0,
      roundFlux: 4,
      roundCredits: 0,
      roundInstability: 2,
      drawn: [volatileLens],
    });
  });

  it('auto-banks when slot capacity is reached', () => {
    const fluxCoil = createTestModule('flux-coil', 3);
    const state: GameState = {
      ...createInitialState('auto-bank-seed'),
      bag: [fluxCoil],
      slotCapacity: 1,
    };

    const nextState = reduceGameState(state, { type: 'draw-module' });

    expect(nextState.rounds).toBe(1);
    expect(nextState.roundStatus).toBe('stopped');
    expect(nextState.bankedFlux).toBe(2);
    expect(nextState.bankedCredits).toBe(0);
    expect(nextState.activePile).toEqual([]);
    expect(nextState.discard).toEqual([fluxCoil]);
    expect(nextState.lastRound).toMatchObject({
      status: 'stopped',
      bankReason: 'auto-capacity',
      roundWarpCores: 0,
      drawn: [fluxCoil],
    });
  });

  it('starts the next round by recycling discard into the bag', () => {
    const recycledModules = [createTestModule('stabilizer', 4), createTestModule('flux-coil', 5)];
    const state: GameState = {
      ...createInitialState('next-round-seed'),
      roundStatus: 'stopped',
      bag: [createTestModule('sponsored-relay', 6)],
      discard: recycledModules,
    };

    const nextState = reduceGameState(state, { type: 'start-next-round' });

    expect(nextState.roundStatus).toBe('drawing');
    expect(nextState.discard).toEqual([]);
    expect(nextState.bag).toEqual([createTestModule('sponsored-relay', 6), ...recycledModules]);
    expect(nextState.lastResolvedEffect).toBeNull();
  });

  it('treats buy-phase actions as no-ops during the draw phase', () => {
    const state = createInitialState('buy-noop-seed');

    expect(reduceGameState(state, { type: 'buy-module', kind: 'flux-coil' })).toBe(state);
    expect(reduceGameState(state, { type: 'buy-upgrade', kind: 'slot-capacity' })).toBe(state);
    expect(reduceGameState(state, { type: 'start-next-round' })).toBe(state);
  });

  it('buys modules and upgrades with the expected resource and cost changes', () => {
    const buyPhaseState: GameState = {
      ...createInitialState('buy-phase-seed'),
      roundStatus: 'stopped',
      bankedFlux: 10,
      bankedCredits: 10,
    };

    const purchasedModuleState = reduceGameState(buyPhaseState, { type: 'buy-module', kind: 'warp-core' });
    const slotUpgradeState = reduceGameState(purchasedModuleState, { type: 'buy-upgrade', kind: 'slot-capacity' });
    const thresholdUpgradeState = reduceGameState(slotUpgradeState, { type: 'buy-upgrade', kind: 'instability-threshold' });

    expect(purchasedModuleState.bankedFlux).toBe(0);
    expect(purchasedModuleState.nextModuleId).toBe(7);
    expect(purchasedModuleState.bag.at(-1)).toMatchObject({
      id: 'module-6',
      kind: 'warp-core',
      isWarpCore: true,
    });

    expect(slotUpgradeState.bankedCredits).toBe(5);
    expect(slotUpgradeState.slotCapacity).toBe(5);
    expect(slotUpgradeState.nextSlotCapacityCost).toBe(6);

    expect(thresholdUpgradeState.bankedCredits).toBe(0);
    expect(thresholdUpgradeState.instabilityThreshold).toBe(slotUpgradeState.instabilityThreshold + 1);
    expect(thresholdUpgradeState.nextInstabilityCost).toBe(6);
  });

  it('refuses purchases for modules not selected for the run', () => {
    const state: GameState = {
      ...createInitialState(formatSeed('restricted-shop-seed')),
      roundStatus: 'stopped',
      bankedFlux: 20,
      availableModuleKinds: ['warp-core', 'flux-coil', 'sponsored-relay', 'stabilizer', 'volatile-lens'],
    };

    const unavailablePurchase = reduceGameState(state, { type: 'buy-module', kind: 'credit-spike' });

    expect(unavailablePurchase.bag).toEqual(state.bag);
    expect(unavailablePurchase.log.at(-1)).toBe('Credit Spike is not available in this run.');
  });

  it('refuses purchases when resources are insufficient', () => {
    const state: GameState = {
      ...createInitialState('insufficient-seed'),
      roundStatus: 'stopped',
      bankedFlux: 2,
      bankedCredits: 1,
    };

    const failedModulePurchase = reduceGameState(state, { type: 'buy-module', kind: 'flux-coil' });
    const failedUpgradePurchase = reduceGameState(state, { type: 'buy-upgrade', kind: 'slot-capacity' });

    expect(failedModulePurchase.bag).toEqual(state.bag);
    expect(failedModulePurchase.nextModuleId).toBe(state.nextModuleId);
    expect(failedModulePurchase.log.at(-1)).toBe('Not enough resources for Flux Coil.');

    expect(failedUpgradePurchase.slotCapacity).toBe(state.slotCapacity);
    expect(failedUpgradePurchase.bankedCredits).toBe(state.bankedCredits);
    expect(failedUpgradePurchase.log.at(-1)).toBe('Not enough credits for slot capacity upgrade (cost 5).');
  });

  it('wins only when enough warp cores are banked in the same round and blocks further play', () => {
    const losingRoundState: GameState = {
      ...createInitialState('lose-seed'),
      activePile: [createTestModule('warp-core', 1), createTestModule('warp-core', 2), createTestModule('warp-core', 3)],
      roundWarpCores: 3,
      roundFlux: 3,
      roundCredits: 0,
      roundInstability: 6,
    };
    const winningRoundState: GameState = {
      ...createInitialState('win-seed'),
      activePile: [
        createTestModule('warp-core', 1),
        createTestModule('warp-core', 2),
        createTestModule('warp-core', 3),
        createTestModule('warp-core', 4),
      ],
      roundWarpCores: 4,
      roundFlux: 4,
      roundCredits: 0,
      roundInstability: 8,
    };

    const losingResult = reduceGameState(losingRoundState, { type: 'stop-and-bank' });
    const winningResult = reduceGameState(winningRoundState, { type: 'stop-and-bank' });

    expect(losingResult.status).toBe('playing');
    expect(losingResult.score).toBeNull();

    expect(winningResult.status).toBe('won');
    expect(winningResult.score).toBe(1);
    expect(winningResult.lastRound?.roundWarpCores).toBe(4);
    expect(reduceGameState(winningResult, { type: 'draw-module' })).toBe(winningResult);
    expect(reduceGameState(winningResult, { type: 'stop-and-bank' })).toBe(winningResult);
    expect(reduceGameState(winningResult, { type: 'buy-module', kind: 'flux-coil' })).toBe(winningResult);
    expect(reduceGameState(winningResult, { type: 'start-next-round' })).toBe(winningResult);
  });

  it('tracks warp cores as part of the live round state when drawing', () => {
    const warpCore = createTestModule('warp-core', 7);
    const state: GameState = {
      ...createInitialState('round-warp-state-seed'),
      bag: [warpCore],
    };

    const nextState = reduceGameState(state, { type: 'draw-module' });

    expect(nextState.roundWarpCores).toBe(1);
    expect(nextState.activePile).toEqual([warpCore]);
  });

  it('records warp core count on busted rounds and does not award a win', () => {
    const fourthWarpCore = createTestModule('warp-core', 8);
    const state: GameState = {
      ...createInitialState('bust-after-four-seed'),
      bag: [fourthWarpCore],
      instabilityThreshold: 8,
      roundWarpCores: 3,
      roundFlux: 3,
      roundInstability: 6,
      activePile: [
        createTestModule('warp-core', 1),
        createTestModule('warp-core', 2),
        createTestModule('warp-core', 3),
      ],
    };

    const nextState = reduceGameState(state, { type: 'draw-module' });

    expect(nextState.status).toBe('playing');
    expect(nextState.roundStatus).toBe('busted');
    expect(nextState.roundWarpCores).toBe(0);
    expect(nextState.lastRound?.roundWarpCores).toBe(4);
  });

  it('awards the win when auto-bank ends a round with four warp cores', () => {
    const fourthWarpCore = createTestModule('warp-core', 9);
    const state: GameState = {
      ...createInitialState('auto-bank-win-seed'),
      bag: [fourthWarpCore],
      slotCapacity: 4,
      instabilityThreshold: 9,
      roundWarpCores: 3,
      roundFlux: 3,
      roundInstability: 6,
      activePile: [
        createTestModule('warp-core', 1),
        createTestModule('warp-core', 2),
        createTestModule('warp-core', 3),
      ],
    };

    const nextState = reduceGameState(state, { type: 'draw-module' });

    expect(nextState.status).toBe('won');
    expect(nextState.roundStatus).toBe('stopped');
    expect(nextState.lastRound?.roundWarpCores).toBe(4);
    expect(nextState.score).toBe(1);
  });

  it('resets round warp core tracking when starting the next round and on a new run', () => {
    const state: GameState = {
      ...createInitialState('reset-round-warp-seed'),
      roundStatus: 'stopped',
      roundWarpCores: 0,
      lastRound: {
        number: 1,
        status: 'stopped',
        bankReason: 'manual',
        drawn: [createTestModule('warp-core', 1)],
        roundWarpCores: 1,
        roundFlux: 1,
        roundCredits: 0,
        roundInstability: 2,
      },
      discard: [createTestModule('warp-core', 1)],
      lastDiscarded: [createTestModule('warp-core', 1)],
    };

    const nextRoundState = reduceGameState(state, { type: 'start-next-round' });
    const newRunState = reduceGameState(nextRoundState, {
      type: 'new-run',
      seed: 'fresh-seed',
      mode: 'seeded',
      dailyDate: null,
    });

    expect(nextRoundState.roundWarpCores).toBe(0);
    expect(newRunState.roundWarpCores).toBe(0);
  });

  it('resets all run state when starting a new run', () => {
    const progressedState = applyActions(createInitialState('old-seed'), [
      { type: 'draw-module' },
      { type: 'draw-module' },
      { type: 'stop-and-bank' },
    ]);

    const newRunState = reduceGameState(progressedState, {
      type: 'new-run',
      seed: formatSeed('fresh-seed'),
      mode: 'seeded',
      dailyDate: null,
    });

    expect(newRunState.seed).toBe('game-1.2.0:mods-9:fresh-seed');
    expect(newRunState.mode).toBe('seeded');
    expect(newRunState.rounds).toBe(0);
    expect(newRunState.score).toBeNull();
    expect(newRunState.roundStatus).toBe('drawing');
    expect(newRunState.bankedFlux).toBe(0);
    expect(newRunState.bankedCredits).toBe(0);
    expect(newRunState.discard).toEqual([]);
    expect(newRunState.activePile).toEqual([]);
    expect(newRunState.lastRound).toBeNull();
    expect(newRunState.lastDiscarded).toEqual([]);
    expect(newRunState.lastResolvedEffect).toBeNull();
  });

  it('slot capacity upgrade costs increment by 1 per purchase', () => {
    const state: GameState = {
      ...createInitialState('slot-cost-seed'),
      roundStatus: 'stopped',
      bankedCredits: 20,
    };

    const after1 = reduceGameState(state, { type: 'buy-upgrade', kind: 'slot-capacity' });
    const after2 = reduceGameState(after1, { type: 'buy-upgrade', kind: 'slot-capacity' });

    expect(after1.nextSlotCapacityCost).toBe(6);
    expect(after2.nextSlotCapacityCost).toBe(7);
    expect(after2.slotCapacity).toBe(state.slotCapacity + 2);
  });

  it('instability threshold upgrade costs increment by 1 per purchase', () => {
    const state: GameState = {
      ...createInitialState('instab-cost-seed'),
      roundStatus: 'stopped',
      bankedCredits: 20,
    };

    const after1 = reduceGameState(state, { type: 'buy-upgrade', kind: 'instability-threshold' });
    const after2 = reduceGameState(after1, { type: 'buy-upgrade', kind: 'instability-threshold' });

    expect(after1.nextInstabilityCost).toBe(6);
    expect(after2.nextInstabilityCost).toBe(7);
    expect(after2.instabilityThreshold).toBe(state.instabilityThreshold + 2);
  });

  it('slot capacity upgrade is refused when at maximum', () => {
    const state: GameState = {
      ...createInitialState('slot-cap-seed'),
      roundStatus: 'stopped',
      bankedCredits: 999,
      slotCapacity: 12,
    };

    const result = reduceGameState(state, { type: 'buy-upgrade', kind: 'slot-capacity' });

    expect(result.slotCapacity).toBe(12);
    expect(result.bankedCredits).toBe(999);
    expect(result.log.at(-1)).toContain('maximum');
  });

  // ── Surge Tap ────────────────────────────────────────────────────────────────

  it('Surge Tap produces +1 flux per module already in active pile', () => {
    const surgeTap = createTestModule('surge-tap', 10);
    const fluxCoil1 = createTestModule('flux-coil', 1);
    const fluxCoil2 = createTestModule('flux-coil', 2);

    const state: GameState = {
      ...createInitialState('surge-tap-mid-seed'),
      bag: [surgeTap],
      activePile: [fluxCoil1, fluxCoil2],
      roundFlux: 4,
      roundInstability: 2,
      instabilityThreshold: 10,
    };

    const nextState = reduceGameState(state, { type: 'draw-module' });

    expect(nextState.roundFlux).toBe(6);
    expect(nextState.roundInstability).toBe(3);
    expect(nextState.lastResolvedEffect).toMatchObject({ genFlux: 2, genCredits: 0, addInstability: 1, isWarpCore: false });
  });

  it('Surge Tap produces +0 flux when drawn as first module', () => {
    const surgeTap = createTestModule('surge-tap', 10);

    const state: GameState = {
      ...createInitialState('surge-tap-first-seed'),
      bag: [surgeTap],
      activePile: [],
      roundFlux: 0,
      roundInstability: 0,
      instabilityThreshold: 10,
    };

    const nextState = reduceGameState(state, { type: 'draw-module' });

    expect(nextState.roundFlux).toBe(0);
    expect(nextState.roundInstability).toBe(1);
    expect(nextState.lastResolvedEffect).toMatchObject({ genFlux: 0 });
  });

  // ── Harmony Core ─────────────────────────────────────────────────────────────

  it('Harmony Core yields +2 credits per Stabilizer across all owned modules', () => {
    const harmonyCore = createTestModule('harmony-core', 10);
    const stab1 = createTestModule('stabilizer', 1);
    const stab2 = createTestModule('stabilizer', 2);
    const stab3 = createTestModule('stabilizer', 3);

    // harmonyCore alone in bag ensures it's the drawn module; 3 Stabilizers spread across discard+activePile
    const state: GameState = {
      ...createInitialState('harmony-core-seed'),
      bag: [harmonyCore],
      discard: [stab1, stab2],
      activePile: [stab3],
      roundCredits: 0,
      roundInstability: 0,
      instabilityThreshold: 10,
    };

    const nextState = reduceGameState(state, { type: 'draw-module' });

    expect(nextState.roundCredits).toBe(6);
    expect(nextState.roundInstability).toBe(0);
    expect(nextState.lastResolvedEffect).toMatchObject({ genFlux: 0, genCredits: 6, addInstability: 0, isWarpCore: false });
  });

  it('Harmony Core yields zero credits with no Stabilizers owned', () => {
    const harmonyCore = createTestModule('harmony-core', 10);
    const fluxCoil = createTestModule('flux-coil', 1);

    const state: GameState = {
      ...createInitialState('harmony-core-empty-seed'),
      bag: [harmonyCore],
      discard: [],
      activePile: [fluxCoil],
      roundCredits: 0,
      roundInstability: 0,
      instabilityThreshold: 10,
    };

    const nextState = reduceGameState(state, { type: 'draw-module' });

    expect(nextState.roundCredits).toBe(0);
    expect(nextState.lastResolvedEffect).toMatchObject({ genCredits: 0 });
  });

  // ── Redline Capacitor ─────────────────────────────────────────────────────────

  it('Redline Capacitor gives +5 flux when instability is within 2 of threshold', () => {
    const redline = createTestModule('redline-capacitor', 10);

    const state: GameState = {
      ...createInitialState('redline-near-seed'),
      bag: [redline],
      activePile: [],
      roundFlux: 0,
      roundInstability: 4,
      instabilityThreshold: 6,
    };

    const nextState = reduceGameState(state, { type: 'draw-module' });

    expect(nextState.roundFlux).toBe(5);
    expect(nextState.lastResolvedEffect).toMatchObject({ genFlux: 5, addInstability: 1 });
  });

  it('Redline Capacitor gives +1 flux when instability is far from threshold', () => {
    const redline = createTestModule('redline-capacitor', 10);

    const state: GameState = {
      ...createInitialState('redline-far-seed'),
      bag: [redline],
      activePile: [],
      roundFlux: 0,
      roundInstability: 1,
      instabilityThreshold: 10,
    };

    const nextState = reduceGameState(state, { type: 'draw-module' });

    expect(nextState.roundFlux).toBe(1);
    expect(nextState.lastResolvedEffect).toMatchObject({ genFlux: 1, addInstability: 1 });
  });

  it('Redline Capacitor checks instability before its own +1 is applied', () => {
    const redline = createTestModule('redline-capacitor', 10);

    // threshold 6, instability 3 — 3 < 6-2=4, so NOT within range despite +1 pushing to 4
    const state: GameState = {
      ...createInitialState('redline-boundary-seed'),
      bag: [redline],
      activePile: [],
      roundFlux: 0,
      roundInstability: 3,
      instabilityThreshold: 6,
    };

    const nextState = reduceGameState(state, { type: 'draw-module' });

    expect(nextState.roundFlux).toBe(1);
  });

  // ── Echo Module ──────────────────────────────────────────────────────────────

  it('Echo Module copies the resolved effect of the previously drawn module', () => {
    const fluxCoil = createTestModule('flux-coil', 1);
    const echoModule = createTestModule('echo-module', 2);
    const previousEffect: ResolvedEffect = { genFlux: 2, genCredits: 0, addInstability: 1, isWarpCore: false };

    const state: GameState = {
      ...createInitialState('echo-copy-seed'),
      bag: [echoModule],
      activePile: [fluxCoil],
      roundFlux: 2,
      roundCredits: 0,
      roundInstability: 1,
      instabilityThreshold: 10,
      lastResolvedEffect: previousEffect,
    };

    const nextState = reduceGameState(state, { type: 'draw-module' });

    expect(nextState.roundFlux).toBe(4);
    expect(nextState.roundCredits).toBe(0);
    expect(nextState.roundInstability).toBe(3);
    expect(nextState.lastResolvedEffect).toMatchObject({ genFlux: 2, genCredits: 0, addInstability: 2, isWarpCore: false });
  });

  it('Echo Module copies a Warp Core and increments roundWarpCores', () => {
    const warpCore = createTestModule('warp-core', 1);
    const echoModule = createTestModule('echo-module', 2);
    const previousEffect: ResolvedEffect = { genFlux: 1, genCredits: 0, addInstability: 2, isWarpCore: true };

    const state: GameState = {
      ...createInitialState('echo-warp-seed'),
      bag: [echoModule],
      activePile: [warpCore],
      roundWarpCores: 1,
      roundFlux: 1,
      roundInstability: 2,
      instabilityThreshold: 10,
      lastResolvedEffect: previousEffect,
    };

    const nextState = reduceGameState(state, { type: 'draw-module' });

    expect(nextState.roundWarpCores).toBe(2);
    expect(nextState.roundFlux).toBe(2);
    expect(nextState.roundInstability).toBe(5);
    expect(nextState.lastResolvedEffect).toMatchObject({ isWarpCore: true });
  });

  it('Echo Module as first draw adds only +1 instability and nothing else', () => {
    const echoModule = createTestModule('echo-module', 1);

    const state: GameState = {
      ...createInitialState('echo-first-seed'),
      bag: [echoModule],
      activePile: [],
      roundFlux: 0,
      roundCredits: 0,
      roundInstability: 0,
      instabilityThreshold: 10,
      lastResolvedEffect: null,
    };

    const nextState = reduceGameState(state, { type: 'draw-module' });

    expect(nextState.roundFlux).toBe(0);
    expect(nextState.roundCredits).toBe(0);
    expect(nextState.roundInstability).toBe(1);
    expect(nextState.roundWarpCores).toBe(0);
    expect(nextState.lastResolvedEffect).toMatchObject({ genFlux: 0, genCredits: 0, addInstability: 1, isWarpCore: false });
  });

  it('Echo Module copies resolved Surge Tap output (not re-evaluates it)', () => {
    const surgeTap = createTestModule('surge-tap', 1);
    const echoModule = createTestModule('echo-module', 2);
    const surgeTapEffect: ResolvedEffect = { genFlux: 3, genCredits: 0, addInstability: 1, isWarpCore: false };

    const state: GameState = {
      ...createInitialState('echo-surge-seed'),
      bag: [echoModule],
      activePile: [surgeTap],
      roundFlux: 3,
      roundInstability: 1,
      instabilityThreshold: 10,
      lastResolvedEffect: surgeTapEffect,
    };

    const nextState = reduceGameState(state, { type: 'draw-module' });

    expect(nextState.roundFlux).toBe(6);
    expect(nextState.lastResolvedEffect).toMatchObject({ genFlux: 3 });
  });
});
