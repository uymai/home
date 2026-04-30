export type DotType = 'root' | 'note' | 'blue';

export type ScaleDot = {
  stringIdx: number;   // 0 = low E, 5 = high e
  fretOffset: number;  // offset from this position's start fret
  type: DotType;
};

export type ScalePosition = {
  label: string;
  startOffset: number; // startFret = ROOT_FRETS[key] + startOffset (may be negative, wraps +12)
  dots: ScaleDot[];
  windowSize: number;
};

export type Scale = {
  id: string;
  name: string;
  positions: ScalePosition[];
};

export const NOTE_NAMES = ['E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C', 'C#', 'D', 'D#'] as const;
export type NoteName = (typeof NOTE_NAMES)[number];

// Fret of root note on low E string (standard tuning)
export const ROOT_FRETS: Record<NoteName, number> = {
  E: 0, F: 1, 'F#': 2, G: 3, 'G#': 4,
  A: 5, 'A#': 6, B: 7, C: 8, 'C#': 9, D: 10, 'D#': 11,
};

const r = (s: number, f: number): ScaleDot => ({ stringIdx: s, fretOffset: f, type: 'root' });
const n = (s: number, f: number): ScaleDot => ({ stringIdx: s, fretOffset: f, type: 'note' });
const b = (s: number, f: number): ScaleDot => ({ stringIdx: s, fretOffset: f, type: 'blue' });

// Minor Pentatonic — 5 positions (verified for Am: A C D E G, standard tuning)
// Strings: 0=low E, 1=A, 2=D, 3=G, 4=B, 5=high e
const MINOR_PENTA_POSITIONS: ScalePosition[] = [
  {
    label: 'Position 1',
    startOffset: 0,   // Am: frets 5–8 (root on low E and high e)
    windowSize: 4,
    dots: [
      r(0, 0), n(0, 3),  // E6: A-root, C
      n(1, 0), n(1, 2),  // A5: D, E
      n(2, 0), r(2, 2),  // D4: G, A-root
      n(3, 0), n(3, 2),  // G3: C, D
      n(4, 0), n(4, 3),  // B3: E, G
      r(5, 0), n(5, 3),  // e1: A-root, C
    ],
  },
  {
    label: 'Position 2',
    startOffset: 2,   // Am: frets 7–10
    windowSize: 4,
    dots: [
      n(0, 1), n(0, 3),  // E6: C, D
      n(1, 0), n(1, 3),  // A5: E, G
      r(2, 0), n(2, 3),  // D4: A-root, C
      n(3, 0), n(3, 2),  // G3: D, E
      n(4, 1), r(4, 3),  // B3: G, A-root
      n(5, 1), n(5, 3),  // e1: C, D
    ],
  },
  {
    label: 'Position 3',
    startOffset: 4,   // Am: frets 9–13 (B string reaches offset 4)
    windowSize: 5,
    dots: [
      n(0, 1), n(0, 3),  // E6: D, E
      n(1, 1), r(1, 3),  // A5: G, A-root
      n(2, 1), n(2, 3),  // D4: C, D
      n(3, 0), n(3, 3),  // G3: E, G
      r(4, 1), n(4, 4),  // B3: A-root, C
      n(5, 1), n(5, 3),  // e1: D, E
    ],
  },
  {
    label: 'Position 4',
    startOffset: 7,   // Am: frets 12–15
    windowSize: 4,
    dots: [
      n(0, 0), n(0, 3),  // E6: E, G
      r(1, 0), n(1, 3),  // A5: A-root, C
      n(2, 0), n(2, 2),  // D4: D, E
      n(3, 0), r(3, 2),  // G3: G, A-root
      n(4, 1), n(4, 3),  // B3: C, D
      n(5, 0), n(5, 3),  // e1: E, G
    ],
  },
  {
    label: 'Position 5',
    startOffset: 9,   // Am: frets 14–17 (connects back to pos 1 +12)
    windowSize: 4,
    dots: [
      n(0, 1), r(0, 3),  // E6: G, A-root
      n(1, 1), n(1, 3),  // A5: C, D
      n(2, 0), n(2, 3),  // D4: E, G
      r(3, 0), n(3, 3),  // G3: A-root, C
      n(4, 1), n(4, 3),  // B3: D, E
      n(5, 1), r(5, 3),  // e1: G, A-root
    ],
  },
];

// Blues Scale = minor pentatonic + flat-5 (blue note, 6 semitones above root)
// Blue note additions per position (verified for Am, applies to all keys by transposition)
const BLUES_ADDITIONS: ScaleDot[][] = [
  [b(1, 1), b(3, 3)],          // Pos 1: A5 offset 1 (D#), G3 offset 3 (D#)
  [b(3, 1)],                   // Pos 2: G3 offset 1 (D#)
  [b(0, 2), b(2, 4), b(5, 2)], // Pos 3: E6 offset 2, D4 offset 4, e1 offset 2 (all D#)
  [b(2, 1)],                   // Pos 4: D4 offset 1 (D#)
  [b(4, 2)],                   // Pos 5: B3 offset 2 (D#)
];

