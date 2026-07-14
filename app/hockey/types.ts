export type DieSides = 6 | 8 | 12 | 20;

export type Direction = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

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
  remainingPoints: number;
  skates: number;
  checks: number;
  lastRoll: number | null;
  lastStep: StepResult | null;
  log: string[];
};

export type GameAction =
  | { type: 'roll' }
  | { type: 'step'; direction: Direction }
  | { type: 'end-skate' }
  | { type: 'new-game'; seed?: string };
