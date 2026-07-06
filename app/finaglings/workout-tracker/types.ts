export type ActivityState = {
  name: string;
  noWeight?: boolean;
  weight: string;
  roundsCompleted: number;
};

export type BlockState = {
  id: string;
  label: string;
  activities: ActivityState[];
};

export type SessionPhase = 'select-program' | 'select-day' | 'set-weights' | 'live' | 'summary';

export type SessionState = {
  phase: SessionPhase;
  programId: string | null;
  dayId: string | null;
  blocks: BlockState[];
};

export type SessionAction =
  | { type: 'select-program'; programId: string }
  | { type: 'select-day'; dayId: string }
  | { type: 'set-weight'; blockIndex: number; activityIndex: number; value: string }
  | { type: 'start-live' }
  | { type: 'increment-round'; blockIndex: number; activityIndex: number }
  | { type: 'decrement-round'; blockIndex: number; activityIndex: number }
  | { type: 'finish-day' }
  | { type: 'restart-day' }
  | { type: 'restart-program' };
