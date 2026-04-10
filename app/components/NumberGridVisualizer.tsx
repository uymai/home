"use client";

import { useState } from "react";

function isPrime(n: number): boolean {
  if (n < 2) return false;
  if (n === 2) return true;
  if (n % 2 === 0) return false;
  for (let i = 3; i * i <= n; i += 2) {
    if (n % i === 0) return false;
  }
  return true;
}

function isFibonacci(n: number): boolean {
  function isPerfectSquare(x: number) {
    const s = Math.round(Math.sqrt(x));
    return s * s === x;
  }
  return isPerfectSquare(5 * n * n + 4) || isPerfectSquare(5 * n * n - 4);
}

function getCategories(
  n: number,
  skipEnabled: boolean,
  skipStep: number,
  primesEnabled: boolean,
  fibEnabled: boolean,
): { skip: boolean; prime: boolean; fib: boolean } {
  return {
    skip: skipEnabled && n % skipStep === 0,
    prime: primesEnabled && isPrime(n),
    fib: fibEnabled && isFibonacci(n),
  };
}

function getCellStyle(cats: { skip: boolean; prime: boolean; fib: boolean }) {
  const active = [cats.skip, cats.prime, cats.fib].filter(Boolean).length;

  if (active === 0) {
    return {
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      color: "#94a3b8",
    };
  }

  // Build blended background from active categories
  const parts: string[] = [];
  if (cats.skip) parts.push("rgba(251,191,36,0.22)");
  if (cats.prime) parts.push("rgba(99,200,255,0.22)");
  if (cats.fib) parts.push("rgba(52,211,153,0.22)");

  // Priority for border: fib > prime > skip
  let border: string;
  if (cats.fib) border = "1px solid rgba(52,211,153,0.6)";
  else if (cats.prime) border = "1px solid rgba(99,200,255,0.6)";
  else border = "1px solid rgba(251,191,36,0.6)";

  // Blend backgrounds additively with a gradient
  const background =
    active === 1
      ? parts[0]
      : `linear-gradient(135deg, ${parts.join(", ")})`;

  return { background, border, color: "#f1f5f9" };
}

const COLS = 10;

export default function NumberGridVisualizer() {
  const [gridSize, setGridSize] = useState(100);
  const [skipEnabled, setSkipEnabled] = useState(false);
  const [skipStep, setSkipStep] = useState(2);
  const [primesEnabled, setPrimesEnabled] = useState(false);
  const [fibEnabled, setFibEnabled] = useState(false);

  const numbers = Array.from({ length: gridSize }, (_, i) => i + 1);

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-indigo-500/20 bg-slate-950 px-6 py-8 text-slate-100 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:px-8 sm:py-10">
      {/* Background grid pattern */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "linear-gradient(rgba(129,140,248,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(129,140,248,0.05) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-48"
        style={{ background: "radial-gradient(circle at top, rgba(129,140,248,0.18), transparent 60%)" }}
      />

      <div className="relative">
        {/* Controls */}
        <div className="flex flex-col gap-6">
          {/* Grid size slider */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-[0.35em] text-slate-400">Grid size</span>
              <span className="text-sm font-semibold text-indigo-300">{gridSize} numbers</span>
            </div>
            <input
              type="range"
              min={100}
              max={1000}
              step={10}
              value={gridSize}
              onChange={(e) => setGridSize(Number(e.target.value))}
              className="w-full accent-indigo-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>100</span>
              <span>1000</span>
            </div>
          </div>

          {/* Highlight toggles */}
          <div className="flex flex-wrap items-start gap-3">
            {/* Skip counting */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setSkipEnabled((v) => !v)}
                className="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] transition"
                style={{
                  borderColor: skipEnabled ? "rgba(251,191,36,0.6)" : "rgba(251,191,36,0.2)",
                  background: skipEnabled ? "rgba(251,191,36,0.15)" : "rgba(251,191,36,0.04)",
                  color: skipEnabled ? "#fbbf24" : "#78716c",
                }}
              >
                Skip Count
              </button>
              {skipEnabled && (
                <div className="flex flex-col gap-1 px-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">every</span>
                    <span className="text-xs font-bold text-amber-400">{skipStep}</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={20}
                    step={1}
                    value={skipStep}
                    onChange={(e) => setSkipStep(Number(e.target.value))}
                    className="w-32 accent-amber-400"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>2</span>
                    <span>20</span>
                  </div>
                </div>
              )}
            </div>

            {/* Primes */}
            <button
              type="button"
              onClick={() => setPrimesEnabled((v) => !v)}
              className="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] transition"
              style={{
                borderColor: primesEnabled ? "rgba(99,200,255,0.6)" : "rgba(99,200,255,0.2)",
                background: primesEnabled ? "rgba(99,200,255,0.15)" : "rgba(99,200,255,0.04)",
                color: primesEnabled ? "#63c8ff" : "#475569",
              }}
            >
              Primes
            </button>

            {/* Fibonacci */}
            <button
              type="button"
              onClick={() => setFibEnabled((v) => !v)}
              className="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] transition"
              style={{
                borderColor: fibEnabled ? "rgba(52,211,153,0.6)" : "rgba(52,211,153,0.2)",
                background: fibEnabled ? "rgba(52,211,153,0.15)" : "rgba(52,211,153,0.04)",
                color: fibEnabled ? "#34d399" : "#475569",
              }}
            >
              Fibonacci
            </button>
          </div>

          {/* Legend */}
          {(skipEnabled || primesEnabled || fibEnabled) && (
            <div className="flex flex-wrap gap-4 text-[11px]">
              {skipEnabled && (
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "rgba(251,191,36,0.5)", border: "1px solid rgba(251,191,36,0.6)" }} />
                  <span className="text-slate-400">Multiples of {skipStep}</span>
                </div>
              )}
              {primesEnabled && (
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "rgba(99,200,255,0.5)", border: "1px solid rgba(99,200,255,0.6)" }} />
                  <span className="text-slate-400">Primes</span>
                </div>
              )}
              {fibEnabled && (
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "rgba(52,211,153,0.5)", border: "1px solid rgba(52,211,153,0.6)" }} />
                  <span className="text-slate-400">Fibonacci</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Number grid */}
        <div className="mt-6 overflow-y-auto" style={{ maxHeight: "60vh" }}>
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
          >
            {numbers.map((n) => {
              const cats = getCategories(n, skipEnabled, skipStep, primesEnabled, fibEnabled);
              const cellStyle = getCellStyle(cats);
              return (
                <div
                  key={n}
                  className="flex aspect-square items-center justify-center rounded text-[10px] font-medium sm:text-xs"
                  style={{ ...cellStyle, transition: "background 0.15s, border 0.15s" }}
                  title={
                    [
                      cats.skip ? `Multiple of ${skipStep}` : "",
                      cats.prime ? "Prime" : "",
                      cats.fib ? "Fibonacci" : "",
                    ]
                      .filter(Boolean)
                      .join(", ") || String(n)
                  }
                >
                  {n}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
