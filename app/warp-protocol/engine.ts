import {
  CoreKind,
  CoreModule,
  CreditUpgradeKind,
  FluxPurchaseKind,
  GameAction,
  GameMode,
  GameState,
  GameVersion,
  ResolvedEffect,
  RoundSnapshot,
} from './types';

const START_BANKED_FLUX = 0;
const START_BANKED_CREDITS = 0;
const START_SLOT_CAPACITY = 4;
const MAX_SLOT_CAPACITY = 12;
const START_INSTABILITY_THRESHOLD = 4;
const START_SLOT_CAPACITY_COST = 5;
const START_INSTABILITY_COST = 5;
const WARP_CORE_TARGET = 4;
const LEGACY_GAME_VERSION: GameVersion = '1.0.0';
const CURRENT_GAME_VERSION: GameVersion = '1.2.0';
const LEGACY_AVAILABLE_MODULE_COUNT = 5;
const CURRENT_AVAILABLE_MODULE_COUNT = 9;

type ParsedSeed = {
  originalSeed: string;
  payload: string;
  gameVersion: GameVersion;
  availableModuleCount: number;
  dailyDate: string | null;
};

type CatalogConfig = {
  startingBag: CoreKind[];
  shopPool: FluxPurchaseKind[];
  alwaysAvailable: FluxPurchaseKind[];
  defaultAvailableModuleCount: number;
};

type DrawContext = {
  activePile: CoreModule[];
  ownedModules: CoreModule[];
  roundInstability: number;
  instabilityThreshold: number;
  lastResolvedEffect: ResolvedEffect | null;
};

const MODULE_BLUEPRINTS: Record<CoreKind, Omit<CoreModule, 'id'>> = {
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
  'credit-spike': {
    name: 'Credit Spike',
    kind: 'credit-spike',
    tier: 1,
    costFlux: 4,
    costCredits: 0,
    genFlux: 0,
    genCredits: 3,
    addInstability: 1,
  },
  'phase-anchor': {
    name: 'Phase Anchor',
    kind: 'phase-anchor',
    tier: 2,
    costFlux: 6,
    costCredits: 0,
    genFlux: 2,
    genCredits: 0,
    addInstability: -2,
  },
  'overclock-array': {
    name: 'Overclock Array',
    kind: 'overclock-array',
    tier: 2,
    costFlux: 8,
    costCredits: 0,
    genFlux: 5,
    genCredits: 1,
    addInstability: 3,
  },
  'surge-tap': {
    name: 'Surge Tap',
    kind: 'surge-tap',
    tier: 2,
    costFlux: 5,
    costCredits: 0,
    genFlux: 0,
    genCredits: 0,
    addInstability: 1,
    effectDescription: '+1 flux per module already installed this round | +0 credits | instability +1',
  },
  'harmony-core': {
    name: 'Harmony Core',
    kind: 'harmony-core',
    tier: 2,
    costFlux: 6,
    costCredits: 0,
    genFlux: 0,
    genCredits: 0,
    addInstability: 0,
    effectDescription: '+0 flux | +2 credits per Stabilizer owned | instability +0',
  },
  'redline-capacitor': {
    name: 'Redline Capacitor',
    kind: 'redline-capacitor',
    tier: 2,
    costFlux: 6,
    costCredits: 0,
    genFlux: 1,
    genCredits: 0,
    addInstability: 1,
    effectDescription: '+5 flux if within 2 of instability threshold, else +1 flux | +0 credits | instability +1',
  },
  'echo-module': {
    name: 'Echo Module',
    kind: 'echo-module',
    tier: 3,
    costFlux: 8,
    costCredits: 0,
    genFlux: 0,
    genCredits: 0,
    addInstability: 1,
    effectDescription: 'Copies the effect of the previously drawn module (+1 instability on top)',
  },
};

