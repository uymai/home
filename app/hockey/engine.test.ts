import { describe, expect, it } from 'vitest';
import {
  ACTIVE_CHARACTER_ID,
  CORNER_CUTOUT_SIZE,
  DIRECTIONS,
  RINK_COLS,
  RINK_ROWS,
  ROSTER,
  createInitialState,
  directionDelta,
  generateSeed,
  hashSeed,
  isBlueLine,
  isCenterLine,
  isCrease,
  isPlayableCell,
  nextRandom,
  reduceGameState,
  rollDie,
} from './engine';
import { GameState } from './types';

describe('rink geometry', () => {
  it('marks interior cells as playable', () => {
    expect(isPlayableCell(6, 3)).toBe(true);
    expect(isPlayableCell(2, 3)).toBe(true);
    expect(isPlayableCell(6, 0)).toBe(true);
  });

  it('marks out-of-bounds cells as not playable', () => {
    expect(isPlayableCell(-1, 3)).toBe(false);
    expect(isPlayableCell(RINK_COLS, 3)).toBe(false);
    expect(isPlayableCell(3, -1)).toBe(false);
    expect(isPlayableCell(3, RINK_ROWS)).toBe(false);
  });

  it('marks exactly the 4 corner cutout blocks as not playable', () => {
    const corners: Array<[number, number]> = [];
    for (let dc = 0; dc < CORNER_CUTOUT_SIZE; dc += 1) {
      for (let dr = 0; dr < CORNER_CUTOUT_SIZE; dr += 1) {
        corners.push([dc, dr]);
        corners.push([RINK_COLS - 1 - dc, dr]);
        corners.push([dc, RINK_ROWS - 1 - dr]);
        corners.push([RINK_COLS - 1 - dc, RINK_ROWS - 1 - dr]);
      }
    }
    for (const [col, row] of corners) {
      expect(isPlayableCell(col, row)).toBe(false);
    }
  });

  it('is correct at the cutout boundary (off-by-one)', () => {
    // Immediately outside the top-left cutout block should be playable.
    expect(isPlayableCell(CORNER_CUTOUT_SIZE, 0)).toBe(true);
    expect(isPlayableCell(0, CORNER_CUTOUT_SIZE)).toBe(true);
  });

  it('keeps the center cell playable', () => {
    const centerCol = Math.floor(RINK_COLS / 2);
    const centerRow = Math.floor(RINK_ROWS / 2);
    expect(isPlayableCell(centerCol, centerRow)).toBe(true);
  });

  it('keeps the corner cutout smaller than half the smaller rink dimension', () => {
    expect(CORNER_CUTOUT_SIZE).toBeLessThan(Math.min(RINK_COLS, RINK_ROWS) / 2);
  });

  it('identifies the center line at the middle column', () => {
    const centerCol = Math.floor(RINK_COLS / 2);
    expect(isCenterLine(centerCol)).toBe(true);
    expect(isCenterLine(centerCol - 1)).toBe(false);
    expect(isCenterLine(centerCol + 1)).toBe(false);
  });

  it('identifies exactly two blue lines, symmetric around center', () => {
    const blueCols = Array.from({ length: RINK_COLS }, (_, col) => col).filter(isBlueLine);
    expect(blueCols).toHaveLength(2);
    const centerCol = Math.floor(RINK_COLS / 2);
    expect(blueCols[0]).toBeLessThan(centerCol);
    expect(blueCols[1]).toBeGreaterThan(centerCol);
    expect(centerCol - blueCols[0]).toBe(blueCols[1] - centerCol);
  });

  it('identifies crease cells hugging each goal mouth, and only on playable ice', () => {
    const centerRow = Math.floor(RINK_ROWS / 2);
    expect(isCrease(0, centerRow)).toBe(true);
    expect(isCrease(RINK_COLS - 1, centerRow)).toBe(true);
    expect(isCrease(6, centerRow)).toBe(false);

    for (let col = 0; col < RINK_COLS; col += 1) {
      for (let row = 0; row < RINK_ROWS; row += 1) {
        if (isCrease(col, row)) {
          expect(isPlayableCell(col, row)).toBe(true);
        }
      }
    }
  });
});

