import { describe, expect, it } from 'vitest';
import {
  FIRE_MAX,
  FIRE_PALETTE,
  createFire,
  plasmaColor,
  plasmaValue,
  stepFire,
} from './effects';

describe('fire', () => {
  it('has a 37-step palette from black to white', () => {
    expect(FIRE_PALETTE).toHaveLength(37);
    expect(FIRE_PALETTE[0]).toEqual([0, 0, 0]);
    expect(FIRE_PALETTE[FIRE_MAX]).toEqual([255, 255, 255]);
  });

  it('starts with only the bottom row lit', () => {
    const fire = createFire(4, 3);
    expect(Array.from(fire)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, FIRE_MAX, FIRE_MAX, FIRE_MAX, FIRE_MAX]);
  });

  it('rises without decay when the random roll is even', () => {
    const fire = createFire(5, 4);
    // floor(0.5 * 4) = 2 → even: drifts one left (wrapping), no decay
    stepFire(fire, 5, 4, () => 0.5);
    for (let x = 0; x < 5; x++) expect(fire[2 * 5 + x]).toBe(FIRE_MAX);
  });

  it('decays by one when the random roll is odd', () => {
    const fire = createFire(5, 4);
    // floor(0.25 * 4) = 1 → odd: rises straight up, decays by one
    stepFire(fire, 5, 4, () => 0.25);
    for (let x = 0; x < 5; x++) expect(fire[2 * 5 + x]).toBe(FIRE_MAX - 1);
  });

  it('never goes negative and keeps the source row lit', () => {
    const w = 16, h = 60;
    const fire = createFire(w, h);
    for (let i = 0; i < 200; i++) stepFire(fire, w, h);
    for (const v of fire) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(FIRE_MAX);
    }
    for (let x = 0; x < w; x++) expect(fire[(h - 1) * w + x]).toBe(FIRE_MAX);
  });
});

describe('plasma', () => {
  it('stays within [0, 1]', () => {
    for (let x = 0; x <= 8; x += 0.37) {
      for (let y = 0; y <= 8; y += 0.41) {
        const v = plasmaValue(x, y, x * y);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('produces bright colors', () => {
    for (let v = 0; v <= 1; v += 0.01) {
      const [r, g, b] = plasmaColor(v, 0.3);
      // Channels 120° apart always sum to ~1.5 × 255
      expect(r + g + b).toBeGreaterThan(380);
      expect(Math.max(r, g, b)).toBeGreaterThan(190);
    }
  });
});
