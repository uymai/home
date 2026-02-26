import { Core, CoreKind, GameAction, GameState, RunResult } from './types';

const START_CREDITS = 0;
const START_CAPACITY_POINTS = 0;
const START_SLOTS = 4;
const START_SLOT_COST = 3;
const UNSTABLE_THRESHOLD = 3;
const WARP_TARGET_PER_RUN = 5;

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

function createCore(kind: CoreKind, id: number): Core {
  switch (kind) {
    case 'credit':
      return { id: `core-${id}`, kind, cost: 2, currency: 2 };
    case 'capacity':
      return { id: `core-${id}`, kind, cost: 3, capacityPoints: 2 };
    case 'unstable':
      return { id: `core-${id}`, kind, cost: 5, currency: 5, unstable: 1 };
    case 'stabilizer':
      return { id: `core-${id}`, kind, cost: 4, stabilizer: 1 };
    case 'warp':
      return { id: `core-${id}`, kind, cost: 9, warp: 1, unstable: 1, currency: 2 };
    default:
      return { id: `core-${id}`, kind: 'credit', cost: 2, currency: 2 };
  }
}

function startingBag(): Core[] {
  const kinds: CoreKind[] = [
    'credit',
    'credit',
    'credit',
    'capacity',
    'capacity',
    'unstable',
    'stabilizer',
    'warp',
  ];

  return kinds.map((kind, index) => createCore(kind, index + 1));
}

function reshuffle(discard: Core[], rngState: number): { bag: Core[]; rngState: number } {
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

function drawCore(bag: Core[], rngState: number): { core: Core; bag: Core[]; rngState: number } {
  const random = nextRandom(rngState);
  const index = Math.floor(random.value * bag.length);
  const core = bag[index];
  const nextBag = [...bag.slice(0, index), ...bag.slice(index + 1)];

  return { core, bag: nextBag, rngState: random.nextState };
}

function runReactor(state: GameState): GameState {
  if (state.status !== 'playing') {
    return state;
  }

  let bag = [...state.bag];
  let discard = [...state.discard];
  let rngState = state.rngState;
  const drawn: Core[] = [];
  const log = [...state.log];

  for (let i = 0; i < state.slotsPerRun; i += 1) {
    if (bag.length === 0 && discard.length > 0) {
      const shuffled = reshuffle(discard, rngState);
      bag = shuffled.bag;
      discard = [];
      rngState = shuffled.rngState;
      log.push('Reshuffled discard into bag.');
    }

    if (bag.length === 0) {
      break;
    }

    const draw = drawCore(bag, rngState);
    bag = draw.bag;
    rngState = draw.rngState;
    drawn.push(draw.core);
  }

  if (drawn.length === 0) {
    return {
      ...state,
      log: [...log, 'Run skipped: no cores available.'],
    };
  }

  const grossCurrency = drawn.reduce((sum, core) => sum + (core.currency ?? 0), 0);
  const grossCapacityPoints = drawn.reduce((sum, core) => sum + (core.capacityPoints ?? 0), 0);
  const unstableCount = drawn.reduce((sum, core) => sum + (core.unstable ?? 0), 0);
  const stabilizerCount = drawn.reduce((sum, core) => sum + (core.stabilizer ?? 0), 0);
  const warpCount = drawn.reduce((sum, core) => sum + (core.warp ?? 0), 0);

  const effectiveUnstable = Math.max(0, unstableCount - stabilizerCount);
  const exploded = effectiveUnstable >= state.unstableThreshold;

  const runResult: RunResult = {
    exploded,
    drawn,
    grossCurrency,
    grossCapacityPoints,
    unstableCount,
    stabilizerCount,
    effectiveUnstable,
    warpCount,
  };

  const won = !exploded && warpCount >= state.warpTargetPerRun;
  const nextRuns = state.runs + 1;

  const nextState: GameState = {
    ...state,
    runs: nextRuns,
    status: won ? 'won' : 'playing',
    score: won ? nextRuns : state.score,
    bag,
    discard: [...discard, ...drawn],
    rngState,
    credits: exploded ? state.credits : state.credits + grossCurrency,
    capacityPoints: exploded ? state.capacityPoints : state.capacityPoints + grossCapacityPoints,
    lastRun: runResult,
    log,
  };

  const summary = `Run ${nextRuns}: drew ${drawn.map((core) => core.kind).join(', ')}.`;
  const riskLine = `Risk: unstable ${unstableCount} - stabilizers ${stabilizerCount} = ${effectiveUnstable}.`;

  if (exploded) {
    return {
      ...nextState,
      log: [...nextState.log, `${summary} ${riskLine} Reactor exploded. Rewards lost.`],
    };
  }

  const rewardLine = `Rewards: +${grossCurrency} credits, +${grossCapacityPoints} capacity points, warp cores ${warpCount}/${state.warpTargetPerRun}.`;
  const winLine = won ? `Goal reached in ${nextRuns} runs.` : '';

  return {
    ...nextState,
    log: [...nextState.log, `${summary} ${riskLine} ${rewardLine} ${winLine}`.trim()],
  };
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

function buyCore(state: GameState, kind: CoreKind): GameState {
  if (state.status !== 'playing') {
    return state;
  }

  const cost = coreCost(kind);
  if (state.credits < cost) {
    return {
      ...state,
      log: [...state.log, `Not enough credits for ${kind} core (cost ${cost}).`],
    };
  }

  const core = createCore(kind, state.nextCoreId);

  return {
    ...state,
    credits: state.credits - cost,
    bag: [...state.bag, core],
    nextCoreId: state.nextCoreId + 1,
    log: [...state.log, `Purchased ${kind} core for ${cost} credits.`],
  };
}

function buySlot(state: GameState): GameState {
  if (state.status !== 'playing') {
    return state;
  }

  if (state.capacityPoints < state.nextSlotCost) {
    return {
      ...state,
      log: [...state.log, `Not enough capacity points for slot upgrade (cost ${state.nextSlotCost}).`],
    };
  }

  return {
    ...state,
    capacityPoints: state.capacityPoints - state.nextSlotCost,
    slotsPerRun: state.slotsPerRun + 1,
    nextSlotCost: state.nextSlotCost + 2,
    log: [...state.log, `Bought +1 slot. Slots per run is now ${state.slotsPerRun + 1}.`],
  };
}

export function createInitialState(seed: string): GameState {
  const bag = startingBag();

  return {
    seed,
    status: 'playing',
    runs: 0,
    score: null,
    credits: START_CREDITS,
    capacityPoints: START_CAPACITY_POINTS,
    slotsPerRun: START_SLOTS,
    nextSlotCost: START_SLOT_COST,
    unstableThreshold: UNSTABLE_THRESHOLD,
    warpTargetPerRun: WARP_TARGET_PER_RUN,
    bag,
    discard: [],
    rngState: hashSeed(seed),
    nextCoreId: bag.length + 1,
    lastRun: null,
    log: [`Run initialized with seed "${seed}".`],
  };
}

export function reduceGameState(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'run-reactor':
      return runReactor(state);
    case 'buy-core':
      return buyCore(state, action.kind);
    case 'buy-slot':
      return buySlot(state);
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