describe('seeded PRNG', () => {
  it('hashSeed is deterministic for the same string', () => {
    expect(hashSeed('checks-and-creases')).toBe(hashSeed('checks-and-creases'));
    expect(hashSeed('a')).not.toBe(hashSeed('b'));
  });

  it('nextRandom is deterministic and produces a value in [0, 1)', () => {
    const a = nextRandom(12345);
    const b = nextRandom(12345);
    expect(a).toEqual(b);
    expect(a.value).toBeGreaterThanOrEqual(0);
    expect(a.value).toBeLessThan(1);
  });

  it('nextRandom advances state so consecutive calls differ', () => {
    const first = nextRandom(12345);
    const second = nextRandom(first.nextState);
    expect(second.nextState).not.toBe(first.nextState);
  });

  it('rollDie stays within [1, sides] for every supported die across many draws', () => {
    const dice: Array<6 | 8 | 12 | 20> = [6, 8, 12, 20];
    for (const sides of dice) {
      let rngState = hashSeed(`die-${sides}`);
      for (let i = 0; i < 500; i += 1) {
        const roll = rollDie(sides, rngState);
        expect(Number.isInteger(roll.value)).toBe(true);
        expect(roll.value).toBeGreaterThanOrEqual(1);
        expect(roll.value).toBeLessThanOrEqual(sides);
        rngState = roll.nextState;
      }
    }
  });

  it('rollDie produces an identical sequence for two independent runs from the same seed', () => {
    const rollSequence = (seed: string) => {
      let rngState = hashSeed(seed);
      const rolls: number[] = [];
      for (let i = 0; i < 20; i += 1) {
        const roll = rollDie(20, rngState);
        rolls.push(roll.value);
        rngState = roll.nextState;
      }
      return rolls;
    };
    expect(rollSequence('same-seed')).toEqual(rollSequence('same-seed'));
  });

  it('generateSeed returns a non-empty lowercase alphanumeric string', () => {
    const seed = generateSeed();
    expect(seed.length).toBeGreaterThan(0);
    expect(seed).toMatch(/^[a-z0-9]+$/);
  });
});

describe('directions', () => {
  it('has exactly 8 unique compass directions', () => {
    expect(DIRECTIONS).toHaveLength(8);
    expect(new Set(DIRECTIONS).size).toBe(8);
  });

  it('maps each direction to a unique unit-vector delta with no (0,0)', () => {
    const deltas = DIRECTIONS.map(directionDelta);
    for (const delta of deltas) {
      expect([-1, 0, 1]).toContain(delta.dc);
      expect([-1, 0, 1]).toContain(delta.dr);
      expect(delta.dc === 0 && delta.dr === 0).toBe(false);
    }
    const uniqueDeltas = new Set(deltas.map((d) => `${d.dc},${d.dr}`));
    expect(uniqueDeltas.size).toBe(8);
  });
});

