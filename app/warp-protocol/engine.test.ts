import { describe, expect, it } from 'vitest';
import { createInitialState, generateDailySeed, reduceGameState } from './engine';
import { CoreKind, CoreModule, GameAction, GameState } from './types';

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

  it('derives daily mode metadata from explicit and implicit daily seeds', () => {
    const explicit = createInitialState(generateDailySeed('2026-03-01'), {
      mode: 'daily',
      dailyDate: '2026-03-01',
    });
    const implicit = createInitialState('daily-2026-03-02', {
      mode: 'daily',
    });

    expect(explicit.dailyDate).toBe('2026-03-01');
    expect(explicit.seed).toBe('daily-2026-03-01');
    expect(implicit.dailyDate).toBe('2026-03-02');
  });

  it('produces identical state transitions for identical seeded runs', () => {
    const actions: GameAction[] = [{ type: 'draw-module' }, { type: 'draw-module' }, { type: 'stop-and-bank' }];
    const firstRun = applyActions(createInitialState('deterministic-seed'), actions);
    const secondRun = applyActions(createInitialState('deterministic-seed'), actions);

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

  it('draws modules into the active pile and updates unbanked resources', () => {
    const state = createInitialState('draw-seed');
    const nextState = reduceGameState(state, { type: 'draw-module' });
    const drawnModule = nextState.activePile[0];

    expect(drawnModule).toBeDefined();
    expect(nextState.bag).toHaveLength(4);
    expect(nextState.activePile).toHaveLength(1);
    expect(nextState.roundFlux).toBe(drawnModule.genFlux);
    expect(nextState.roundCredits).toBe(drawnModule.genCredits);
    expect(nextState.roundInstability).toBe(drawnModule.addInstability);
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
    expect(nextState.roundFlux).toBe(0);
    expect(nextState.roundCredits).toBe(0);
    expect(nextState.roundInstability).toBe(0);
    expect(nextState.activePile).toEqual([]);
    expect(nextState.discard).toEqual(drawnModules);
    expect(nextState.lastDiscarded).toEqual(drawnModules);
    expect(nextState.lastRound).toMatchObject({
      number: 1,
      status: 'stopped',
      bankReason: 'manual',
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
    expect(nextState.roundFlux).toBe(0);
    expect(nextState.roundCredits).toBe(0);
    expect(nextState.roundInstability).toBe(0);
    expect(nextState.activePile).toEqual([]);
    expect(nextState.discard).toEqual([volatileLens]);
    expect(nextState.lastRound).toMatchObject({
      status: 'busted',
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

    expect(slotUpgradeState.bankedCredits).toBe(6);
    expect(slotUpgradeState.slotCapacity).toBe(5);
    expect(slotUpgradeState.nextSlotCapacityCost).toBe(6);

    expect(thresholdUpgradeState.bankedCredits).toBe(1);
    expect(thresholdUpgradeState.instabilityThreshold).toBe(slotUpgradeState.instabilityThreshold + 1);
    expect(thresholdUpgradeState.nextInstabilityCost).toBe(8);
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
    expect(failedUpgradePurchase.log.at(-1)).toBe('Not enough credits for slot capacity upgrade (cost 4).');
  });

  it('wins only when enough warp cores are banked in the same round and blocks further play', () => {
    const losingRoundState: GameState = {
      ...createInitialState('lose-seed'),
      activePile: [createTestModule('warp-core', 1), createTestModule('warp-core', 2), createTestModule('warp-core', 3)],
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
    expect(reduceGameState(winningResult, { type: 'draw-module' })).toBe(winningResult);
  });

  it('resets all run state when starting a new run', () => {
    const progressedState = applyActions(createInitialState('old-seed'), [
      { type: 'draw-module' },
      { type: 'draw-module' },
      { type: 'stop-and-bank' },
    ]);

    const newRunState = reduceGameState(progressedState, {
      type: 'new-run',
      seed: 'fresh-seed',
      mode: 'seeded',
      dailyDate: null,
    });

    expect(newRunState.seed).toBe('fresh-seed');
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
  });
});
