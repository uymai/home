export type CoreKind =
  | 'flux-coil'
  | 'sponsored-relay'
  | 'stabilizer'
  | 'volatile-lens'
  | 'warp-core';

export type GameStatus = 'playing' | 'won';
export type RoundStatus = 'drawing' | 'stopped' | 'busted';

export type CoreModule = {
  id: string;
  name: string;
  kind: CoreKind;
  tier: number;
  costFlux: number;
  costCredits: number;
  genFlux: number;
  genCredits: number;
  addInstability: number;
  sponsored?: boolean;
  isWarpCore?: boolean;
};

export type RoundSnapshot = {
  number: number;
  status: RoundStatus;
  drawn: CoreModule[];
  roundFlux: number;
  roundCredits: number;
  roundInstability: number;
};

export type GameState = {
  seed: string;
  status: GameStatus;
  rounds: number;
  score: number | null;
  roundStatus: RoundStatus;
  bankedFlux: number;
  bankedCredits: number;
  roundFlux: number;
  roundCredits: number;
  roundInstability: number;
  drawCount: number;
  drawLimit: number;
  slotCapacity: number;
  instabilityThreshold: number;
  nextDrawLimitCost: number;
  nextSlotCapacityCost: number;
  nextInstabilityCost: number;
  warpProgress: number;
  warpProgressTarget: number;
  warpCoreTarget: number;
  bag: CoreModule[];
  discard: CoreModule[];
  activePile: CoreModule[];
  lastDiscarded: CoreModule[];
  rngState: number;
  nextModuleId: number;
  lastRound: RoundSnapshot | null;
  seedModifier: string;
  log: string[];
};

export type FluxPurchaseKind = CoreKind;
export type CreditUpgradeKind = 'slot-capacity' | 'instability-threshold' | 'draw-limit';

export type GameAction =
  | { type: 'draw-module' }
  | { type: 'stop-and-bank' }
  | { type: 'buy-module'; kind: FluxPurchaseKind }
  | { type: 'buy-upgrade'; kind: CreditUpgradeKind }
  | { type: 'start-next-round' }
  | { type: 'new-run'; seed: string };
