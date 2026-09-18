// Pure game engine for the hockey mini-game: no React, no DOM, no framework imports.
// Everything here is plain functions and data so it's trivially unit-testable (see
// engine.test.ts) and so this whole app/hockey/ folder can be lifted into its own
// project later without dragging any of the rest of the site along with it.
import { Character, DieSides, Direction, GameAction, GameState, Position, StepResult } from './types';

// --- Rink geometry -----------------------------------------------------------------
// Modeled on a real NHL rink (200ft x 85ft, 28ft corner radius) at 5ft per grid cell.
// FEET_PER_CELL controls movement granularity (how far one "step" carries the
// character); RINK_LENGTH_FT/RINK_WIDTH_FT are *derived* from RINK_COLS/RINK_ROWS
// rather than hardcoded separately, so the gameplay grid and the physical rink size
// can never drift apart.
export const FEET_PER_CELL = 5;
export const RINK_COLS = 41;
export const RINK_ROWS = 17;
export const RINK_LENGTH_FT = RINK_COLS * FEET_PER_CELL;
export const RINK_WIDTH_FT = RINK_ROWS * FEET_PER_CELL;
export const CORNER_RADIUS_FT = 28;

// Both RINK_COLS and RINK_ROWS are odd, so these land on a single unambiguous
// center cell rather than splitting the difference between two middle cells.
const CENTER_COL = Math.floor(RINK_COLS / 2);
const CENTER_ROW = Math.floor(RINK_ROWS / 2);

// All the standard rink markings, in feet from the top-left corner. These are the
// single source of truth for both the SVG drawing in HockeyClient.tsx and (if a
// future rule ever needs it, e.g. "can't be checked in the crease") for gameplay.
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

// 5 faceoff circles total: 1 blue circle at center ice, plus 2 red circles per
// zone (one above and one below the rink's mid-width line). GOAL_LINE_X_FT has
// one entry per end of the rink, so flatMap turns each goal line into its pair
// of zone circles, offset inward from the goal line and out from center ice.
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

// Is this grid cell part of the playable ice? The rink isn't a plain rectangle —
// the 4 corners are rounded off (like real boards), so a plain bounds check isn't
// enough. This is the standard "distance to a rounded rectangle" test:
//   1. First reject anything outside the rink's outer bounding box entirely.
//   2. dx/dy measure how far this point has strayed into one of the 4 corner
//      "bands" (the CORNER_RADIUS_FT-wide strip along each edge near a corner).
//      Outside those bands, dx or dy is 0, so the point is automatically inside
//      (straight edges and the interior never get excluded).
//   3. Inside a corner band, treat it like a quarter-circle: only cells within
//      CORNER_RADIUS_FT of the arc's center count as playable.
// The same CORNER_RADIUS_FT drives the SVG's rounded-corner boards rect in
// HockeyClient.tsx, so the visual boundary and the movement boundary always match.
export function isPlayableCell(col: number, row: number): boolean {
  // Test from the middle of the cell, not its corner, so a cell only counts as
  // "in bounds" if its center is actually on the ice.
  const x = (col + 0.5) * FEET_PER_CELL;
  const y = (row + 0.5) * FEET_PER_CELL;
  if (x < 0 || x > RINK_LENGTH_FT || y < 0 || y > RINK_WIDTH_FT) {
    return false;
  }
  const dx = Math.max(CORNER_RADIUS_FT - x, x - (RINK_LENGTH_FT - CORNER_RADIUS_FT), 0);
  const dy = Math.max(CORNER_RADIUS_FT - y, y - (RINK_WIDTH_FT - CORNER_RADIUS_FT), 0);
  return dx * dx + dy * dy <= CORNER_RADIUS_FT * CORNER_RADIUS_FT;
}

// --- Seeded randomness -------------------------------------------------------------
// Everything here is a deterministic PRNG, not Math.random(). Given the same seed,
// the exact same sequence of rolls comes out every time — that's what makes the
// engine's dice rolls unit-testable (see "seeded PRNG" in engine.test.ts) and would
// let a future version support shareable/replayable game seeds.

// FNV-1a style string hash: turns an arbitrary seed string into a starting RNG state.
export function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// mulberry32-style step: given a 32-bit state, produces one pseudo-random float in
// [0, 1) plus the next state to feed back in for the following call. State never
// lives outside GameState.rngState — there's no hidden global RNG to keep in sync.
export function nextRandom(state: number): { value: number; nextState: number } {
  const nextState = (state + 0x6d2b79f5) >>> 0;
  let t = nextState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, nextState };
}