const BLUES_POSITIONS: ScalePosition[] = MINOR_PENTA_POSITIONS.map((pos, i) => ({
  ...pos,
  dots: [...pos.dots, ...(BLUES_ADDITIONS[i] ?? [])],
}));

// Major Pentatonic — 5 positions (verified for A major penta: A B C# E F#)
// Position 1 startOffset=-1: for key E this wraps to fret 11 (octave-up position)
const MAJOR_PENTA_POSITIONS: ScalePosition[] = [
  {
    label: 'Position 1',
    startOffset: -1,  // Am: frets 4–7 (root on E/e at offset 1)
    windowSize: 4,
    dots: [
      r(0, 1), n(0, 3),  // E6: A-root, B
      n(1, 0), n(1, 3),  // A5: C#, E
      n(2, 0), r(2, 3),  // D4: F#, A-root
      n(3, 0), n(3, 2),  // G3: B, C#
      n(4, 1), n(4, 3),  // B3: E, F#
      r(5, 1), n(5, 3),  // e1: A-root, B
    ],
  },
  {
    label: 'Position 2',
    startOffset: 2,   // Am: frets 7–11
    windowSize: 5,
    dots: [
      n(0, 0), n(0, 2),  // E6: B, C#
      n(1, 0), n(1, 2),  // A5: E, F#
      r(2, 0), n(2, 2),  // D4: A-root, B
      n(3, 2), n(3, 4),  // G3: E, F# (shifted up due to B-string tuning)
      n(4, 0), r(4, 3),  // B3: F#, A-root
      n(5, 0), n(5, 2),  // e1: B, C#
    ],
  },
  {
    label: 'Position 3',
    startOffset: 4,   // Am: frets 9–12
    windowSize: 4,
    dots: [
      n(0, 0), n(0, 3),  // E6: C#, E
      n(1, 0), r(1, 3),  // A5: F#, A-root
      n(2, 0), n(2, 2),  // D4: B, C#
      n(3, 0), n(3, 2),  // G3: E, F#
      r(4, 1), n(4, 3),  // B3: A-root, B
      n(5, 0), n(5, 3),  // e1: C#, E
    ],
  },
  {
    label: 'Position 4',
    startOffset: 6,   // Am: frets 11–14
    windowSize: 4,
    dots: [
      n(0, 1), n(0, 3),  // E6: E, F#
      r(1, 1), n(1, 3),  // A5: A-root, B
      n(2, 0), n(2, 3),  // D4: C#, E
      n(3, 0), r(3, 3),  // G3: F#, A-root
      n(4, 1), n(4, 3),  // B3: B, C#
      n(5, 1), n(5, 3),  // e1: E, F#
    ],
  },
  {
    label: 'Position 5',
    startOffset: 9,   // Am: frets 14–17
    windowSize: 4,
    dots: [
      n(0, 0), r(0, 3),  // E6: F#, A-root
      n(1, 0), n(1, 2),  // A5: B, C#
      n(2, 0), n(2, 2),  // D4: E, F#
      r(3, 0), n(3, 2),  // G3: A-root, B
      n(4, 0), n(4, 3),  // B3: C#, E
      n(5, 0), r(5, 3),  // e1: F#, A-root
    ],
  },
];

// Open string pitches in semitones from low E=0 (standard tuning)
const OPEN_STRINGS_FROM_E = [0, 5, 10, 3, 7, 0] as const;

// Generates fretboard positions from a sorted scale interval array.
// Each scale degree becomes one position; the B-string 4-semitone gap is
// handled automatically via OPEN_STRINGS_FROM_E.
function generateScalePositions(intervals: number[]): ScalePosition[] {
  const intervalSet = new Set(intervals);
  return intervals.map((startInterval, posIdx) => {
    const dots: ScaleDot[] = [];
    let maxOffset = 0;
    for (let s = 0; s < 6; s++) {
      for (let o = 0; o <= 4; o++) {
        const ni = (OPEN_STRINGS_FROM_E[s] + startInterval + o) % 12;
        if (intervalSet.has(ni)) {
          dots.push({ stringIdx: s, fretOffset: o, type: ni === 0 ? 'root' : 'note' });
          maxOffset = Math.max(maxOffset, o);
        }
      }
    }
    return { label: `Position ${posIdx + 1}`, startOffset: startInterval, dots, windowSize: maxOffset + 1 };
  });
}

export const SCALES: Scale[] = [
  { id: 'minor-penta',   name: 'Minor Pentatonic', positions: MINOR_PENTA_POSITIONS },
  { id: 'blues',         name: 'Blues',            positions: BLUES_POSITIONS },
  { id: 'major-penta',   name: 'Major Pentatonic', positions: MAJOR_PENTA_POSITIONS },
  { id: 'natural-minor', name: 'Natural Minor',    positions: generateScalePositions([0, 2, 3, 5, 7, 8, 10]) },
  { id: 'major',         name: 'Major',            positions: generateScalePositions([0, 2, 4, 5, 7, 9, 11]) },
  { id: 'dorian',        name: 'Dorian',           positions: generateScalePositions([0, 2, 3, 5, 7, 9, 10]) },
];
