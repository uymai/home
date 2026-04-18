"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ComplexityKey =
  | "O1"
  | "OlogN"
  | "ON"
  | "ONlogN"
  | "ON2"
  | "ON3"
  | "O2N"
  | "ONfact";

interface ComplexityDef {
  key: ComplexityKey;
  label: string;
  color: string;
  colorDim: string;
  maxN: number;
  fn: (n: number) => number;
  speedSolve: (n: number, mult: number) => number | null;
  code: string;
  description: string;
}

// ─── Math helpers ─────────────────────────────────────────────────────────────

function factorial(n: number): number {
  if (n <= 1) return 1;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function solveNlogN(refN: number, mult: number): number {
  const target = refN * Math.log2(refN) * mult;
  let lo = refN;
  let hi = refN * mult + 2;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (mid * Math.log2(Math.max(mid, 1)) < target) lo = mid;
    else hi = mid;
  }
  return lo;
}

function solveFactorial(refN: number, mult: number): number | null {
  const target = factorial(refN) * mult;
  if (!isFinite(target)) return null;
  let n = refN;
  while (n < 20 && factorial(n + 1) <= target) n++;
  return n;
}

function formatN(n: number | null, decimals = 0): string {
  if (n === null) return "overflow";
  if (!isFinite(n)) return "∞";
  const v = Math.round(n);
  if (v >= 1e12) return `${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(decimals)}k`;
  return String(v);
}

function formatOps(y: number): string {
  if (!isFinite(y)) return "∞";
  if (y >= 1e12) return `${(y / 1e12).toFixed(1)}T`;
  if (y >= 1e9) return `${(y / 1e9).toFixed(1)}B`;
  if (y >= 1e6) return `${(y / 1e6).toFixed(1)}M`;
  if (y >= 1e3) return `${(y / 1e3).toFixed(1)}k`;
  return String(Math.round(y));
}

// ─── Complexity definitions ───────────────────────────────────────────────────

