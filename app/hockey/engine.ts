import { Character, DieSides, Direction, GameAction, GameState, Position, StepResult } from './types';

// Modeled on a real NHL rink (200ft x 85ft, 28ft corner radius) at 5ft per grid cell.
export const FEET_PER_CELL = 5;
export const RINK_COLS = 41;
export const RINK_ROWS = 17;
export const RINK_LENGTH_FT = RINK_COLS * FEET_PER_CELL;
export const RINK_WIDTH_FT = RINK_ROWS * FEET_PER_CELL;
export const CORNER_RADIUS_FT = 28;

const CENTER_COL = Math.floor(RINK_COLS / 2);
const CENTER_ROW = Math.floor(RINK_ROWS / 2);

export const CENTER_LINE_X_FT = RINK_LENGTH_FT / 2;
export const BLUE_LINE_OFFSET_FT = 25;
export const BLUE_LINE_X_FT: [number, number] = [CENTER_LINE_X_FT - BLUE_LINE_OFFSET_FT, CENTER_LINE_X_FT + BLUE_LINE_OFFSET_FT];
export const GOAL_LINE_OFFSET_FT = 11;
export const GOAL_LINE_X_FT: [number, number] = [GOAL_LINE_OFFSET_FT, RINK_LENGTH_FT - GOAL_LINE_OFFSET_FT];
export const CREASE_RADIUS_FT = 6;
export const FACEOFF_CIRCLE_RADIUS_FT = 15;
export const FACEOFF_DOT_RADIUS_FT = 1;
export const ZONE_FACEOFF_OFFSET_X_FT = 20;
export const ZONE_FACEOFF_OFFSET_Y_FT = 22;

const RINK_MID_WIDTH_FT = RINK_WIDTH_FT / 2;

export type FaceoffCircle = { x: number; y: number; color: 'blue' | 'red' };

export const FACEOFF_CIRCLES: FaceoffCircle[] = [
  { x: CENTER_LINE_X_FT, y: RINK_MID_WIDTH_FT, color: 'blue' },
  ...GOAL_LINE_X_FT.flatMap((goalLineX): FaceoffCircle[] => {
    const zoneX = goalLineX < CENTER_LINE_X_FT ? goalLineX + ZONE_FACEOFF_OFFSET_X_FT : goalLineX - ZONE_FACEOFF_OFFSET_X_FT;
    return [
      { x: zoneX, y: RINK_MID_WIDTH_FT - ZONE_FACEOFF_OFFSET_Y_FT, color: 'red' },
      { x: zoneX, y: RINK_MID_WIDTH_FT + ZONE_FACEOFF_OFFSET_Y_FT, color: 'red' },
    ];
  }),
];

export function isPlayableCell(col: number, row: number): boolean {
  const x = (col + 0.5) * FEET_PER_CELL;
  const y = (row + 0.5) * FEET_PER_CELL;
  if (x < 0 || x > RINK_LENGTH_FT || y < 0 || y > RINK_WIDTH_FT) {
    return false;
  }
  const dx = Math.max(CORNER_RADIUS_FT - x, x - (RINK_LENGTH_FT - CORNER_RADIUS_FT), 0);
  const dy = Math.max(CORNER_RADIUS_FT - y, y - (RINK_WIDTH_FT - CORNER_RADIUS_FT), 0);
  return dx * dx + dy * dy <= CORNER_RADIUS_FT * CORNER_RADIUS_FT;
}

export function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function nextRandom(state: number): { value: number; nextState: number } {
  const nextState = (state + 0x6d2b79f5) >>> 0;
  let t = nextState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, nextState };
}

export function rollDie(sides: DieSides, rngState: number): { value: number; nextState: number } {
  const random = nextRandom(rngState);
  const value = Math.floor(random.value * sides) + 1;
  return { value, nextState: random.nextState };
}

