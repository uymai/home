import { Program } from './programs';
import { BlockState, SessionAction, SessionState } from './types';

export function createInitialState(): SessionState {
  return {
    phase: 'select-program',
    programId: null,
    dayId: null,
    blocks: [],
    currentBlockIndex: 0,
  };
}

function findProgram(programs: Program[], programId: string | null) {
  return programs.find((program) => program.id === programId) ?? null;
}

function findDay(program: ReturnType<typeof findProgram>, dayId: string | null) {
  return program?.days.find((day) => day.id === dayId) ?? null;
}

function buildBlocks(
  program: ReturnType<typeof findProgram>,
  dayId: string,
  previousWeights: Record<string, string>,
): BlockState[] {
  const day = findDay(program, dayId);
  if (!day) return [];
  return day.blocks.map((block) => ({
    id: block.id,
    label: block.label,
    started: false,
    activities: block.activities.map((activity) => ({
      name: activity.name,
      noWeight: activity.noWeight,
      weight: previousWeights[activity.name] ?? '',
      roundsCompleted: 0,
    })),
  }));
}

function updateActivity(
  blocks: BlockState[],
  blockIndex: number,
  activityIndex: number,
  update: (activity: BlockState['activities'][number]) => BlockState['activities'][number],
): BlockState[] {
  return blocks.map((block, bIndex) => {
    if (bIndex !== blockIndex) return block;
    return {
      ...block,
      activities: block.activities.map((activity, aIndex) =>
        aIndex === activityIndex ? update(activity) : activity,
      ),
    };
  });
}

export function reduceSessionState(
  state: SessionState,
  action: SessionAction,
  programs: Program[],
): SessionState {
  switch (action.type) {
    case 'select-program':
      return {
        ...createInitialState(),
        phase: 'select-day',
        programId: action.programId,
      };

    case 'select-day': {
      const program = findProgram(programs, state.programId);
      return {
        ...state,
        phase: 'block',
        dayId: action.dayId,
        blocks: buildBlocks(program, action.dayId, action.previousWeights),
        currentBlockIndex: 0,
      };
    }

    case 'set-weight': {
      if (state.phase !== 'block') return state;
      const block = state.blocks[action.blockIndex];
      if (!block?.activities[action.activityIndex]) return state;
      return {
        ...state,
        blocks: updateActivity(state.blocks, action.blockIndex, action.activityIndex, (activity) => ({
          ...activity,
          weight: action.value,
        })),
      };
    }

    case 'start-block': {
      if (state.phase !== 'block') return state;
      const blocks = state.blocks.map((block, index) =>
        index === state.currentBlockIndex ? { ...block, started: true } : block,
      );
      return { ...state, blocks };
    }

    case 'increment-round':
    case 'decrement-round': {
      if (state.phase !== 'block') return state;
      const block = state.blocks[action.blockIndex];
      if (!block?.activities[action.activityIndex] || !block.started) return state;
      const delta = action.type === 'increment-round' ? 1 : -1;
      return {
        ...state,
        blocks: updateActivity(state.blocks, action.blockIndex, action.activityIndex, (activity) => ({
          ...activity,
          roundsCompleted: Math.max(0, activity.roundsCompleted + delta),
        })),
      };
    }

    case 'next-block':
      return state.phase === 'block'
        ? { ...state, currentBlockIndex: Math.min(state.currentBlockIndex + 1, state.blocks.length - 1) }
        : state;

    case 'prev-block':
      return state.phase === 'block'
        ? { ...state, currentBlockIndex: Math.max(state.currentBlockIndex - 1, 0) }
        : state;

    case 'finish-day':
      return state.phase === 'block' ? { ...state, phase: 'summary' } : state;

    case 'restart-day':
      return {
        ...createInitialState(),
        phase: 'select-day',
        programId: state.programId,
      };

    case 'restart-program':
      return createInitialState();

    default:
      return state;
  }
}