const COMPLEXITIES: ComplexityDef[] = [
  {
    key: "O1",
    label: "O(1)",
    color: "#fbbf24",
    colorDim: "#fbbf2440",
    maxN: 50,
    fn: () => 1,
    speedSolve: () => Infinity,
    description: "Constant — always the same number of operations regardless of input size.",
    code: `// O(1) — array index lookup
function getFirst<T>(arr: T[]): T {
  return arr[0];
}

// No matter how large the array is,
// this always does exactly one operation.
const result = getFirst([10, 20, 30, 40]);
// result: 10`,
  },
  {
    key: "OlogN",
    label: "O(log n)",
    color: "#38bdf8",
    colorDim: "#38bdf840",
    maxN: 50,
    fn: (n) => Math.log2(n),
    speedSolve: (n, mult) => n * mult,
    description: "Logarithmic — operations grow very slowly; doubling input adds just one step.",
    code: `// O(log n) — binary search
function binarySearch(arr: number[], target: number): number {
  let lo = 0, hi = arr.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}

// Each iteration halves the search space.
// 1 billion items? Only ~30 comparisons.`,
  },
  {
    key: "ON",
    label: "O(n)",
    color: "#34d399",
    colorDim: "#34d39940",
    maxN: 50,
    fn: (n) => n,
    speedSolve: (n, mult) => n * mult,
    description: "Linear — operations grow proportionally with input size.",
    code: `// O(n) — linear sum
function linearSum(arr: number[]): number {
  let total = 0;
  for (const x of arr) {
    total += x;
  }
  return total;
}

// Every element is visited exactly once.
// Double the array → double the work.`,
  },
  {
    key: "ONlogN",
    label: "O(n log n)",
    color: "#22d3ee",
    colorDim: "#22d3ee40",
    maxN: 50,
    fn: (n) => n * Math.log2(Math.max(n, 1)),
    speedSolve: solveNlogN,
    description: "Linearithmic — typical of efficient sorting; slightly worse than linear.",
    code: `// O(n log n) — merge sort
function mergeSort(arr: number[]): number[] {
  if (arr.length <= 1) return arr;
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));
  return merge(left, right);
}

function merge(a: number[], b: number[]): number[] {
  const out: number[] = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    out.push(a[i] <= b[j] ? a[i++] : b[j++]);
  }
  return out.concat(a.slice(i), b.slice(j));
}`,
  },
  {
    key: "ON2",
    label: "O(n²)",
    color: "#a78bfa",
    colorDim: "#a78bfa40",
    maxN: 50,
    fn: (n) => n * n,
    speedSolve: (n, mult) => n * Math.sqrt(mult),
    description: "Quadratic — nested loops; doubles input means 4× the work.",
    code: `// O(n²) — bubble sort
function bubbleSort(arr: number[]): number[] {
  const a = [...arr];
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < a.length - i - 1; j++) {
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
      }
    }
  }
  return a;
}

// Two nested loops: every pair of elements
// is compared. n=1000 → ~500,000 comparisons.`,
  },
  {
    key: "ON3",
    label: "O(n³)",
    color: "#fb7185",
    colorDim: "#fb718540",
    maxN: 50,
    fn: (n) => n * n * n,
    speedSolve: (n, mult) => n * Math.cbrt(mult),
    description: "Cubic — triple nested loops; quickly becomes impractical for large inputs.",
    code: `// O(n³) — naive matrix multiplication
function matMul(A: number[][], B: number[][]): number[][] {
  const n = A.length;
  const C = Array.from({ length: n }, () =>
    new Array(n).fill(0)
  );
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      for (let k = 0; k < n; k++)
        C[i][j] += A[i][k] * B[k][j];
  return C;
}

// Three nested loops over n.
// n=100 → 1,000,000 multiplications.`,
  },
  {
    key: "O2N",
    label: "O(2ⁿ)",
    color: "#fb923c",
    colorDim: "#fb923c40",
    maxN: 20,
    fn: (n) => Math.pow(2, n),
    speedSolve: (n, mult) => n + Math.log2(mult),
    description: "Exponential — doubles with each added element; impractical beyond tiny inputs.",
    code: `// O(2ⁿ) — naive recursive Fibonacci
function fibNaive(n: number): number {
  if (n <= 1) return n;
  return fibNaive(n - 1) + fibNaive(n - 2);
}

// Each call spawns two more calls.
// fib(40) makes ~2 billion calls.
// fib(50) would take years on modern hardware.
// Use memoization (O(n)) in real code!`,
  },
  {
    key: "ONfact",
    label: "O(n!)",
    color: "#f87171",
    colorDim: "#f8717140",
    maxN: 12,
    fn: factorial,
    speedSolve: solveFactorial,
    description: "Factorial — generates all permutations; n=20 has more operations than atoms in the universe.",
    code: `// O(n!) — generate all permutations
function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [
      ...arr.slice(0, i),
      ...arr.slice(i + 1),
    ];
    for (const perm of permutations(rest)) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}

// n=10 → 3,628,800 permutations
// n=20 → 2,432,902,008,176,640,000`,
  },
];

// ─── SVG constants ────────────────────────────────────────────────────────────

const SVG_W = 600;
const SVG_H = 360;
const PAD_L = 60;
const PAD_B = 40;
const PAD_T = 20;
const PAD_R = 20;
const CW = SVG_W - PAD_L - PAD_R;
const CH = SVG_H - PAD_T - PAD_B;
const NUM_PTS = 80;

// ─── Minimal syntax highlighter ───────────────────────────────────────────────

