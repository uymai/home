import { describe, expect, it } from 'vitest';
import { createInitialState, reduceSessionState } from './engine';
import { Program } from './programs';
import { SessionState } from './types';

const TEST_PROGRAMS: Program[] = [
  {
    id: 'test-program',
    name: 'Test Program',
    days: [
      {
        id: 'day1',
        label: 'Day 1',
        blocks: [
          {
            id: 'day1-block1',
            label: 'First block',
            activities: [{ name: 'Squat' }, { name: 'Press' }],
          },
          {
            id: 'day1-block2',
            label: 'Second Block',
            activities: [{ name: 'Plank', noWeight: true }],
          },
        ],
      },
      {
        id: 'day2',
        label: 'Day 2',
        blocks: [
          {
            id: 'day2-block1',
            label: 'First block',
            activities: [{ name: 'Row' }],
          },
        ],
      },
    ],
  },
];

function selectDay(): SessionState {
  const selectedProgram = reduceSessionState(createInitialState(), { type: 'select-program', programId: 'test-program' }, TEST_PROGRAMS);
  return reduceSessionState(selectedProgram, { type: 'select-day', dayId: 'day1' }, TEST_PROGRAMS);
}

describe('Workout Tracker engine', () => {
  it('creates the expected initial state', () => {
    const state = createInitialState();
    expect(state.phase).toBe('select-program');
    expect(state.programId).toBeNull();
    expect(state.dayId).toBeNull();
    expect(state.blocks).toEqual([]);
  });

  it('selecting a program moves to select-day and resets prior selections', () => {
    const state = reduceSessionState(createInitialState(), { type: 'select-program', programId: 'test-program' }, TEST_PROGRAMS);
    expect(state.phase).toBe('select-day');
    expect(state.programId).toBe('test-program');
    expect(state.dayId).toBeNull();
    expect(state.blocks).toEqual([]);
  });

  it('selecting a day builds blocks from that day with zeroed progress', () => {
    const state = selectDay();
    expect(state.phase).toBe('set-weights');
    expect(state.dayId).toBe('day1');
    expect(state.blocks).toEqual([
      {
        id: 'day1-block1',
        label: 'First block',
        activities: [
          { name: 'Squat', noWeight: undefined, weight: '', roundsCompleted: 0 },
          { name: 'Press', noWeight: undefined, weight: '', roundsCompleted: 0 },
        ],
      },
      {
        id: 'day1-block2',
        label: 'Second Block',
        activities: [{ name: 'Plank', noWeight: true, weight: '', roundsCompleted: 0 }],
      },
    ]);
  });

  it('set-weight only touches the addressed activity', () => {
    const state = selectDay();
    const next = reduceSessionState(state, { type: 'set-weight', blockIndex: 0, activityIndex: 1, value: '25' }, TEST_PROGRAMS);

    expect(next.blocks[0].activities[0].weight).toBe('');
    expect(next.blocks[0].activities[1].weight).toBe('25');
    expect(next.blocks[1].activities[0].weight).toBe('');
  });

  it('start-live only transitions out of set-weights', () => {
    const state = selectDay();
    const live = reduceSessionState(state, { type: 'start-live' }, TEST_PROGRAMS);
    expect(live.phase).toBe('live');

    const noop = reduceSessionState(live, { type: 'start-live' }, TEST_PROGRAMS);
    expect(noop).toBe(live);
  });

  it('increment-round and decrement-round only affect the addressed activity and clamp at 0', () => {
    const live = reduceSessionState(selectDay(), { type: 'start-live' }, TEST_PROGRAMS);

    const afterIncrements = [1, 2, 3].reduce(
      (s) => reduceSessionState(s, { type: 'increment-round', blockIndex: 0, activityIndex: 0 }, TEST_PROGRAMS),
      live,
    );
    expect(afterIncrements.blocks[0].activities[0].roundsCompleted).toBe(3);
    expect(afterIncrements.blocks[0].activities[1].roundsCompleted).toBe(0);

    const afterDecrement = reduceSessionState(afterIncrements, { type: 'decrement-round', blockIndex: 0, activityIndex: 0 }, TEST_PROGRAMS);
    expect(afterDecrement.blocks[0].activities[0].roundsCompleted).toBe(2);

    const flooredAtZero = [1, 2].reduce(
      (s) => reduceSessionState(s, { type: 'decrement-round', blockIndex: 0, activityIndex: 1 }, TEST_PROGRAMS),
      live,
    );
    expect(flooredAtZero.blocks[0].activities[1].roundsCompleted).toBe(0);
  });

  it('finish-day moves to summary only from live', () => {
    const setWeights = selectDay();
    expect(reduceSessionState(setWeights, { type: 'finish-day' }, TEST_PROGRAMS)).toBe(setWeights);

    const live = reduceSessionState(setWeights, { type: 'start-live' }, TEST_PROGRAMS);
    const summary = reduceSessionState(live, { type: 'finish-day' }, TEST_PROGRAMS);
    expect(summary.phase).toBe('summary');
  });

  it('restart-day keeps programId and returns to select-day with cleared blocks', () => {
    const live = reduceSessionState(selectDay(), { type: 'start-live' }, TEST_PROGRAMS);
    const progressed = reduceSessionState(live, { type: 'increment-round', blockIndex: 0, activityIndex: 0 }, TEST_PROGRAMS);

    const restarted = reduceSessionState(progressed, { type: 'restart-day' }, TEST_PROGRAMS);
    expect(restarted.phase).toBe('select-day');
    expect(restarted.programId).toBe('test-program');
    expect(restarted.dayId).toBeNull();
    expect(restarted.blocks).toEqual([]);
  });

  it('restart-program returns to the exact initial state', () => {
    const live = reduceSessionState(selectDay(), { type: 'start-live' }, TEST_PROGRAMS);
    const restarted = reduceSessionState(live, { type: 'restart-program' }, TEST_PROGRAMS);
    expect(restarted).toEqual(createInitialState());
  });

  it('does not mutate the input state', () => {
    const state = selectDay();
    const snapshot = JSON.parse(JSON.stringify(state));
    reduceSessionState(state, { type: 'set-weight', blockIndex: 0, activityIndex: 0, value: '25' }, TEST_PROGRAMS);
    expect(state).toEqual(snapshot);
  });
});
