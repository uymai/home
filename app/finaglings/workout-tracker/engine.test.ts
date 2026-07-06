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

function selectDay(previousWeights: Record<string, string> = {}): SessionState {
  const selectedProgram = reduceSessionState(createInitialState(), { type: 'select-program', programId: 'test-program' }, TEST_PROGRAMS);
  return reduceSessionState(selectedProgram, { type: 'select-day', dayId: 'day1', previousWeights }, TEST_PROGRAMS);
}

describe('Workout Tracker engine', () => {
  it('creates the expected initial state', () => {
    const state = createInitialState();
    expect(state.phase).toBe('select-program');
    expect(state.programId).toBeNull();
    expect(state.dayId).toBeNull();
    expect(state.blocks).toEqual([]);
    expect(state.currentBlockIndex).toBe(0);
  });

  it('selecting a program moves to select-day and resets prior selections', () => {
    const state = reduceSessionState(createInitialState(), { type: 'select-program', programId: 'test-program' }, TEST_PROGRAMS);
    expect(state.phase).toBe('select-day');
    expect(state.programId).toBe('test-program');
    expect(state.dayId).toBeNull();
    expect(state.blocks).toEqual([]);
  });

  it('selecting a day builds blocks at index 0, unstarted, with zeroed rounds', () => {
    const state = selectDay();
    expect(state.phase).toBe('block');
    expect(state.dayId).toBe('day1');
    expect(state.currentBlockIndex).toBe(0);
    expect(state.blocks).toEqual([
      {
        id: 'day1-block1',
        label: 'First block',
        started: false,
        activities: [
          { name: 'Squat', noWeight: undefined, weight: '', roundsCompleted: 0 },
          { name: 'Press', noWeight: undefined, weight: '', roundsCompleted: 0 },
        ],
      },
      {
        id: 'day1-block2',
        label: 'Second Block',
        started: false,
        activities: [{ name: 'Plank', noWeight: true, weight: '', roundsCompleted: 0 }],
      },
    ]);
  });

  it('selecting a day pre-fills weight from previousWeights, keyed by exercise name', () => {
    const state = selectDay({ Squat: '135', Row: '50' });
    expect(state.blocks[0].activities[0].weight).toBe('135');
    expect(state.blocks[0].activities[1].weight).toBe('');
    expect(state.blocks[1].activities[0].weight).toBe('');
  });

  it('set-weight only touches the addressed activity and works before or after starting', () => {
    const state = selectDay();
    const next = reduceSessionState(state, { type: 'set-weight', blockIndex: 0, activityIndex: 1, value: '25' }, TEST_PROGRAMS);
    expect(next.blocks[0].activities[0].weight).toBe('');
    expect(next.blocks[0].activities[1].weight).toBe('25');
    expect(next.blocks[1].activities[0].weight).toBe('');

    const started = reduceSessionState(next, { type: 'start-block' }, TEST_PROGRAMS);
    const editedAfterStart = reduceSessionState(started, { type: 'set-weight', blockIndex: 0, activityIndex: 1, value: '30' }, TEST_PROGRAMS);
    expect(editedAfterStart.blocks[0].activities[1].weight).toBe('30');
  });

  it('start-block only flips the current block\'s started flag', () => {
    const state = selectDay();
    const started = reduceSessionState(state, { type: 'start-block' }, TEST_PROGRAMS);
    expect(started.blocks[0].started).toBe(true);
    expect(started.blocks[1].started).toBe(false);
  });

  it('increment-round and decrement-round are no-ops on a block that has not started', () => {
    const state = selectDay();
    const attempted = reduceSessionState(state, { type: 'increment-round', blockIndex: 0, activityIndex: 0 }, TEST_PROGRAMS);
    expect(attempted).toBe(state);
  });

  it('increment-round and decrement-round only affect the addressed activity once started, and clamp at 0', () => {
    const started = reduceSessionState(selectDay(), { type: 'start-block' }, TEST_PROGRAMS);

    const afterIncrements = [1, 2, 3].reduce(
      (s) => reduceSessionState(s, { type: 'increment-round', blockIndex: 0, activityIndex: 0 }, TEST_PROGRAMS),
      started,
    );
    expect(afterIncrements.blocks[0].activities[0].roundsCompleted).toBe(3);
    expect(afterIncrements.blocks[0].activities[1].roundsCompleted).toBe(0);

    const afterDecrement = reduceSessionState(afterIncrements, { type: 'decrement-round', blockIndex: 0, activityIndex: 0 }, TEST_PROGRAMS);
    expect(afterDecrement.blocks[0].activities[0].roundsCompleted).toBe(2);

    const flooredAtZero = [1, 2].reduce(
      (s) => reduceSessionState(s, { type: 'decrement-round', blockIndex: 0, activityIndex: 1 }, TEST_PROGRAMS),
      started,
    );
    expect(flooredAtZero.blocks[0].activities[1].roundsCompleted).toBe(0);
  });

  it('next-block and prev-block move currentBlockIndex and clamp at the day\'s bounds', () => {
    const state = selectDay();
    expect(state.currentBlockIndex).toBe(0);

    const atFirstNoBack = reduceSessionState(state, { type: 'prev-block' }, TEST_PROGRAMS);
    expect(atFirstNoBack.currentBlockIndex).toBe(0);

    const advanced = reduceSessionState(state, { type: 'next-block' }, TEST_PROGRAMS);
    expect(advanced.currentBlockIndex).toBe(1);

    const clampedAtLast = reduceSessionState(advanced, { type: 'next-block' }, TEST_PROGRAMS);
    expect(clampedAtLast.currentBlockIndex).toBe(1);

    const back = reduceSessionState(clampedAtLast, { type: 'prev-block' }, TEST_PROGRAMS);
    expect(back.currentBlockIndex).toBe(0);
  });

  it('next-block/prev-block preserve each block\'s own progress independent of navigation', () => {
    const started = reduceSessionState(selectDay(), { type: 'start-block' }, TEST_PROGRAMS);
    const progressed = reduceSessionState(started, { type: 'increment-round', blockIndex: 0, activityIndex: 0 }, TEST_PROGRAMS);

    const onBlock2 = reduceSessionState(progressed, { type: 'next-block' }, TEST_PROGRAMS);
    expect(onBlock2.blocks[1].started).toBe(false);

    const backOnBlock1 = reduceSessionState(onBlock2, { type: 'prev-block' }, TEST_PROGRAMS);
    expect(backOnBlock1.blocks[0].started).toBe(true);
    expect(backOnBlock1.blocks[0].activities[0].roundsCompleted).toBe(1);
  });

  it('finish-day moves to summary from block regardless of currentBlockIndex', () => {
    const state = selectDay();
    const onBlock2 = reduceSessionState(state, { type: 'next-block' }, TEST_PROGRAMS);
    const summary = reduceSessionState(onBlock2, { type: 'finish-day' }, TEST_PROGRAMS);
    expect(summary.phase).toBe('summary');

    const initial = createInitialState();
    const noop = reduceSessionState(initial, { type: 'finish-day' }, TEST_PROGRAMS);
    expect(noop).toBe(initial);
  });

  it('restart-day keeps programId and returns to select-day with cleared blocks', () => {
    const started = reduceSessionState(selectDay(), { type: 'start-block' }, TEST_PROGRAMS);
    const progressed = reduceSessionState(started, { type: 'increment-round', blockIndex: 0, activityIndex: 0 }, TEST_PROGRAMS);

    const restarted = reduceSessionState(progressed, { type: 'restart-day' }, TEST_PROGRAMS);
    expect(restarted.phase).toBe('select-day');
    expect(restarted.programId).toBe('test-program');
    expect(restarted.dayId).toBeNull();
    expect(restarted.blocks).toEqual([]);
  });

  it('restart-program returns to the exact initial state', () => {
    const started = reduceSessionState(selectDay(), { type: 'start-block' }, TEST_PROGRAMS);
    const restarted = reduceSessionState(started, { type: 'restart-program' }, TEST_PROGRAMS);
    expect(restarted).toEqual(createInitialState());
  });

  it('does not mutate the input state', () => {
    const state = selectDay();
    const snapshot = JSON.parse(JSON.stringify(state));
    reduceSessionState(state, { type: 'set-weight', blockIndex: 0, activityIndex: 0, value: '25' }, TEST_PROGRAMS);
    expect(state).toEqual(snapshot);
  });
});