const EFFECT_RESOLVERS: Partial<Record<CoreKind, (ctx: DrawContext) => ResolvedEffect>> = {
  'surge-tap': (ctx) => ({
    genFlux: ctx.activePile.length,
    genCredits: 0,
    addInstability: 1,
    isWarpCore: false,
  }),
  'harmony-core': (ctx) => ({
    genFlux: 0,
    genCredits: ctx.ownedModules.filter((m) => m.kind === 'stabilizer').length * 2,
    addInstability: 0,
    isWarpCore: false,
  }),
  'redline-capacitor': (ctx) => ({
    genFlux: ctx.roundInstability >= ctx.instabilityThreshold - 2 ? 5 : 1,
    genCredits: 0,
    addInstability: 1,
    isWarpCore: false,
  }),
  'echo-module': (ctx) => ({
    genFlux: ctx.lastResolvedEffect?.genFlux ?? 0,
    genCredits: ctx.lastResolvedEffect?.genCredits ?? 0,
    addInstability: (ctx.lastResolvedEffect?.addInstability ?? 0) + 1,
    isWarpCore: ctx.lastResolvedEffect?.isWarpCore ?? false,
  }),
};

const CATALOGS: Record<GameVersion, CatalogConfig> = {
  '1.0.0': {
    startingBag: ['flux-coil', 'flux-coil', 'sponsored-relay', 'stabilizer', 'volatile-lens'],
    shopPool: ['flux-coil', 'sponsored-relay', 'stabilizer', 'volatile-lens', 'warp-core'],
    alwaysAvailable: ['warp-core'],
    defaultAvailableModuleCount: LEGACY_AVAILABLE_MODULE_COUNT,
  },
  '1.1.0': {
    startingBag: ['flux-coil', 'flux-coil', 'sponsored-relay', 'stabilizer', 'volatile-lens'],
    shopPool: [
      'flux-coil',
      'sponsored-relay',
      'stabilizer',
      'volatile-lens',
      'warp-core',
      'credit-spike',
      'phase-anchor',
      'overclock-array',
    ],
    alwaysAvailable: ['warp-core'],
    defaultAvailableModuleCount: LEGACY_AVAILABLE_MODULE_COUNT,
  },
  '1.2.0': {
    startingBag: ['flux-coil', 'flux-coil', 'sponsored-relay', 'stabilizer'],
    shopPool: [
      'flux-coil',
      'sponsored-relay',
      'stabilizer',
      'volatile-lens',
      'surge-tap',
      'harmony-core',
      'redline-capacitor',
      'echo-module',
      'warp-core',
    ],
    alwaysAvailable: ['warp-core'],
    defaultAvailableModuleCount: CURRENT_AVAILABLE_MODULE_COUNT,
  },
};

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function parseSeed(seed: string): ParsedSeed {
  const trimmedSeed = seed.trim();
  const versionedMatch = /^game-([0-9]+\.[0-9]+\.[0-9]+):mods-([0-9]+):(.+)$/.exec(trimmedSeed);

  if (versionedMatch) {
    const [, gameVersionValue, availableModuleCountValue, payload] = versionedMatch;
    const gameVersion = gameVersionValue in CATALOGS ? (gameVersionValue as GameVersion) : CURRENT_GAME_VERSION;
    const catalog = CATALOGS[gameVersion];
    const parsedCount = Number.parseInt(availableModuleCountValue, 10);
    const availableModuleCount = Number.isFinite(parsedCount)
      ? Math.max(catalog.alwaysAvailable.length, Math.min(parsedCount, catalog.shopPool.length))
      : catalog.defaultAvailableModuleCount;
    const dailyDate = payload.startsWith('daily-') ? payload.slice('daily-'.length) : null;

    return {
      originalSeed: trimmedSeed,
      payload,
      gameVersion,
      availableModuleCount,
      dailyDate,
    };
  }

  const priorVersionedMatch = /^v\d+:([a-z0-9-]+):(.+)$/.exec(trimmedSeed);
  if (priorVersionedMatch) {
    const [, , payload] = priorVersionedMatch;
    const dailyDate = payload.startsWith('daily-') ? payload.slice('daily-'.length) : null;
    return {
      originalSeed: trimmedSeed,
      payload,
      gameVersion: LEGACY_GAME_VERSION,
      availableModuleCount: LEGACY_AVAILABLE_MODULE_COUNT,
      dailyDate,
    };
  }

  const dailyDate = trimmedSeed.startsWith('daily-') ? trimmedSeed.slice('daily-'.length) : null;
  return {
    originalSeed: trimmedSeed,
    payload: trimmedSeed,
    gameVersion: LEGACY_GAME_VERSION,
    availableModuleCount: LEGACY_AVAILABLE_MODULE_COUNT,
    dailyDate,
  };
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
  const blueprint = MODULE_BLUEPRINTS[kind] ?? MODULE_BLUEPRINTS['flux-coil'];
  return {
    id: `module-${id}`,
    ...blueprint,
  };
}

