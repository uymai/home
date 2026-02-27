import { CoreKind, CoreModule, CreditUpgradeKind, FluxPurchaseKind, GameAction, GameState, RoundSnapshot } from './types';

const START_BANKED_FLUX = 0;
const START_BANKED_CREDITS = 0;
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

function createModule(kind: CoreKind, id: number): CoreModule {
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
    default:
      return {
        id: `module-${id}`,
        name: 'Flux Coil',
        kind: 'flux-coil',
        tier: 1,
        costFlux: 3,
        costCredits: 0,
        genFlux: 2,
        genCredits: 0,
        addInstability: 1,
      };
  }
}

function startingBag(): CoreModule[] {
  const kinds: CoreKind[] = ['flux-coil', 'flux-coil', 'sponsored-relay', 'stabilizer', 'volatile-lens'];
  return kinds.map((kind, index) => createModule(kind, index + 1));
}

function reshuffle(discard: CoreModule[], rngState: number): { bag: CoreModule[]; rngState: number } {
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

function drawModuleFromBag(bag: CoreModule[], rngState: number): { drawnModule: CoreModule; bag: CoreModule[]; rngState: number } {
  const random = nextRandom(rngState);
  const index = Math.floor(random.value * bag.length);
  const drawnModule = bag[index];
  const nextBag = [...bag.slice(0, index), ...bag.slice(index + 1)];
  return { drawnModule, bag: nextBag, rngState: random.nextState };
}

function countOwnedWarpCores(state: GameState): number {
  return [...state.bag, ...state.discard, ...state.activePile].reduce((sum, core) => sum + (core.isWarpCore ? 1 : 0), 0);
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
    score: state.rounds,
    log: [...state.log, `Warp protocol complete. Owned cores ${ownedWarpCores}/${state.warpCoreTarget}, progress ${state.warpProgress}/${state.warpProgressTarget}.`],
  };
}

function bustRound(state: GameState, extraLog: string): GameState {
  const nextRoundNumber = state.rounds + 1;
  const discarded = [...state.activePile];
  const roundResult: RoundSnapshot = {
    number: nextRoundNumber,
    status: 'busted',
    drawn: discarded,
    roundFlux: state.roundFlux,
    roundCredits: state.roundCredits,
    roundInstability: state.roundInstability,
  };
  return {
    ...state,
    rounds: nextRoundNumber,
    roundStatus: 'busted',
    discard: [...state.discard, ...discarded],
    activePile: [],
    lastDiscarded: discarded,
    lastRound: roundResult,
    roundFlux: 0,
    roundCredits: 0,
    roundInstability: 0,
    drawCount: 0,
    log: [...state.log, extraLog, `Round ${nextRoundNumber} busted. Unbanked rewards were lost.`],
  };
}

