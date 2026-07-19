// Shared types for the hockey engine (engine.ts) and UI (HockeyClient.tsx). Kept
// framework-free like engine.ts — just plain data shapes.

export type DieSides = 6 | 8 | 12 | 20;

export type Direction = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

// A cell on the movement grid, zero-indexed from the top-left. See engine.ts's
// FEET_PER_CELL for how this maps onto the rink's real-world feet.
export type Position = {
  col: number;
  row: number;
};

export type Character = {
  id: string;
  name: string;
  role: string;
  color: string;
  dieSides: DieSides;
};

// The outcome of one applyStep call — kept around as GameState.lastStep so the UI
// (or a future "camera shake on a bad bounce" type feature) can react to it.
export type StepResult = {
  direction: Direction;
  from: Position;
  to: Position;
  blocked: boolean;
};

export type GameState = {
  seed: string;
  rngState: number;
  character: Character;
  position: Position;
  // How many movement points are left to spend on the current skate. 0 means no
  // skate is in progress — you must 'roll' before you can 'step'.
  remainingPoints: number;
  skates: number;
  // Reserved for a future puck-contesting mechanic (see createInitialState in
  // engine.ts) — always 0 today, no action currently increments it.
  checks: number;
  lastRoll: number | null;
  lastStep: StepResult | null;
  log: string[];
};

// Everything the reducer (engine.ts's reduceGameState) knows how to do. 'roll' starts
// a skate, 'step' spends one point moving, 'end-skate' bails out of the current one
// early, and 'new-game' resets the whole thing (optionally with a specific seed, to
// reproduce a run).
export type GameAction =
  | { type: 'roll' }
  | { type: 'step'; direction: Direction }
  | { type: 'end-skate' }
  | { type: 'new-game'; seed?: string };
