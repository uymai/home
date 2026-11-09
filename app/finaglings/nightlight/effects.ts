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