function drawModule(state: GameState): GameState {
  if (state.status !== 'playing' || state.roundStatus !== 'drawing') {
    return state;
  }
  if (state.drawCount >= state.drawLimit) {
    return {
      ...state,
      log: [...state.log, `Draw limit reached (${state.drawLimit}). Stop and bank.`],
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
  const roundFlux = state.roundFlux + draw.drawnModule.genFlux;
  const roundCredits = state.roundCredits + draw.drawnModule.genCredits;
  const roundInstability = state.roundInstability + draw.drawnModule.addInstability;

  const nextState: GameState = {
    ...state,
    bag: draw.bag,
    discard,
    rngState: draw.rngState,
    activePile,
    roundFlux,
    roundCredits,
    roundInstability,
    drawCount: state.drawCount + 1,
    log: [...log, `Drew ${draw.drawnModule.name}. Unbanked: ${roundFlux} flux, ${roundCredits} credits. Instability ${roundInstability}/${state.instabilityThreshold}.`],
  };

  if (nextState.activePile.length > nextState.slotCapacity) {
    return bustRound(nextState, 'Slot capacity exceeded.');
  }
  if (nextState.roundInstability >= nextState.instabilityThreshold) {
    return bustRound(nextState, 'Instability threshold exceeded.');
  }

  return nextState;
}

function stopAndBank(state: GameState): GameState {
  if (state.status !== 'playing' || state.roundStatus !== 'drawing') {
    return state;
  }
  const nextRoundNumber = state.rounds + 1;
  const discarded = [...state.activePile];
  const warpDrawn = discarded.reduce((sum, core) => sum + (core.isWarpCore ? 1 : 0), 0);
  const roundResult: RoundSnapshot = {
    number: nextRoundNumber,
    status: 'stopped',
    drawn: discarded,
    roundFlux: state.roundFlux,
    roundCredits: state.roundCredits,
    roundInstability: state.roundInstability,
  };

  const bankedState: GameState = {
    ...state,
    rounds: nextRoundNumber,
    roundStatus: 'stopped',
    bankedFlux: state.bankedFlux + state.roundFlux,
    bankedCredits: state.bankedCredits + state.roundCredits,
    warpProgress: state.warpProgress + warpDrawn,
    discard: [...state.discard, ...discarded],
    activePile: [],
    lastDiscarded: discarded,
    lastRound: roundResult,
    roundFlux: 0,
    roundCredits: 0,
    roundInstability: 0,
    drawCount: 0,
    log: [...state.log, `Banked round ${nextRoundNumber}: +${state.roundFlux} flux, +${state.roundCredits} credits.`],
  };

  return applyWinCheck(bankedState);
}

function buyModule(state: GameState, kind: FluxPurchaseKind): GameState {
  if (state.status !== 'playing' || state.roundStatus === 'drawing') {
    return state;
  }
  const prototype = createModule(kind, state.nextModuleId);
  if (state.bankedFlux < prototype.costFlux || state.bankedCredits < prototype.costCredits) {
    return {
      ...state,
      log: [...state.log, `Not enough resources for ${prototype.name}.`],
    };
  }

  const purchasedModule = createModule(kind, state.nextModuleId);
  const nextState: GameState = {
    ...state,
    bankedFlux: state.bankedFlux - purchasedModule.costFlux,
    bankedCredits: state.bankedCredits - purchasedModule.costCredits,
    bag: [...state.bag, purchasedModule],
    nextModuleId: state.nextModuleId + 1,
    log: [...state.log, `Purchased ${purchasedModule.name} for ${purchasedModule.costFlux} flux and ${purchasedModule.costCredits} credits.`],
  };
  return applyWinCheck(nextState);
}

function buyUpgrade(state: GameState, kind: CreditUpgradeKind): GameState {
  if (state.status !== 'playing' || state.roundStatus === 'drawing') {
    return state;
  }
  if (kind === 'slot-capacity') {
    if (state.bankedCredits < state.nextSlotCapacityCost) {
      return { ...state, log: [...state.log, `Not enough credits for slot capacity upgrade (cost ${state.nextSlotCapacityCost}).`] };
    }
    return {
      ...state,
      bankedCredits: state.bankedCredits - state.nextSlotCapacityCost,
      slotCapacity: state.slotCapacity + 1,
      nextSlotCapacityCost: state.nextSlotCapacityCost + 2,
      log: [...state.log, `Upgraded slot capacity to ${state.slotCapacity + 1}.`],
    };
  }
  if (kind === 'instability-threshold') {
    if (state.bankedCredits < state.nextInstabilityCost) {
      return { ...state, log: [...state.log, `Not enough credits for instability tolerance upgrade (cost ${state.nextInstabilityCost}).`] };
    }
    return {
      ...state,
      bankedCredits: state.bankedCredits - state.nextInstabilityCost,
      instabilityThreshold: state.instabilityThreshold + 1,
      nextInstabilityCost: state.nextInstabilityCost + 3,
      log: [...state.log, `Upgraded instability threshold to ${state.instabilityThreshold + 1}.`],
    };
  }

  if (state.bankedCredits < state.nextDrawLimitCost) {
    return { ...state, log: [...state.log, `Not enough credits for draw limit upgrade (cost ${state.nextDrawLimitCost}).`] };
  }
  return {
    ...state,
    bankedCredits: state.bankedCredits - state.nextDrawLimitCost,
    drawLimit: state.drawLimit + 1,
    nextDrawLimitCost: state.nextDrawLimitCost + 2,
    log: [...state.log, `Upgraded draw limit to ${state.drawLimit + 1}.`],
  };
}

function startNextRound(state: GameState): GameState {
  if (state.status !== 'playing' || state.roundStatus === 'drawing') {
    return state;
  }

  const recycled = state.discard;
  return {
    ...state,
    bag: [...state.bag, ...recycled],
    discard: [],
    roundStatus: 'drawing',
    log: [...state.log, `Starting round ${state.rounds + 1}. Recycled ${recycled.length} modules back into bag.`],
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
    rounds: 0,
    score: null,
    roundStatus: 'drawing',
    bankedFlux: START_BANKED_FLUX,
    bankedCredits: START_BANKED_CREDITS,
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
    lastDiscarded: [],
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