// Rolls one die with the given number of sides, e.g. rollDie(20, rngState) for a d20.
export function rollDie(sides: DieSides, rngState: number): { value: number; nextState: number } {
  const random = nextRandom(rngState);
  const value = Math.floor(random.value * sides) + 1;
  return { value, nextState: random.nextState };
}

// --- Movement directions -------------------------------------------------------------
// The player picks a direction for each step (see applyStep below) — the die roll only
// decides how many steps they get, not which way they go.
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

// --- Characters ----------------------------------------------------------------------
// A small static roster of hockey positions, each with a different die, so "different
// characters, different dice" is visible in the UI even though only one character is
// actually playable right now (see ACTIVE_CHARACTER_ID below). The other three are
// scaffolding for a future version where more than one character is on the ice.
export const ROSTER: Character[] = [
  { id: 'center', name: 'The Pivot', role: 'Center', color: 'bg-blue-100 dark:bg-blue-950', dieSides: 20 },
  { id: 'wing', name: 'The Winger', role: 'Right Wing', color: 'bg-orange-100 dark:bg-orange-950', dieSides: 12 },
  { id: 'defense', name: 'The Blueliner', role: 'Defenseman', color: 'bg-emerald-100 dark:bg-emerald-950', dieSides: 8 },
  { id: 'goalie', name: 'The Netminder', role: 'Goalie', color: 'bg-amber-100 dark:bg-amber-950', dieSides: 6 },
];

// The one roster entry actually controlled by the player this round.
export const ACTIVE_CHARACTER_ID = 'center';

function getActiveCharacter(): Character {
  const character = ROSTER.find((entry) => entry.id === ACTIVE_CHARACTER_ID);
  if (!character) {
    throw new Error(`No roster entry for active character id "${ACTIVE_CHARACTER_ID}"`);
  }
  return character;
}

// Builds a brand-new game: character parked at center ice, no points to spend yet
// (remainingPoints starts at 0 — you have to "roll" before you can "step"), and a
// deterministic rngState derived from the seed. Passing no seed generates a random
// one, which is what HockeyClient.tsx does on first load; passing an explicit seed
// (as the 'new-game' action does when replaying) reproduces the same run.
export function createInitialState(seed?: string, character: Character = getActiveCharacter()): GameState {
  const resolvedSeed = seed ?? generateSeed();
  return {
    seed: resolvedSeed,
    rngState: hashSeed(resolvedSeed),
    character,
    position: { col: CENTER_COL, row: CENTER_ROW },
    remainingPoints: 0,
    skates: 0,
    // Reserved for a future mechanic: contesting the puck off an opponent, with the
    // defender getting a counter-roll to resist. There's no puck or second player
    // yet, so nothing increments this today — it's here so that feature can be added
    // without changing GameState's shape.
    checks: 0,
    lastRoll: null,
    lastStep: null,
    log: [`New game started with ${character.name} at center ice.`],
  };
}

// Generates a random, URL/log-safe seed string for a fresh (non-replayed) game.
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

// --- Turn actions ----------------------------------------------------------------------
// A "skate" is: roll once to get a budget of movement points, then spend them one at a
// time via applyStep (in any direction, not necessarily the same one), until either the
// points run out or the player calls it early with endSkate. This mirrors the reducer's
// other games in this codebase (e.g. warp-protocol's "draw" vs "bank") — a resource is
// earned by one action and spent/committed by others.

// Rolls the active character's die and starts a new skate. No-ops (returns the exact
// same state, so callers can compare with `===`) if a skate is already in progress —
// you can't re-roll mid-skate, you have to spend or end the current one first.
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

// Spends exactly 1 movement point trying to move 1 cell in `direction`. If the target
// cell isn't playable (off the ice, or in a cut-off corner), the character "hits the
// boards": position doesn't change, but the point is spent anyway and the attempt is
// still logged — trying costs you, whether or not it works. No-ops if there are no
// points left to spend (call rollForPoints first).
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

// Voluntarily stops the current skate, discarding whatever points are left (there's
// nothing to spend them on yet, but this establishes the "you don't have to use
// everything" shape for a future move-vs-action tradeoff). No-ops if there's nothing
// to discard.
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

// The single entry point HockeyClient.tsx dispatches actions through (via useReducer).
// Each branch just delegates to one of the pure functions above — reduceGameState
// itself never touches GameState fields directly.
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