export const DIRECTIONS: Direction[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

const DIRECTION_DELTAS: Record<Direction, { dc: number; dr: number }> = {
  N: { dc: 0, dr: -1 },
  NE: { dc: 1, dr: -1 },
  E: { dc: 1, dr: 0 },
  SE: { dc: 1, dr: 1 },
  S: { dc: 0, dr: 1 },
  SW: { dc: -1, dr: 1 },
  W: { dc: -1, dr: 0 },
  NW: { dc: -1, dr: -1 },
};

export function directionDelta(direction: Direction): { dc: number; dr: number } {
  return DIRECTION_DELTAS[direction];
}

export const ROSTER: Character[] = [
  { id: 'center', name: 'The Pivot', role: 'Center', color: 'bg-blue-100 dark:bg-blue-950', dieSides: 20 },
  { id: 'wing', name: 'The Winger', role: 'Right Wing', color: 'bg-orange-100 dark:bg-orange-950', dieSides: 12 },
  { id: 'defense', name: 'The Blueliner', role: 'Defenseman', color: 'bg-emerald-100 dark:bg-emerald-950', dieSides: 8 },
  { id: 'goalie', name: 'The Netminder', role: 'Goalie', color: 'bg-amber-100 dark:bg-amber-950', dieSides: 6 },
];

export const ACTIVE_CHARACTER_ID = 'center';

function getActiveCharacter(): Character {
  const character = ROSTER.find((entry) => entry.id === ACTIVE_CHARACTER_ID);
  if (!character) {
    throw new Error(`No roster entry for active character id "${ACTIVE_CHARACTER_ID}"`);
  }
  return character;
}

export function createInitialState(seed?: string, character: Character = getActiveCharacter()): GameState {
  const resolvedSeed = seed ?? generateSeed();
  return {
    seed: resolvedSeed,
    rngState: hashSeed(resolvedSeed),
    character,
    position: { col: CENTER_COL, row: CENTER_ROW },
    remainingPoints: 0,
    skates: 0,
    checks: 0,
    lastRoll: null,
    lastStep: null,
    log: [`New game started with ${character.name} at center ice.`],
  };
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

function rollForPoints(state: GameState): GameState {
  if (state.remainingPoints > 0) {
    return state;
  }
  const roll = rollDie(state.character.dieSides, state.rngState);
  return {
    ...state,
    rngState: roll.nextState,
    remainingPoints: roll.value,
    skates: state.skates + 1,
    lastRoll: roll.value,
    lastStep: null,
    log: [
      ...state.log,
      `Rolled a ${roll.value} on the d${state.character.dieSides} — ${roll.value} point${roll.value === 1 ? '' : 's'} to skate with.`,
    ],
  };
}

function applyStep(state: GameState, direction: Direction): GameState {
  if (state.remainingPoints <= 0) {
    return state;
  }
  const delta = directionDelta(direction);
  const from = state.position;
  const target: Position = { col: from.col + delta.dc, row: from.row + delta.dr };
  const blocked = !isPlayableCell(target.col, target.row);
  const to = blocked ? from : target;
  const stepResult: StepResult = { direction, from, to, blocked };
  const logEntry = blocked
    ? `Tried to skate ${direction} but hit the boards.`
    : `Skated ${direction} to (${to.col}, ${to.row}).`;

  return {
    ...state,
    position: to,
    remainingPoints: state.remainingPoints - 1,
    lastStep: stepResult,
    log: [...state.log, logEntry],
  };
}

function endSkate(state: GameState): GameState {
  if (state.remainingPoints <= 0) {
    return state;
  }
  const discarded = state.remainingPoints;
  return {
    ...state,
    remainingPoints: 0,
    log: [...state.log, `Ended the skate early, leaving ${discarded} point${discarded === 1 ? '' : 's'} unused.`],
  };
}

export function reduceGameState(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'roll':
      return rollForPoints(state);
    case 'step':
      return applyStep(state, action.direction);
    case 'end-skate':
      return endSkate(state);
    case 'new-game':
      return createInitialState(action.seed, state.character);
    default:
      return state;
  }
}
