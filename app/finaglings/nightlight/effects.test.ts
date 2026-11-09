import { describe, expect, it } from 'vitest';
import {
  FIRE_MAX,
  FIRE_PALETTE,
  GHOST_FIRE_PALETTE,
  TOXIC_FIRE_PALETTE,
  createFire,
  metaballColor,
  metaballs,
  plasmaColor,
  plasmaValue,
  ringSources,
  ringsColor,
  stepFire,
  tunnelColor,
  tunnelLookup,
} from './effects';
import { EFFECTS } from './renderers';

const brightness = ([r, g, b]: readonly number[]) => r + g + b;

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

describe('fire palette variants', () => {
  it('keep the black-to-white ramp with a different hue in the middle', () => {
    for (const p of [GHOST_FIRE_PALETTE, TOXIC_FIRE_PALETTE]) {
      expect(p).toHaveLength(FIRE_PALETTE.length);
      expect(p[0]).toEqual([0, 0, 0]);
      expect(p[FIRE_MAX]).toEqual([255, 255, 255]);
    }
    const [, , ghostBlue] = GHOST_FIRE_PALETTE[12];
    const [, toxicGreen] = TOXIC_FIRE_PALETTE[12];
    expect(ghostBlue).toBe(FIRE_PALETTE[12][0]);
    expect(toxicGreen).toBe(FIRE_PALETTE[12][0]);
  });
});

describe('tunnel', () => {
  it('is deepest at the center and wraps the angle into [0, 1)', () => {
    const { angle, depth } = tunnelLookup(21, 11);
    const center = 5 * 21 + 10;
    expect(depth[center]).toBe(Math.max(...depth));
    for (const a of angle) {
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(1);
    }
  });

  it('is bright on the walls and fades toward the far center', () => {
    let walls = 0, far = 0;
    for (let t = 0; t < 10; t += 0.5) {
      walls += brightness(tunnelColor(0.3, 1, t));
      far += brightness(tunnelColor(0.3, 200, t));
    }
    expect(walls / 20).toBeGreaterThan(300);
    expect(far).toBeLessThan(walls / 10);
  });
});

describe('metaballs', () => {
  it('stay inside the field', () => {
    for (let t = 0; t < 100; t += 1.3) {
      for (const b of metaballs(t, 0.5, 1)) {
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.x).toBeLessThanOrEqual(0.5);
        expect(b.y).toBeGreaterThanOrEqual(0);
        expect(b.y).toBeLessThanOrEqual(1);
      }
    }
  });

  it('glow brighter at a ball than far away, and never go black', () => {
    const balls = [{ x: 0.2, y: 0.2, r: 0.1, color: [255, 0, 0] as const }];
    const at = metaballColor(0.2, 0.2, balls);
    const away = metaballColor(0.9, 0.9, balls);
    expect(brightness(at)).toBeGreaterThan(brightness(away));
    expect(at[1]).toBeGreaterThan(0); // core whitens
    expect(away[0]).toBeGreaterThan(50);
  });
});

describe('rings', () => {
  it('blend between two bright complementary colors', () => {
    const sources = ringSources(3, 1, 0.5);
    for (let x = 0; x < 1; x += 0.07) {
      const c = ringsColor(x, 0.25, sources, 3);
      for (const ch of c) {
        expect(ch).toBeGreaterThanOrEqual(0);
        expect(ch).toBeLessThanOrEqual(255);
      }
      expect(brightness(c)).toBeGreaterThan(250);
    }
  });
});

describe('renderers', () => {
  it.each(EFFECTS.map(e => [e.name, e] as const))('%s fills every pixel opaquely', (_, effect) => {
    const r = effect.create();
    const { cols, rows } = r.size(390, 844);
    expect(cols).toBeGreaterThan(0);
    expect(rows).toBeGreaterThan(cols);
    r.init(cols, rows);
    const px = new Uint8ClampedArray(cols * rows * 4);
    for (let i = 0; i < 5; i++) r.draw(px, cols, rows, 1 / 30);
    for (let i = 3; i < px.length; i += 4) expect(px[i]).toBe(255);
  });
});
