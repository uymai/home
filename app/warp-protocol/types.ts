export type ModuleKind =
  | 'flux-coil'
  | 'sponsored-relay'
  | 'stabilizer'
  | 'volatile-lens'
  | 'warp-core';

export type GameStatus = 'playing' | 'won' | 'lost';
export type GamePhase = 'draw' | 'buy' | 'ended';

export type ModuleCard = {
  id: string;
  kind: ModuleKind;
  fluxValue: number;
  creditValue: number;
  instabilityValue: number;
  isWarpCore: boolean;
  tier: number;
  sponsored?: boolean;
};

export type RoundSnapshot = {
  number: number;
  exploded: boolean;
  drawn: ModuleCard[];
  roundFlux: number;
  roundCredits: number;
  roundInstability: number;
  reason: 'banked' | 'instability' | 'capacity';
};

export type GameState = {
  seed: string;
  status: GameStatus;
  phase: GamePhase;
  rounds: number;
  score: number | null;
  flux: number;
  credits: number;
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
  bag: ModuleCard[];
  discard: ModuleCard[];
  activePile: ModuleCard[];
  rngState: number;
  nextModuleId: number;
  lastRound: RoundSnapshot | null;
  seedModifier: string;
  log: string[];
};

export type FluxPurchaseKind = Exclude<ModuleKind, 'flux-coil'> | 'flux-coil';
export type CreditUpgradeKind = 'slot-capacity' | 'instability-threshold' | 'draw-limit';

export type GameAction =
  | { type: 'draw-module' }
  | { type: 'stop-and-bank' }
  | { type: 'buy-module'; kind: FluxPurchaseKind }
  | { type: 'buy-upgrade'; kind: CreditUpgradeKind }
  | { type: 'start-next-round' }
  | { type: 'new-run'; seed: string };
