import { Program } from './programs';
import { BlockState, SessionAction, SessionState } from './types';

export function createInitialState(): SessionState {
  return {
    phase: 'select-program',
    programId: null,
    dayId: null,
    blocks: [],
  };
}

function findProgram(programs: Program[], programId: string | null) {
  return programs.find((program) => program.id === programId) ?? null;
}

function findDay(program: ReturnType<typeof findProgram>, dayId: string | null) {
  return program?.days.find((day) => day.id === dayId) ?? null;
}

function buildBlocks(program: ReturnType<typeof findProgram>, dayId: string): BlockState[] {
  const day = findDay(program, dayId);
  if (!day) return [];
  return day.blocks.map((block) => ({
    id: block.id,
    label: block.label,
    activities: block.activities.map((activity) => ({
      name: activity.name,
      noWeight: activity.noWeight,
      weight: '',
      roundsCompleted: 0,
    })),
  }));
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
        phase: 'set-weights',
        dayId: action.dayId,
        blocks: buildBlocks(program, action.dayId),
      };
    }

    case 'set-weight': {
      if (state.phase !== 'set-weights' && state.phase !== 'live') return state;
      const block = state.blocks[action.blockIndex];
      if (!block?.activities[action.activityIndex]) return state;
      const blocks = state.blocks.map((b, bIndex) => {
        if (bIndex !== action.blockIndex) return b;
        return {
          ...b,
          activities: b.activities.map((a, aIndex) =>
            aIndex === action.activityIndex ? { ...a, weight: action.value } : a,
          ),
        };
      });
      return { ...state, blocks };
    }

    case 'start-live':
      return state.phase === 'set-weights' ? { ...state, phase: 'live' } : state;

    case 'increment-round':
    case 'decrement-round': {
      if (state.phase !== 'live') return state;
      const block = state.blocks[action.blockIndex];
      if (!block?.activities[action.activityIndex]) return state;
      const delta = action.type === 'increment-round' ? 1 : -1;
      const blocks = state.blocks.map((b, bIndex) => {
        if (bIndex !== action.blockIndex) return b;
        return {
          ...b,
          activities: b.activities.map((a, aIndex) =>
            aIndex === action.activityIndex
              ? { ...a, roundsCompleted: Math.max(0, a.roundsCompleted + delta) }
              : a,
          ),
        };
      });
      return { ...state, blocks };
    }

    case 'finish-day':
      return state.phase === 'live' ? { ...state, phase: 'summary' } : state;

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
