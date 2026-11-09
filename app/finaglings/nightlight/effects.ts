// Pixel effects for the Nightlight canvas patterns. Kept free of DOM/React so
// they can be unit tested.

export type RGB = readonly [number, number, number];

// The classic 37-step fire palette: black → deep red → orange → yellow → white.
const FIRE_HEX = [
  0x000000, 0x1f0707, 0x2f0f07, 0x470f07, 0x571707, 0x671f07, 0x771f07, 0x8f2707,
  0x9f2f07, 0xaf3f07, 0xbf4707, 0xc74707, 0xdf4f07, 0xdf5707, 0xdf5707, 0xd75f07,
  0xd75f07, 0xd7670f, 0xcf6f0f, 0xcf770f, 0xcf7f0f, 0xcf8717, 0xc78717, 0xc78f17,
  0xc7971f, 0xbf9f1f, 0xbf9f1f, 0xbfa727, 0xbfa727, 0xbfaf2f, 0xb7af2f, 0xb7b72f,
  0xb7b737, 0xcfcf6f, 0xdfdf9f, 0xefefc7, 0xffffff,
];

export const FIRE_PALETTE: readonly RGB[] = FIRE_HEX.map(
  h => [(h >> 16) & 0xff, (h >> 8) & 0xff, h & 0xff] as const,
);

export const FIRE_MAX = FIRE_PALETTE.length - 1;

/** A fire buffer with the bottom row lit at full heat. */
export function createFire(width: number, height: number): Uint8Array {
  const fire = new Uint8Array(width * height);
  fire.fill(FIRE_MAX, (height - 1) * width);
  return fire;
}

/**
 * Advance the fire one step: every pixel copies the heat of the pixel below it,
 * minus a little random decay, with a small random sideways drift.
 */
export function stepFire(
  fire: Uint8Array,
  width: number,
  height: number,
  rand: () => number = Math.random,
): void {
  for (let x = 0; x < width; x++) {
    for (let y = 1; y < height; y++) {
      const src = y * width + x;
      const heat = fire[src];
      if (heat === 0) {
        fire[src - width] = 0;
        continue;
      }
      const r = Math.floor(rand() * 4) & 3;
      let dstX = x - r + 1;
      if (dstX < 0) dstX += width;
      else if (dstX >= width) dstX -= width;
      fire[(y - 1) * width + dstX] = Math.max(0, heat - (r & 1));
    }
  }
}

/**
 * Classic sine plasma field. `x` and `y` are in "plasma units" (about 0–8
 * across the screen), `t` is time in seconds. Returns a value in [0, 1].
 */
export function plasmaValue(x: number, y: number, t: number): number {
  const cx = x - 4 + 2.5 * Math.sin(t * 0.37);
  const cy = y - 4 + 2.5 * Math.cos(t * 0.29);
  const v =
    Math.sin(x * 1.1 + t) +
    Math.sin((y * 0.9 + t * 0.8) * 1.2) +
    Math.sin((x + y) * 0.7 + t * 0.6) +
    Math.sin(Math.sqrt(cx * cx + cy * cy) * 1.4 - t * 1.3);
  return (v + 4) / 8;
}

/**
 * Map a plasma value + hue shift to a vivid color. The three channels are sine
 * waves 120° apart, so the total brightness never dips toward black.
 */
export function plasmaColor(v: number, shift: number): RGB {
  const a = (v + shift) * Math.PI * 2;
  return [
    Math.round(127.5 + 127.5 * Math.sin(a)),
    Math.round(127.5 + 127.5 * Math.sin(a + (2 * Math.PI) / 3)),
    Math.round(127.5 + 127.5 * Math.sin(a + (4 * Math.PI) / 3)),
  ];
}

// ── Fire palette variants (channel swaps of the classic palette) ──────────

/** Violet → magenta → white. */
export const GHOST_FIRE_PALETTE: readonly RGB[] = FIRE_PALETTE.map(([r, g, b]) => [g, b, r] as const);

/** Green → lime → yellow → white. */
export const TOXIC_FIRE_PALETTE: readonly RGB[] = FIRE_PALETTE.map(([r, g, b]) => [g, r, b] as const);

// ── Tunnel ────────────────────────────────────────────────────────────────

/**
 * Per-pixel lookup tables for the tunnel: `angle` around the center in [0, 1)
 * and `depth` (inverse distance from the center, so it grows toward the middle).
 */
