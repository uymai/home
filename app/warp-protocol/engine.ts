import {
  CreditUpgradeKind,
  FluxPurchaseKind,
  GameAction,
  GameState,
  ModuleCard,
  ModuleKind,
  RoundSnapshot,
} from './types';

const START_FLUX = 0;
const START_CREDITS = 0;
const START_DRAW_LIMIT = 4;
const START_SLOT_CAPACITY = 4;
const START_INSTABILITY_THRESHOLD = 4;
const START_DRAW_LIMIT_COST = 4;
const START_SLOT_CAPACITY_COST = 4;
const START_INSTABILITY_COST = 5;
const WARP_PROGRESS_TARGET = 8;
const WARP_CORE_TARGET = 4;

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function nextRandom(state: number): { value: number; nextState: number } {
  const nextState = (state + 0x6d2b79f5) >>> 0;
  let t = nextState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, nextState };
}

function createModule(kind: ModuleKind, id: number): ModuleCard {
  switch (kind) {
    case 'flux-coil':
      return { id: `module-${id}`, kind, fluxValue: 2, creditValue: 0, instabilityValue: 1, isWarpCore: false, tier: 1 };
    case 'sponsored-relay':
      return {
        id: `module-${id}`,
        kind,
        fluxValue: 1,
        creditValue: 2,
        instabilityValue: 1,
        isWarpCore: false,
        tier: 1,
        sponsored: true,
      };
    case 'stabilizer':
      return { id: `module-${id}`, kind, fluxValue: 0, creditValue: 0, instabilityValue: -1, isWarpCore: false, tier: 1 };
    case 'volatile-lens':
      return { id: `module-${id}`, kind, fluxValue: 4, creditValue: 0, instabilityValue: 2, isWarpCore: false, tier: 2 };
    case 'warp-core':
      return { id: `module-${id}`, kind, fluxValue: 1, creditValue: 0, instabilityValue: 2, isWarpCore: true, tier: 3 };
    default:
      return { id: `module-${id}`, kind: 'flux-coil', fluxValue: 2, creditValue: 0, instabilityValue: 1, isWarpCore: false, tier: 1 };
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

function startingBag(): ModuleCard[] {
  const kinds: ModuleKind[] = ['flux-coil', 'flux-coil', 'sponsored-relay', 'stabilizer', 'volatile-lens'];
  return kinds.map((kind, index) => createModule(kind, index + 1));
}

function reshuffle(discard: ModuleCard[], rngState: number): { bag: ModuleCard[]; rngState: number } {
  const bag = [...discard];
  let nextState = rngState;
  for (let i = bag.length - 1; i > 0; i -= 1) {
    const random = nextRandom(nextState);
    nextState = random.nextState;
    const j = Math.floor(random.value * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return { bag, rngState: nextState };
}

function drawModuleFromBag(bag: ModuleCard[], rngState: number): { drawnModule: ModuleCard; bag: ModuleCard[]; rngState: number } {
  const random = nextRandom(rngState);
  const index = Math.floor(random.value * bag.length);
  const drawnModule = bag[index];
  const nextBag = [...bag.slice(0, index), ...bag.slice(index + 1)];
  return { drawnModule, bag: nextBag, rngState: random.nextState };
}

function countOwnedWarpCores(state: GameState): number {
  const allModules = [...state.bag, ...state.discard, ...state.activePile];
  return allModules.reduce((sum, module) => sum + (module.isWarpCore ? 1 : 0), 0);
}

function applyWinCheck(state: GameState): GameState {
  const ownedWarpCores = countOwnedWarpCores(state);
  const won = ownedWarpCores >= state.warpCoreTarget || state.warpProgress >= state.warpProgressTarget;
  if (!won) {
    return state;
  }
  return {
    ...state,
    status: 'won',
    phase: 'ended',
    score: state.rounds,
    log: [...state.log, `Warp protocol complete. Owned cores ${ownedWarpCores}/${state.warpCoreTarget}, progress ${state.warpProgress}/${state.warpProgressTarget}.`],
  };
}

function meltdown(state: GameState, reason: RoundSnapshot['reason']): GameState {
  const roundNumber = state.rounds + 1;
  const roundResult: RoundSnapshot = {
    number: roundNumber,
    exploded: true,
    drawn: [...state.activePile],
    roundFlux: state.roundFlux,
    roundCredits: state.roundCredits,
    roundInstability: state.roundInstability,
    reason,
  };
  const reasonLabel = reason === 'capacity' ? 'slot capacity overload' : 'instability threshold breached';
  return {
    ...state,
    status: 'lost',
    phase: 'ended',
    score: null,
    lastRound: roundResult,
    log: [
      ...state.log,
      `Round ${roundNumber} meltdown: ${reasonLabel}. Lost unbanked rewards (${state.roundFlux} flux, ${state.roundCredits} credits).`,
    ],
  };
}

function drawModule(state: GameState): GameState {
  if (state.status !== 'playing' || state.phase !== 'draw') {
    return state;
  }
  if (state.drawCount >= state.drawLimit) {
    return {
      ...state,
      log: [...state.log, `Draw limit reached (${state.drawLimit}). Stop and bank to continue.`],
    };
  }

  let bag = [...state.bag];
  let discard = [...state.discard];
  let rngState = state.rngState;
  const log = [...state.log];

  if (bag.length === 0 && discard.length > 0) {
    const shuffled = reshuffle(discard, rngState);
    bag = shuffled.bag;
    discard = [];
    rngState = shuffled.rngState;
    log.push('Reshuffled discard into bag.');
  }

  if (bag.length === 0) {
    return {
      ...state,
      log: [...log, 'No modules available to draw.'],
    };
  }

  const draw = drawModuleFromBag(bag, rngState);
  const activePile = [...state.activePile, draw.drawnModule];
  const roundFlux = state.roundFlux + draw.drawnModule.fluxValue;
  const roundCredits = state.roundCredits + draw.drawnModule.creditValue;
  const roundInstability = state.roundInstability + draw.drawnModule.instabilityValue;
  const drawCount = state.drawCount + 1;

  const nextState: GameState = {
    ...state,
    bag: draw.bag,
    discard,
    rngState: draw.rngState,
    activePile,
    roundFlux,
    roundCredits,
    roundInstability,
    drawCount,
    log: [...log, `Drew ${draw.drawnModule.kind}. Round totals: ${roundFlux} flux, ${roundCredits} credits, instability ${roundInstability}/${state.instabilityThreshold}.`],
  };

  if (nextState.activePile.length > nextState.slotCapacity) {
    return meltdown(nextState, 'capacity');
  }
  if (nextState.roundInstability >= nextState.instabilityThreshold) {
    return meltdown(nextState, 'instability');
  }

  return nextState;
}

function stopAndBank(state: GameState): GameState {
  if (state.status !== 'playing' || state.phase !== 'draw') {
    return state;
  }

  const roundNumber = state.rounds + 1;
  const warpDrawn = state.activePile.reduce((sum, module) => sum + (module.isWarpCore ? 1 : 0), 0);
  const roundResult: RoundSnapshot = {
    number: roundNumber,
    exploded: false,
    drawn: [...state.activePile],
    roundFlux: state.roundFlux,
    roundCredits: state.roundCredits,
    roundInstability: state.roundInstability,
    reason: 'banked',
  };

  const bankedState: GameState = {
    ...state,
    rounds: roundNumber,
    flux: state.flux + state.roundFlux,
    credits: state.credits + state.roundCredits,
    warpProgress: state.warpProgress + warpDrawn,
    discard: [...state.discard, ...state.activePile],
    activePile: [],
    roundFlux: 0,
    roundCredits: 0,
    roundInstability: 0,
    drawCount: 0,
    phase: 'buy',
    lastRound: roundResult,
    log: [
      ...state.log,
      `Banked round ${roundNumber}: +${state.roundFlux} flux, +${state.roundCredits} credits, warp progress +${warpDrawn}.`,
    ],
  };

  return applyWinCheck(bankedState);
}

function buyModule(state: GameState, kind: FluxPurchaseKind): GameState {
  if (state.status !== 'playing' || state.phase !== 'buy') {
    return state;
  }
  const cost = moduleFluxCost(kind);
  if (state.flux < cost) {
    return {
      ...state,
      log: [...state.log, `Not enough flux for ${kind} (cost ${cost}).`],
    };
  }

  const purchasedModule = createModule(kind, state.nextModuleId);
  const nextState: GameState = {
    ...state,
    flux: state.flux - cost,
    bag: [...state.bag, purchasedModule],
    nextModuleId: state.nextModuleId + 1,
    log: [...state.log, `Purchased ${kind} for ${cost} flux.`],
  };
  return applyWinCheck(nextState);
}

function buyUpgrade(state: GameState, kind: CreditUpgradeKind): GameState {
  if (state.status !== 'playing' || state.phase !== 'buy') {
    return state;
  }

  if (kind === 'slot-capacity') {
    if (state.credits < state.nextSlotCapacityCost) {
      return {
        ...state,
        log: [...state.log, `Not enough credits for slot capacity upgrade (cost ${state.nextSlotCapacityCost}).`],
      };
    }
    return {
      ...state,
      credits: state.credits - state.nextSlotCapacityCost,
      slotCapacity: state.slotCapacity + 1,
      nextSlotCapacityCost: state.nextSlotCapacityCost + 2,
      log: [...state.log, `Upgraded slot capacity to ${state.slotCapacity + 1}.`],
    };
  }

  if (kind === 'instability-threshold') {
    if (state.credits < state.nextInstabilityCost) {
      return {
        ...state,
        log: [...state.log, `Not enough credits for instability tolerance upgrade (cost ${state.nextInstabilityCost}).`],
      };
    }
    return {
      ...state,
      credits: state.credits - state.nextInstabilityCost,
      instabilityThreshold: state.instabilityThreshold + 1,
      nextInstabilityCost: state.nextInstabilityCost + 3,
      log: [...state.log, `Upgraded instability threshold to ${state.instabilityThreshold + 1}.`],
    };
  }

  if (state.credits < state.nextDrawLimitCost) {
    return {
      ...state,
      log: [...state.log, `Not enough credits for draw limit upgrade (cost ${state.nextDrawLimitCost}).`],
    };
  }
  return {
    ...state,
    credits: state.credits - state.nextDrawLimitCost,
    drawLimit: state.drawLimit + 1,
    nextDrawLimitCost: state.nextDrawLimitCost + 2,
    log: [...state.log, `Upgraded draw limit to ${state.drawLimit + 1}.`],
  };
}

function startNextRound(state: GameState): GameState {
  if (state.status !== 'playing' || state.phase !== 'buy') {
    return state;
  }
  return {
    ...state,
    phase: 'draw',
    log: [...state.log, `Starting round ${state.rounds + 1}.`],
  };
}

function seedInstabilityModifier(seedHash: number): { delta: number; label: string } {
  const mod = seedHash % 3;
  if (mod === 0) {
    return { delta: -1, label: 'Seed modifier: volatile reactor (-1 instability threshold).' };
  }
  if (mod === 1) {
    return { delta: 0, label: 'Seed modifier: neutral reactor (no instability modifier).' };
  }
  return { delta: 1, label: 'Seed modifier: reinforced reactor (+1 instability threshold).' };
}

export function createInitialState(seed: string): GameState {
  const bag = startingBag();
  const seedHash = hashSeed(seed);
  const modifier = seedInstabilityModifier(seedHash);
  const instabilityThreshold = Math.max(2, START_INSTABILITY_THRESHOLD + modifier.delta);

  return {
    seed,
    status: 'playing',
    phase: 'draw',
    rounds: 0,
    score: null,
    flux: START_FLUX,
    credits: START_CREDITS,
    roundFlux: 0,
    roundCredits: 0,
    roundInstability: 0,
    drawCount: 0,
    drawLimit: START_DRAW_LIMIT,
    slotCapacity: START_SLOT_CAPACITY,
    instabilityThreshold,
    nextDrawLimitCost: START_DRAW_LIMIT_COST,
    nextSlotCapacityCost: START_SLOT_CAPACITY_COST,
    nextInstabilityCost: START_INSTABILITY_COST,
    warpProgress: 0,
    warpProgressTarget: WARP_PROGRESS_TARGET,
    warpCoreTarget: WARP_CORE_TARGET,
    bag,
    discard: [],
    activePile: [],
    rngState: seedHash,
    nextModuleId: bag.length + 1,
    lastRound: null,
    seedModifier: modifier.label,
    log: [`Run initialized with seed "${seed}".`, modifier.label],
  };
}

export function reduceGameState(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'draw-module':
      return drawModule(state);
    case 'stop-and-bank':
      return stopAndBank(state);
    case 'buy-module':
      return buyModule(state, action.kind);
    case 'buy-upgrade':
      return buyUpgrade(state, action.kind);
    case 'start-next-round':
      return startNextRound(state);
    case 'new-run':
      return createInitialState(action.seed);
    default:
      return state;
  }
}

export function generateSeed(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const seedChars: string[] = [];
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < bytes.length; i += 1) {
    seedChars.push(alphabet[bytes[i] % alphabet.length]);
  }
  return seedChars.join('');
}