function getCatalog(gameVersion: GameVersion): CatalogConfig {
  return CATALOGS[gameVersion] ?? CATALOGS[CURRENT_GAME_VERSION];
}

function startingBag(gameVersion: GameVersion): CoreModule[] {
  const kinds = getCatalog(gameVersion).startingBag;
  return kinds.map((kind, index) => createModule(kind, index + 1));
}

function randomIndex(max: number, rngState: number): { index: number; nextState: number } {
  const random = nextRandom(rngState);
  return {
    index: Math.floor(random.value * max),
    nextState: random.nextState,
  };
}

function selectAvailableModules(gameVersion: GameVersion, availableModuleCount: number, seed: string): FluxPurchaseKind[] {
  const catalog = getCatalog(gameVersion);
  const alwaysAvailable = [...catalog.alwaysAvailable];
  const optionalPool = catalog.shopPool.filter((kind) => !alwaysAvailable.includes(kind));
  const targetOptionalCount = Math.max(0, Math.min(availableModuleCount - alwaysAvailable.length, optionalPool.length));
  const pool = [...optionalPool];
  const selected: FluxPurchaseKind[] = [];
  let rngState = hashSeed(`${seed}:available-modules`);

  while (selected.length < targetOptionalCount && pool.length > 0) {
    const next = randomIndex(pool.length, rngState);
    rngState = next.nextState;
    const [picked] = pool.splice(next.index, 1);
    selected.push(picked);
  }

  return [...alwaysAvailable, ...selected].sort((left, right) => {
    const leftModule = MODULE_BLUEPRINTS[left];
    const rightModule = MODULE_BLUEPRINTS[right];
    return leftModule.tier - rightModule.tier || leftModule.name.localeCompare(rightModule.name);
  });
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

function resolveModuleEffect(drawnModule: CoreModule, ctx: DrawContext): ResolvedEffect {
  const resolver = EFFECT_RESOLVERS[drawnModule.kind];
  if (resolver) {
    return resolver(ctx);
  }
  return {
    genFlux: drawnModule.genFlux,
    genCredits: drawnModule.genCredits,
    addInstability: drawnModule.addInstability,
    isWarpCore: drawnModule.isWarpCore ?? false,
  };
}

function applyRoundWinCheck(state: GameState, roundWarpCores: number, roundNumber: number): GameState {
  if (roundWarpCores < state.warpCoreTarget) {
    return state;
  }
  return {
    ...state,
    status: 'won',
    score: roundNumber,
    log: [...state.log, `Warp protocol complete. Won in round ${roundNumber} by drawing ${roundWarpCores} warp cores without busting.`],
  };
}

function bankRound(state: GameState, bankReason: 'manual' | 'auto-capacity'): GameState {
  const nextRoundNumber = state.rounds + 1;
  const discarded = [...state.activePile];
  const roundResult: RoundSnapshot = {
    number: nextRoundNumber,
    status: 'stopped',
    bankReason,
    drawn: discarded,
    roundWarpCores: state.roundWarpCores,
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
    discard: [...state.discard, ...discarded],
    activePile: [],
    lastDiscarded: discarded,
    lastRound: roundResult,
    lastResolvedEffect: null,
    roundWarpCores: 0,
    roundFlux: 0,
    roundCredits: 0,
    roundInstability: 0,
    log: [
      ...state.log,
      bankReason === 'auto-capacity'
        ? `Round ${nextRoundNumber} auto-banked on slot capacity: +${state.roundFlux} flux, +${state.roundCredits} credits.`
        : `Banked round ${nextRoundNumber}: +${state.roundFlux} flux, +${state.roundCredits} credits.`,
    ],
  };

  return applyRoundWinCheck(bankedState, state.roundWarpCores, nextRoundNumber);
}

function bustRound(state: GameState, extraLog: string, volatilityExceeded: boolean): GameState {
  const nextRoundNumber = state.rounds + 1;
  const discarded = [...state.activePile];
  const roundResult: RoundSnapshot = {
    number: nextRoundNumber,
    status: 'busted',
    drawn: discarded,
    roundWarpCores: state.roundWarpCores,
    roundFlux: state.roundFlux,
    roundCredits: state.roundCredits,
    roundInstability: state.roundInstability,
  };
  return {
    ...state,
    rounds: nextRoundNumber,
    roundStatus: 'busted',
    volatilityExceededCount: state.volatilityExceededCount + (volatilityExceeded ? 1 : 0),
    discard: [...state.discard, ...discarded],
    activePile: [],
    lastDiscarded: discarded,
    lastRound: roundResult,
    lastResolvedEffect: null,
    roundWarpCores: 0,
    roundFlux: 0,
    roundCredits: 0,
    roundInstability: 0,
    log: [...state.log, extraLog, `Round ${nextRoundNumber} busted. Unbanked rewards were lost.`],
  };
}

function drawModule(state: GameState): GameState {
  if (state.status !== 'playing' || state.roundStatus !== 'drawing') {
    return state;
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
  const ownedModules = [...draw.bag, ...discard, ...activePile];

  const ctx: DrawContext = {
    activePile: state.activePile,
    ownedModules,
    roundInstability: state.roundInstability,
    instabilityThreshold: state.instabilityThreshold,
    lastResolvedEffect: state.lastResolvedEffect,
  };

  const effect = resolveModuleEffect(draw.drawnModule, ctx);

  const roundWarpCores = state.roundWarpCores + (effect.isWarpCore ? 1 : 0);
  const roundFlux = state.roundFlux + effect.genFlux;
  const roundCredits = state.roundCredits + effect.genCredits;
  const roundInstability = state.roundInstability + effect.addInstability;
  const nextLog = [...log, `Drew ${draw.drawnModule.name}. Unbanked: ${roundFlux} flux, ${roundCredits} credits. Instability ${roundInstability}/${state.instabilityThreshold}.`];

  if (roundWarpCores === state.warpCoreTarget) {
    nextLog.push(`Round target reached: ${roundWarpCores} warp cores drawn this round. Bank or auto-bank this round without busting to win.`);
  }

  const nextState: GameState = {
    ...state,
    bag: draw.bag,
    discard,
    rngState: draw.rngState,
    activePile,
    roundWarpCores,
    roundFlux,
    roundCredits,
    roundInstability,
    lastResolvedEffect: effect,
    log: nextLog,
  };

  if (nextState.roundInstability >= nextState.instabilityThreshold) {
    return bustRound(nextState, 'Instability threshold exceeded.', true);
  }
  if (nextState.activePile.length === nextState.slotCapacity) {
    return bankRound(nextState, 'auto-capacity');
  }

  return nextState;
}

function stopAndBank(state: GameState): GameState {
  if (state.status !== 'playing' || state.roundStatus !== 'drawing') {
    return state;
  }
  return bankRound(state, 'manual');
}

function buyModule(state: GameState, kind: FluxPurchaseKind): GameState {
  if (state.status !== 'playing' || state.roundStatus === 'drawing') {
    return state;
  }
  if (!state.availableModuleKinds.includes(kind)) {
    return {
      ...state,
      log: [...state.log, `${MODULE_BLUEPRINTS[kind].name} is not available in this run.`],
    };
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
  return nextState;
}

function buyUpgrade(state: GameState, kind: CreditUpgradeKind): GameState {
  if (state.status !== 'playing' || state.roundStatus === 'drawing') {
    return state;
  }
  if (kind === 'slot-capacity') {
    if (state.slotCapacity >= MAX_SLOT_CAPACITY) {
      return { ...state, log: [...state.log, `Slot capacity is already at maximum (${MAX_SLOT_CAPACITY}).`] };
    }
    if (state.bankedCredits < state.nextSlotCapacityCost) {
      return { ...state, log: [...state.log, `Not enough credits for slot capacity upgrade (cost ${state.nextSlotCapacityCost}).`] };
    }
    return {
      ...state,
      bankedCredits: state.bankedCredits - state.nextSlotCapacityCost,
      slotCapacity: state.slotCapacity + 1,
      nextSlotCapacityCost: state.nextSlotCapacityCost + 1,
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
      nextInstabilityCost: state.nextInstabilityCost + 1,
      log: [...state.log, `Upgraded instability threshold to ${state.instabilityThreshold + 1}.`],
    };
  }

  return state;
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
    lastResolvedEffect: null,
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

function dailySeedFromDate(dailyDate: string, options?: { gameVersion?: GameVersion; availableModuleCount?: number }): string {
  return formatSeed(`daily-${dailyDate}`, options);
}

export function formatSeed(payload: string, options?: { gameVersion?: GameVersion; availableModuleCount?: number }): string {
  const gameVersion = options?.gameVersion ?? CURRENT_GAME_VERSION;
  const catalog = getCatalog(gameVersion);
  const availableModuleCount = Math.max(
    catalog.alwaysAvailable.length,
    Math.min(options?.availableModuleCount ?? catalog.defaultAvailableModuleCount, catalog.shopPool.length),
  );
  return `game-${gameVersion}:mods-${availableModuleCount}:${payload}`;
}

export function createInitialState(seed: string, options?: { mode?: GameMode; dailyDate?: string | null }): GameState {
  const parsedSeed = parseSeed(seed);
  const bag = startingBag(parsedSeed.gameVersion);
  const availableModuleKinds = selectAvailableModules(
    parsedSeed.gameVersion,
    parsedSeed.availableModuleCount,
    parsedSeed.originalSeed,
  );
  const seedHash = hashSeed(parsedSeed.originalSeed);
  const modifier = seedInstabilityModifier(seedHash);
  const instabilityThreshold = Math.max(2, START_INSTABILITY_THRESHOLD + modifier.delta);
  const mode = options?.mode ?? 'random';
  const dailyDate = mode === 'daily' ? options?.dailyDate ?? parsedSeed.dailyDate : null;

  return {
    mode,
    seed: parsedSeed.originalSeed,
    gameVersion: parsedSeed.gameVersion,
    availableModuleCount: parsedSeed.availableModuleCount,
    availableModuleKinds,
    dailyDate,
    status: 'playing',
    rounds: 0,
    score: null,
    roundStatus: 'drawing',
    volatilityExceededCount: 0,
    bankedFlux: START_BANKED_FLUX,
    bankedCredits: START_BANKED_CREDITS,
    roundWarpCores: 0,
    roundFlux: 0,
    roundCredits: 0,
    roundInstability: 0,
    slotCapacity: START_SLOT_CAPACITY,
    instabilityThreshold,
    nextSlotCapacityCost: START_SLOT_CAPACITY_COST,
    nextInstabilityCost: START_INSTABILITY_COST,
    warpCoreTarget: WARP_CORE_TARGET,
    bag,
    discard: [],
    activePile: [],
    lastDiscarded: [],
    lastResolvedEffect: null,
    rngState: seedHash,
    nextModuleId: bag.length + 1,
    lastRound: null,
    seedModifier: modifier.label,
    log: [
      `Run initialized with seed "${parsedSeed.originalSeed}".`,
      `Game version ${parsedSeed.gameVersion} with ${parsedSeed.availableModuleCount} available modules.`,
      `Run modules: ${availableModuleKinds.map((kind) => MODULE_BLUEPRINTS[kind].name).join(', ')}.`,
      modifier.label,
    ],
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
      return createInitialState(action.seed, { mode: action.mode, dailyDate: action.dailyDate });
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
  return formatSeed(seedChars.join(''));
}

export function generateDailySeed(dailyDate: string, options?: { gameVersion?: GameVersion; availableModuleCount?: number }): string {
  return dailySeedFromDate(dailyDate, options);
}

export function getModuleTemplate(kind: CoreKind): Omit<CoreModule, 'id'> {
  return MODULE_BLUEPRINTS[kind];
}