describe('roster', () => {
  it('has unique character ids', () => {
    const ids = ROSTER.map((character) => character.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has exactly one d20 character, and it is the active on-ice character', () => {
    const d20Characters = ROSTER.filter((character) => character.dieSides === 20);
    expect(d20Characters).toHaveLength(1);
    expect(d20Characters[0].id).toBe(ACTIVE_CHARACTER_ID);
  });

  it('includes distinct dice across the roster', () => {
    const dieSides = ROSTER.map((character) => character.dieSides);
    expect(new Set(dieSides).size).toBe(dieSides.length);
  });
});

describe('createInitialState', () => {
  it('starts the active character at the exact center of the rink', () => {
    const state = createInitialState('a-seed');
    const centerCol = Math.floor(RINK_COLS / 2);
    const centerRow = Math.floor(RINK_ROWS / 2);
    expect(state.position).toEqual({ col: centerCol, row: centerRow });
    expect(state.character.id).toBe(ACTIVE_CHARACTER_ID);
    expect(isPlayableCell(state.position.col, state.position.row)).toBe(true);
  });

  it('starts with zero remaining points and a non-empty log', () => {
    const state = createInitialState('a-seed');
    expect(state.remainingPoints).toBe(0);
    expect(state.skates).toBe(0);
    expect(state.checks).toBe(0);
    expect(state.lastRoll).toBeNull();
    expect(state.lastStep).toBeNull();
    expect(state.log.length).toBeGreaterThan(0);
  });

  it('derives rngState deterministically from the given seed', () => {
    const state = createInitialState('a-seed');
    expect(state.seed).toBe('a-seed');
    expect(state.rngState).toBe(hashSeed('a-seed'));
  });

  it('generates its own seed when none is provided', () => {
    const state = createInitialState();
    expect(state.seed).toMatch(/^[a-z0-9]+$/);
    expect(state.rngState).toBe(hashSeed(state.seed));
  });
});

describe('reduceGameState: roll', () => {
  it('rolls the active character die and sets remainingPoints to the result', () => {
    const state = createInitialState('roll-seed');
    const next = reduceGameState(state, { type: 'roll' });
    expect(next.remainingPoints).toBeGreaterThanOrEqual(1);
    expect(next.remainingPoints).toBeLessThanOrEqual(state.character.dieSides);
    expect(next.lastRoll).toBe(next.remainingPoints);
    expect(next.skates).toBe(state.skates + 1);
    expect(next.log.length).toBeGreaterThan(state.log.length);
  });

  it('no-ops if a skate is already in progress', () => {
    const state = createInitialState('roll-seed');
    const midSkate = reduceGameState(state, { type: 'roll' });
    const again = reduceGameState(midSkate, { type: 'roll' });
    expect(again).toBe(midSkate);
  });
});

describe('reduceGameState: step', () => {
  it('moves the character 1 cell and spends 1 point on a playable target', () => {
    const state = createInitialState('step-seed');
    const midSkate = reduceGameState(state, { type: 'roll' });
    const next = reduceGameState(midSkate, { type: 'step', direction: 'N' });
    expect(next.position).toEqual({ col: state.position.col, row: state.position.row - 1 });
    expect(next.remainingPoints).toBe(midSkate.remainingPoints - 1);
    expect(next.lastStep).toEqual({
      direction: 'N',
      from: state.position,
      to: next.position,
      blocked: false,
    });
    expect(next.log.at(-1)).toMatch(/skated/i);
  });

  it('spends the point but leaves position unchanged when the target is not playable', () => {
    const boardsAdjacent: GameState = {
      ...createInitialState('boards-seed'),
      position: { col: 2, row: 0 },
      remainingPoints: 3,
    };
    const next = reduceGameState(boardsAdjacent, { type: 'step', direction: 'W' });
    expect(next.position).toEqual({ col: 2, row: 0 });
    expect(next.remainingPoints).toBe(2);
    expect(next.lastStep).toEqual({
      direction: 'W',
      from: { col: 2, row: 0 },
      to: { col: 2, row: 0 },
      blocked: true,
    });
    expect(next.log.at(-1)).toMatch(/boards/i);
  });

  it('no-ops if there are no points left to spend', () => {
    const state = createInitialState('step-seed');
    const again = reduceGameState(state, { type: 'step', direction: 'N' });
    expect(again).toBe(state);
  });
});

describe('reduceGameState: end-skate', () => {
  it('discards remaining points and logs how many were unused', () => {
    const midSkate: GameState = { ...createInitialState('end-seed'), remainingPoints: 4 };
    const next = reduceGameState(midSkate, { type: 'end-skate' });
    expect(next.remainingPoints).toBe(0);
    expect(next.log.at(-1)).toMatch(/4/);
  });

  it('no-ops if there are no points to discard', () => {
    const state = createInitialState('end-seed');
    const again = reduceGameState(state, { type: 'end-skate' });
    expect(again).toBe(state);
  });
});

describe('reduceGameState: full-turn sequencing', () => {
  it('reaches exactly 0 remaining points after spending every rolled point, then ignores further steps', () => {
    let state = createInitialState('sequence-seed');
    state = reduceGameState(state, { type: 'roll' });
    const points = state.remainingPoints;
    for (let i = 0; i < points; i += 1) {
      state = reduceGameState(state, { type: 'step', direction: 'E' });
    }
    expect(state.remainingPoints).toBe(0);
    const beforeExtraStep = state;
    state = reduceGameState(state, { type: 'step', direction: 'E' });
    expect(state).toBe(beforeExtraStep);
  });

  it('never lets the character leave a playable cell across many roll/step cycles', () => {
    let state = createInitialState('property-seed');
    let directionIndex = 0;
    for (let cycle = 0; cycle < 40; cycle += 1) {
      state = reduceGameState(state, { type: 'roll' });
      while (state.remainingPoints > 0) {
        const direction = DIRECTIONS[directionIndex % DIRECTIONS.length];
        directionIndex += 1;
        state = reduceGameState(state, { type: 'step', direction });
        expect(isPlayableCell(state.position.col, state.position.row)).toBe(true);
      }
    }
    expect(state.skates).toBe(40);
  });
});

describe('reduceGameState: new-game', () => {
  it('resets to center ice with zero points and a fresh log', () => {
    let state = createInitialState('reset-seed');
    state = reduceGameState(state, { type: 'roll' });
    state = reduceGameState(state, { type: 'step', direction: 'N' });
    const reset = reduceGameState(state, { type: 'new-game', seed: 'reset-seed' });
    expect(reset.position).toEqual(createInitialState('reset-seed').position);
    expect(reset.remainingPoints).toBe(0);
    expect(reset.seed).toBe('reset-seed');
    expect(reset.log).toEqual(createInitialState('reset-seed').log);
  });

  it('generates a fresh seed when none is given', () => {
    const state = createInitialState('reset-seed');
    const reset = reduceGameState(state, { type: 'new-game' });
    expect(reset.seed).toMatch(/^[a-z0-9]+$/);
  });
});

describe('cross-run determinism', () => {
  it('replaying the same action sequence on two independent states yields identical final state', () => {
    const runScript = (seed: string): GameState => {
      let state = createInitialState(seed);
      for (let cycle = 0; cycle < 10; cycle += 1) {
        state = reduceGameState(state, { type: 'roll' });
        let directionIndex = 0;
        while (state.remainingPoints > 1) {
          const direction = DIRECTIONS[directionIndex % DIRECTIONS.length];
          directionIndex += 1;
          state = reduceGameState(state, { type: 'step', direction });
        }
        state = reduceGameState(state, { type: 'end-skate' });
      }
      return state;
    };

    expect(runScript('deterministic-seed')).toEqual(runScript('deterministic-seed'));
  });
});
