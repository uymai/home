export type ActivityState = {
  name: string;
  noWeight?: boolean;
  weight: string;
  roundsCompleted: number;
};

export type BlockState = {
  id: string;
  label: string;
  started: boolean;
  activities: ActivityState[];
};

export type SessionPhase = 'select-program' | 'select-day' | 'block' | 'summary';

export type SessionState = {
  phase: SessionPhase;
  programId: string | null;
  dayId: string | null;
  blocks: BlockState[];
  currentBlockIndex: number;
};

export type SessionAction =
  | { type: 'select-program'; programId: string }
  | { type: 'select-day'; dayId: string; previousWeights: Record<string, string> }
  | { type: 'set-weight'; blockIndex: number; activityIndex: number; value: string }
  | { type: 'start-block' }
  | { type: 'increment-round'; blockIndex: number; activityIndex: number }
  | { type: 'decrement-round'; blockIndex: number; activityIndex: number }
  | { type: 'next-block' }
  | { type: 'prev-block' }
  | { type: 'finish-day' }
  | { type: 'restart-day' }
  | { type: 'restart-program' };
