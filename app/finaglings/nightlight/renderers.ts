// Frame renderers for each Nightlight pattern. Each one paints RGBA pixels into
// a small buffer that the page stretches to fill the screen.

import {
  FIRE_PALETTE, GHOST_FIRE_PALETTE, TOXIC_FIRE_PALETTE, type RGB,
  createFire, metaballColor, metaballs, plasmaColor, plasmaValue,
  ringSources, ringsColor, stepFire, tunnelColor, tunnelLookup,
} from './effects';

export type CanvasRenderer = {
  /** Grid size for a viewport of the given CSS pixel size. */
  size: (w: number, h: number) => { cols: number; rows: number };
  /** Called whenever the grid is (re)created. */
  init: (cols: number, rows: number) => void;
  /** Advance by `dt` seconds (already scaled by speed) and paint into `px`. */
  draw: (px: Uint8ClampedArray, cols: number, rows: number, dt: number) => void;
};

export type Effect = {
  name: string;
  /** Chunky pixels (fire) vs. smooth upscaling (everything else). */
  pixelated: boolean;
  create: () => CanvasRenderer;
};

/** Grid with the long side at `longSide` cells, keeping the screen's aspect. */
function scaledGrid(w: number, h: number, longSide: number) {
  const scale = longSide / Math.max(w, h, 1);
  return { cols: Math.max(1, Math.round(w * scale)), rows: Math.max(1, Math.round(h * scale)) };
}

function put(px: Uint8ClampedArray, o: number, [r, g, b]: RGB) {
  px[o] = r; px[o + 1] = g; px[o + 2] = b; px[o + 3] = 255;
}

/** Calls `color(x, y)` per pixel with coordinates where the long side is 1. */
function paintField(
  px: Uint8ClampedArray, cols: number, rows: number,
  color: (x: number, y: number) => RGB,
) {
  const unit = 1 / Math.max(cols, rows);
  let o = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++, o += 4) put(px, o, color((x + 0.5) * unit, (y + 0.5) * unit));
  }
}

const FIRE_ROWS = 100;
const FIRE_STEPS_PER_SEC = 30;

function fire(palette: readonly RGB[]): () => CanvasRenderer {
  return () => {
    let buf: Uint8Array = new Uint8Array(0);
    let acc = 0;
    return {
      size: (w, h) => ({
        cols: Math.max(40, Math.min(320, Math.round((FIRE_ROWS * w) / Math.max(h, 1)))),
        rows: FIRE_ROWS,
      }),
      init: (cols, rows) => { buf = createFire(cols, rows); acc = 0; },
      draw: (px, cols, rows, dt) => {
        acc += dt * FIRE_STEPS_PER_SEC;
        const steps = Math.min(4, Math.floor(acc));
        acc -= Math.floor(acc);
        for (let s = 0; s < steps; s++) stepFire(buf, cols, rows);
        for (let i = 0; i < buf.length; i++) put(px, i * 4, palette[buf[i]]);
      },
    };
  };
}

function plasma(): CanvasRenderer {
  let t = Math.random() * 100;
  return {
    size: (w, h) => scaledGrid(w, h, 160),
    init: () => {},
    draw: (px, cols, rows, dt) => {
      t += dt * 0.6;
      paintField(px, cols, rows, (x, y) => plasmaColor(plasmaValue(x * 8, y * 8, t), t * 0.08));
    },
  };
}

function tunnel(): CanvasRenderer {
  let t = Math.random() * 100;
  let lut = tunnelLookup(0, 0);
  return {
    size: (w, h) => scaledGrid(w, h, 200),
    init: (cols, rows) => { lut = tunnelLookup(cols, rows); },
    draw: (px, cols, rows, dt) => {
      t += dt;
      for (let i = 0; i < lut.angle.length; i++) put(px, i * 4, tunnelColor(lut.angle[i], lut.depth[i], t));
    },
  };
}

function blobs(): CanvasRenderer {
  let t = Math.random() * 100;
  return {
    size: (w, h) => scaledGrid(w, h, 180),
    init: () => {},
    draw: (px, cols, rows, dt) => {
      t += dt;
      const long = Math.max(cols, rows);
      const balls = metaballs(t, cols / long, rows / long);
      paintField(px, cols, rows, (x, y) => metaballColor(x, y, balls));
    },
  };
}

function rings(): CanvasRenderer {
  let t = Math.random() * 100;
  return {
    size: (w, h) => scaledGrid(w, h, 260),
    init: () => {},
    draw: (px, cols, rows, dt) => {
      t += dt;
      const long = Math.max(cols, rows);
      const sources = ringSources(t, cols / long, rows / long);
      paintField(px, cols, rows, (x, y) => ringsColor(x, y, sources, t));
    },
  };
}

export const EFFECTS: readonly Effect[] = [
  { name: 'Plasma', pixelated: false, create: plasma },
  { name: 'Tunnel', pixelated: false, create: tunnel },
  { name: 'Metaballs', pixelated: false, create: blobs },
  { name: 'Rings', pixelated: false, create: rings },
  { name: 'Fire', pixelated: true, create: fire(FIRE_PALETTE) },
  { name: 'Ghost Fire', pixelated: true, create: fire(GHOST_FIRE_PALETTE) },
  { name: 'Toxic Fire', pixelated: true, create: fire(TOXIC_FIRE_PALETTE) },
];