function highlight(code: string): React.ReactNode[] {
  const keywords =
    /\b(function|return|const|let|for|while|if|else|of|new|import|export|default|type|interface)\b/g;
  const strings = /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g;
  const comments = /(\/\/[^\n]*)/g;
  const numbers = /\b(\d+)\b/g;

  const tokens: { start: number; end: number; type: string }[] = [];
  let m: RegExpExecArray | null;

  for (const [re, type] of [
    [comments, "comment"],
    [strings, "string"],
    [keywords, "keyword"],
    [numbers, "number"],
  ] as [RegExp, string][]) {
    re.lastIndex = 0;
    while ((m = re.exec(code)) !== null) {
      tokens.push({ start: m.index, end: m.index + m[0].length, type });
    }
  }

  tokens.sort((a, b) => a.start - b.start);

  const parts: React.ReactNode[] = [];
  let pos = 0;
  const colorMap: Record<string, string> = {
    keyword: "#c084fc",
    string: "#86efac",
    comment: "#64748b",
    number: "#fbbf24",
  };

  for (const tok of tokens) {
    if (tok.start < pos) continue;
    if (tok.start > pos) parts.push(code.slice(pos, tok.start));
    parts.push(
      <span key={tok.start} style={{ color: colorMap[tok.type] }}>
        {code.slice(tok.start, tok.end)}
      </span>
    );
    pos = tok.end;
  }
  if (pos < code.length) parts.push(code.slice(pos));
  return parts;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BigOVisualizer() {
  const [selected, setSelected] = useState<Set<ComplexityKey>>(
    new Set(["ON", "ON2"])
  );
  const [active, setActive] = useState<ComplexityKey>("ON2");
  const [refN, setRefN] = useState(10);
  const [logScale, setLogScale] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; n: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const activeDef = COMPLEXITIES.find((d) => d.key === active)!;
  const selectedDefs = COMPLEXITIES.filter((d) => selected.has(d.key));
  const hasExplosive = selectedDefs.some((d) =>
    ["O2N", "ONfact"].includes(d.key)
  );
  const domainMax = Math.max(...selectedDefs.map((d) => d.maxN));

  // Auto-enable log scale when explosive complexities are added
  useEffect(() => {
    if (hasExplosive) setLogScale(true);
  }, [hasExplosive]);

  function handleToggle(key: ComplexityKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size === 1) return prev;
        next.delete(key);
        if (active === key) setActive([...next][0]);
      } else {
        next.add(key);
        setActive(key);
      }
      return next;
    });
    if (!selected.has(key)) setActive(key);
  }

  // Compute data points for each selected complexity
  const curves = useMemo(() => {
    return selectedDefs.map((def) => {
      const pts = Array.from({ length: NUM_PTS }, (_, i) => {
        const n = 1 + (i * (domainMax - 1)) / (NUM_PTS - 1);
        const raw = def.fn(n);
        return { n, raw };
      });
      return { def, pts };
    });
  }, [selected, domainMax]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute scale
  const { toSvgY, rangeMax } = useMemo(() => {
    const allYs = curves.flatMap(({ pts }) =>
      pts.map(({ raw }) => (logScale ? Math.log10(raw + 1) : raw))
    );
    const maxY = Math.max(...allYs.filter(isFinite), 1) * 1.05;
    return {
      rangeMax: maxY,
      toSvgY: (raw: number) => {
        const v = logScale ? Math.log10(raw + 1) : raw;
        return PAD_T + CH - (v / maxY) * CH;
      },
    };
  }, [curves, logScale]);

  function toSvgX(n: number) {
    return PAD_L + ((n - 1) / (domainMax - 1)) * CW;
  }

  function buildPoints(pts: { n: number; raw: number }[]) {
    return pts
      .filter(({ raw }) => isFinite(raw) && raw >= 0)
      .map(({ n, raw }) => `${toSvgX(n).toFixed(1)},${toSvgY(raw).toFixed(1)}`)
      .join(" ");
  }

  // Y-axis tick labels
  function yTickLabel(frac: number): string {
    const v = frac * rangeMax;
    return logScale ? `10^${v.toFixed(1)}` : formatOps(v);
  }

  // Hover handler
  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current!.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * SVG_W;
    const n = 1 + ((svgX - PAD_L) / CW) * (domainMax - 1);
    if (n < 1 || n > domainMax) {
      setTooltip(null);
      return;
    }
    setTooltip({ x: svgX, y: e.clientY - rect.top, n });
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(activeDef.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const yTicks = [0, 0.25, 0.5, 0.75, 1.0];
  const xTicks = Array.from({ length: 6 }, (_, i) =>
    Math.round(1 + (i * (domainMax - 1)) / 5)
  );

  return (
    <div className="space-y-8">
      {/* Toggle buttons */}
      <div className="flex flex-wrap gap-2">
        {COMPLEXITIES.map((def) => {
          const isSel = selected.has(def.key);
          const isAct = active === def.key;
          return (
            <button
              key={def.key}
              onClick={() => handleToggle(def.key)}
              style={{
                borderColor: isSel ? def.color : "#334155",
                backgroundColor: isAct
                  ? `${def.color}30`
                  : isSel
                  ? `${def.color}15`
                  : "transparent",
                color: isSel ? def.color : "#64748b",
                boxShadow: isAct ? `0 0 0 1px ${def.color}` : undefined,
              }}
              className="rounded-full border px-3 py-1 text-xs font-bold font-mono tracking-wide transition-all cursor-pointer"
            >
              {def.label}
            </button>
          );
        })}

        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setLogScale((v) => !v)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
              logScale
                ? "border-slate-400 bg-slate-700 text-slate-200"
                : "border-slate-700 text-slate-500 hover:text-slate-300"
            }`}
          >
            log scale
          </button>
        </div>
      </div>

      {/* Graph */}
      <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
        {logScale && hasExplosive && (
          <div className="px-4 py-2 text-xs text-sky-400 border-b border-slate-800 bg-sky-950/20">
            Log scale active — exponential and factorial growth would dwarf all other curves on a linear axis
          </div>
        )}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Grid lines */}
          {yTicks.map((frac) => {
            const y = PAD_T + CH - frac * CH;
            return (
              <line
                key={frac}
                x1={PAD_L}
                y1={y}
                x2={PAD_L + CW}
                y2={y}
                stroke="#1e293b"
                strokeWidth="1"
              />
            );
          })}
          {xTicks.map((n) => {
            const x = toSvgX(n);
            return (
              <line
                key={n}
                x1={x}
                y1={PAD_T}
                x2={x}
                y2={PAD_T + CH}
                stroke="#1e293b"
                strokeWidth="1"
              />
            );
          })}

          {/* Axes */}
          <line
            x1={PAD_L}
            y1={PAD_T}
            x2={PAD_L}
            y2={PAD_T + CH}
            stroke="#475569"
            strokeWidth="1.5"
          />
          <line
            x1={PAD_L}
            y1={PAD_T + CH}
            x2={PAD_L + CW}
            y2={PAD_T + CH}
            stroke="#475569"
            strokeWidth="1.5"
          />

          {/* Y-axis labels */}
          {yTicks.map((frac) => {
            const y = PAD_T + CH - frac * CH;
            return (
              <text
                key={frac}
                x={PAD_L - 6}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill="#64748b"
              >
                {yTickLabel(frac)}
              </text>
            );
          })}

          {/* X-axis labels */}
          {xTicks.map((n) => (
            <text
              key={n}
              x={toSvgX(n)}
              y={PAD_T + CH + 18}
              textAnchor="middle"
              fontSize="10"
              fill="#64748b"
            >
              {n}
            </text>
          ))}

          {/* Axis titles */}
          <text
            x={PAD_L + CW / 2}
            y={SVG_H - 4}
            textAnchor="middle"
            fontSize="11"
            fill="#475569"
          >
            n (input size)
          </text>
          <text
            x={12}
            y={PAD_T + CH / 2}
            textAnchor="middle"
            fontSize="11"
            fill="#475569"
            transform={`rotate(-90, 12, ${PAD_T + CH / 2})`}
          >
            {logScale ? "log(ops)" : "operations"}
          </text>

          {/* Curves */}
          {curves.map(({ def, pts }) => (
            <polyline
              key={def.key}
              points={buildPoints(pts)}
              fill="none"
              stroke={def.color}
              strokeWidth={active === def.key ? 2.5 : 1.5}
              strokeOpacity={active === def.key ? 1 : 0.55}
            />
          ))}

          {/* Reference n marker */}
          {(() => {
            const x = toSvgX(refN);
            return (
              <line
                x1={x}
                y1={PAD_T}
                x2={x}
                y2={PAD_T + CH}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="4 3"
              />
            );
          })()}

          {/* Legend */}
          {selectedDefs.map((def, i) => (
            <g key={def.key} transform={`translate(${PAD_L + CW - 10}, ${PAD_T + 8 + i * 16})`}>
              <rect x={-70} y={-8} width={74} height={13} rx={3} fill="#0f172a" fillOpacity={0.8} />
              <circle cx={-58} cy={-1} r={4} fill={def.color} />
              <text x={-50} y={3} fontSize="10" fill={def.color} fontFamily="monospace">
                {def.label}
              </text>
            </g>
          ))}

          {/* Hover tooltip */}
          {tooltip && (() => {
            const n = Math.max(1, Math.min(domainMax, tooltip.n));
            const lines = selectedDefs.map((def) => ({
              label: def.label,
              color: def.color,
              val: formatOps(def.fn(n)),
            }));
            const tipX = tooltip.x > SVG_W * 0.65 ? tooltip.x - 120 : tooltip.x + 10;
            const tipY = Math.min(tooltip.y, PAD_T + CH - 20 - lines.length * 14);
            return (
              <g transform={`translate(${tipX}, ${tipY})`}>
                <rect
                  x={0}
                  y={0}
                  width={110}
                  height={16 + lines.length * 14}
                  rx={4}
                  fill="#1e293b"
                  stroke="#334155"
                />
                <text x={6} y={12} fontSize="10" fill="#94a3b8">
                  n = {Math.round(n)}
                </text>
                {lines.map((l, i) => (
                  <g key={l.label} transform={`translate(0, ${16 + i * 14})`}>
                    <circle cx={10} cy={7} r={3} fill={l.color} />
                    <text x={17} y={11} fontSize="10" fill={l.color} fontFamily="monospace">
                      {l.label}: {l.val}
                    </text>
                  </g>
                ))}
              </g>
            );
          })()}
        </svg>
      </div>

      {/* Reference n slider */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-400 whitespace-nowrap">Reference n:</span>
        <input
          type="range"
          min={1}
          max={domainMax}
          value={refN}
          onChange={(e) => setRefN(Number(e.target.value))}
          className="flex-1 accent-violet-400"
        />
        <span className="text-sm font-mono text-slate-300 w-8 text-right">{refN}</span>
      </div>

      {/* Code panel */}
      <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
        <div className="flex items-start justify-between px-5 py-3 border-b border-slate-800">
          <div>
            <span
              className="text-sm font-bold font-mono"
              style={{ color: activeDef.color }}
            >
              {activeDef.label}
            </span>
            <p className="text-xs text-slate-400 mt-0.5">{activeDef.description}</p>
          </div>
          <button
            onClick={handleCopy}
            className="text-xs px-2.5 py-1 rounded border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors cursor-pointer shrink-0 ml-4 mt-0.5"
          >
            {copied ? "copied!" : "copy"}
          </button>
        </div>
        <pre className="p-5 text-sm font-mono leading-relaxed overflow-x-auto text-slate-300">
          <code>{highlight(activeDef.code)}</code>
        </pre>
      </div>

      {/* Speed comparison table */}
      <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-slate-200">
            Speed Improvement Calculator
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            If computers became faster, how many more values could the same algorithm handle in the same time? Based on n&nbsp;=&nbsp;{refN}.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-400">Complexity</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-400">Ops at n={refN}</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-400">1,000× faster → n</th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold text-slate-400">1,000,000× faster → n</th>
              </tr>
            </thead>
            <tbody>
              {COMPLEXITIES.map((def) => {
                const ops = def.fn(refN);
                const n1k = def.speedSolve(refN, 1000);
                const n1m = def.speedSolve(refN, 1_000_000);
                const isAct = active === def.key;
                return (
                  <tr
                    key={def.key}
                    className={`border-b border-slate-800/50 cursor-pointer transition-colors ${
                      isAct ? "bg-slate-900/60" : "hover:bg-slate-900/30"
                    }`}
                    onClick={() => {
                      if (!selected.has(def.key)) {
                        setSelected((prev) => new Set([...prev, def.key]));
                      }
                      setActive(def.key);
                    }}
                  >
                    <td className="px-5 py-2.5">
                      <span
                        className="font-mono font-bold text-sm"
                        style={{ color: def.color }}
                      >
                        {def.label}
                      </span>
                    </td>
                    <td className="text-right px-4 py-2.5 font-mono text-slate-300 text-xs">
                      {formatOps(ops)}
                    </td>
                    <td className="text-right px-4 py-2.5 font-mono text-xs" style={{ color: def.color }}>
                      {n1k === null
                        ? "overflow"
                        : n1k === Infinity
                        ? "∞"
                        : formatN(n1k)}
                    </td>
                    <td className="text-right px-5 py-2.5 font-mono text-xs" style={{ color: def.color }}>
                      {n1m === null
                        ? "overflow"
                        : n1m === Infinity
                        ? "∞"
                        : formatN(n1m)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-800 text-xs text-slate-500">
          Clicking a row selects it on the graph and switches the code panel. For O(1), faster hardware handles infinite inputs — it&apos;s already constant. For O(n!) with large n, values overflow 64-bit floats.
        </div>
      </div>
    </div>
  );
}
