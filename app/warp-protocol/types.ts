export type CoreKind = 'credit' | 'capacity' | 'unstable' | 'stabilizer' | 'warp';

export type GameStatus = 'playing' | 'won';

export type Core = {
  id: string;
  kind: CoreKind;
  cost: number;
  currency?: number;
  capacityPoints?: number;
  unstable?: number;
  stabilizer?: number;
  warp?: number;
};

export type RunResult = {
  exploded: boolean;
  drawn: Core[];
  grossCurrency: number;
  grossCapacityPoints: number;
  unstableCount: number;
  stabilizerCount: number;
  effectiveUnstable: number;
  warpCount: number;
};

export type GameState = {
  seed: string;
  status: GameStatus;
  runs: number;
  score: number | null;
  credits: number;
  capacityPoints: number;
  slotsPerRun: number;
  nextSlotCost: number;
  unstableThreshold: number;
  warpTargetPerRun: number;
  bag: Core[];
  discard: Core[];
  rngState: number;
  nextCoreId: number;
  lastRun: RunResult | null;
  log: string[];
};

export type GameAction =
  | { type: 'run-reactor' }
  | { type: 'buy-core'; kind: CoreKind }
  | { type: 'buy-slot' }
  | { type: 'new-run'; seed: string };