export function tunnelLookup(cols: number, rows: number): { angle: Float32Array; depth: Float32Array } {
  const angle = new Float32Array(cols * rows);
  const depth = new Float32Array(cols * rows);
  const scale = Math.max(cols, rows);
  let i = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const dx = (x + 0.5 - cols / 2) / scale;
      const dy = (y + 0.5 - rows / 2) / scale;
      angle[i] = Math.atan2(dy, dx) / (2 * Math.PI) + 0.5;
      depth[i] = 0.3 / Math.max(Math.sqrt(dx * dx + dy * dy), 1e-3);
      i++;
    }
  }
  return { angle, depth };
}

/** Color of a tunnel wall point at time `t` (seconds). */
export function tunnelColor(angle: number, depth: number, t: number): RGB {
  const u = angle + t * 0.04; // slow twist
  const v = depth * 3 + t * 2; // fly forward
  const k = 0.5 + 0.5 * Math.sin(u * Math.PI * 16) * Math.sin(v * Math.PI);
  const [r, g, b] = plasmaColor(v * 0.03 + k * 0.2, t * 0.03);
  // Only the far-away center fades out; the walls stay full brightness.
  const shade = Math.min(1, 4 / depth) * (0.65 + 0.35 * k);
  return [Math.round(r * shade), Math.round(g * shade), Math.round(b * shade)];
}

// ── Metaballs ─────────────────────────────────────────────────────────────

export type Ball = { x: number; y: number; r: number; color: RGB };

const BALL_COLORS: readonly RGB[] = [
  [255, 47, 208], [0, 229, 255], [255, 212, 0], [255, 106, 0], [77, 255, 77],
];

/**
 * Ball positions at time `t` in a field `w` × `h` (long side = 1), each on its
 * own Lissajous path.
 */
export function metaballs(t: number, w: number, h: number): Ball[] {
  return BALL_COLORS.map((color, i) => ({
    x: w * (0.5 + 0.38 * Math.sin(t * (0.31 + i * 0.07) + i * 1.7)),
    y: h * (0.5 + 0.38 * Math.sin(t * (0.23 + i * 0.05) + i * 2.9)),
    r: 0.11 + 0.03 * Math.sin(t * 0.5 + i),
    color,
  }));
}

/**
 * Color at point (x, y): the nearest ball's color dominates (blending where
 * they meet), blobs have a soft bright edge, and cores glow white.
 */
export function metaballColor(x: number, y: number, balls: readonly Ball[]): RGB {
  let field = 0, r = 0, g = 0, b = 0, total = 0;
  for (const ball of balls) {
    const dx = x - ball.x, dy = y - ball.y;
    const w = (ball.r * ball.r) / (dx * dx + dy * dy + 1e-6);
    field += w;
    const cw = w * w; // sharper color weighting avoids a muddy average
    total += cw;
    r += cw * ball.color[0];
    g += cw * ball.color[1];
    b += cw * ball.color[2];
  }
  r /= total; g /= total; b /= total;
  const edge = Math.min(1, Math.max(0, (field - 0.6) / 0.4));
  const intensity = 0.35 + 0.65 * edge * edge * (3 - 2 * edge);
  const white = Math.min(0.6, Math.max(0, (field - 1) / 3));
  const mix = (c: number) => Math.round((c * (1 - white) + 255 * white) * intensity);
  return [mix(r), mix(g), mix(b)];
}

// ── Interference rings ────────────────────────────────────────────────────

const RINGS_PER_UNIT = 24;

/** Two drifting ring sources at time `t` in a field `w` × `h`. */
export function ringSources(t: number, w: number, h: number): [number, number][] {
  return [
    [w * (0.5 + 0.3 * Math.sin(t * 0.21)), h * (0.5 + 0.3 * Math.cos(t * 0.17))],
    [w * (0.5 + 0.3 * Math.cos(t * 0.13 + 1)), h * (0.5 + 0.3 * Math.sin(t * 0.19 + 2))],
  ];
}

/**
 * Overlapping ring sets: where the rings agree you get one color, where they
 * disagree its complement — the classic moiré look. Edges are softened.
 */
export function ringsColor(x: number, y: number, sources: readonly [number, number][], t: number): RGB {
  let s = 1;
  sources.forEach(([sx, sy], i) => {
    const d = Math.sqrt((x - sx) ** 2 + (y - sy) ** 2);
    s *= Math.sin(Math.PI * (d * RINGS_PER_UNIT - t * (2 + i * 0.5)));
  });
  const m = 0.5 + 0.5 * Math.max(-1, Math.min(1, s * 3));
  const hue = t * 0.03;
  const a = plasmaColor(0, hue);
  const b = plasmaColor(0.45, hue);
  return [
    Math.round(a[0] * m + b[0] * (1 - m)),
    Math.round(a[1] * m + b[1] * (1 - m)),
    Math.round(a[2] * m + b[2] * (1 - m)),
  ];
}
