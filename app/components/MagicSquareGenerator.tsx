"use client";

import { useEffect, useState } from "react";

type Square = number[][];
type Cell = [number, number] | null;

function makeDurerBase(): Square {
  return [
    [16, 2, 3, 13],
    [5, 11, 10, 8],
    [9, 7, 6, 12],
    [4, 14, 15, 1],
  ];
}

function checkMagic(square: Square, target: number) {
  const issues: string[] = [];

  for (let row = 0; row < 4; row += 1) {
    const sum = square[row].reduce((acc, value) => acc + value, 0);
    if (sum !== target) issues.push(`Row ${row + 1}`);
  }

  for (let column = 0; column < 4; column += 1) {
    const sum = square.reduce((acc, row) => acc + row[column], 0);
    if (sum !== target) issues.push(`Col ${column + 1}`);
  }

  const diagonalOne = square.reduce((acc, row, index) => acc + row[index], 0);
  const diagonalTwo = square.reduce((acc, row, index) => acc + row[3 - index], 0);
  const corners = square[0][0] + square[0][3] + square[3][0] + square[3][3];
  const flat = square.flat();

  if (diagonalOne !== target) issues.push("Diagonal ↘");
  if (diagonalTwo !== target) issues.push("Diagonal ↙");
  if (corners !== target) issues.push("Corners");
  if (new Set(flat).size !== flat.length) issues.push("Uniqueness");

  return issues;
}

function findDMatrices(lo: number, hi: number): Square[] {
  const target = 2 * lo + 2 * hi;
  const rowChoices: Square = [];

  for (let mask = 0; mask < 16; mask += 1) {
    if (mask.toString(2).split("1").length - 1 === 2) {
      rowChoices.push([0, 1, 2, 3].map((index) => (((mask >> index) & 1) === 1 ? hi : lo)));
    }
  }

  const results: Square[] = [];

  for (const row0 of rowChoices) {
    for (const row1 of rowChoices) {
      for (const row2 of rowChoices) {
        for (const row3 of rowChoices) {
          const matrix = [row0, row1, row2, row3];
          const columnsOk = [0, 1, 2, 3].every(
            (column) => matrix.reduce((acc, row) => acc + row[column], 0) === target,
          );

          if (!columnsOk) continue;

          const diagonalOne = matrix.reduce((acc, row, index) => acc + row[index], 0);
          const diagonalTwo = matrix.reduce((acc, row, index) => acc + row[3 - index], 0);
          const corners = matrix[0][0] + matrix[0][3] + matrix[3][0] + matrix[3][3];

          if (diagonalOne !== target || diagonalTwo !== target || corners !== target) continue;

          results.push(matrix);
        }
      }
    }
  }

  return results;
}

function solveAdditive(target: number) {
  const base = makeDurerBase();
  const difference = target - 34;
  const low = Math.floor(difference / 4);
  const high = Math.ceil(difference / 4);

  if (low === high) {
    const result = base.map((row) => row.map((value) => value + low));
    if (new Set(result.flat()).size === result.flat().length) return result;
  }

  if (2 * low + 2 * high !== difference) return null;

  for (const matrix of findDMatrices(low, high)) {
    const result = base.map((row, rowIndex) =>
      row.map((value, columnIndex) => value + matrix[rowIndex][columnIndex]),
    );

    if (new Set(result.flat()).size === result.flat().length) return result;
  }

  return null;
}

function solveBacktrack(target: number, timeLimit = 3000) {
  const startedAt = Date.now();
  const square = Array.from({ length: 4 }, () => Array(4).fill(0)) as Square;
  const used = new Set<number>();
  const maxValue = target - 3;

  function canPlace(row: number, column: number, value: number) {
    if (used.has(value) || value < 1 || value >= target) return false;

    const rowSum = square[row].reduce((acc, current) => acc + current, 0) + value;
    if (rowSum > target) return false;
    if (column === 3 && rowSum !== target) return false;

    const columnSum = square.reduce((acc, currentRow) => acc + currentRow[column], 0) + value;
    if (columnSum > target) return false;
    if (row === 3 && columnSum !== target) return false;

    if (row === column) {
      const diagonalSum =
        square.reduce((acc, currentRow, index) => acc + (index < row ? currentRow[index] : 0), 0) +
        value;
      if (diagonalSum > target) return false;
      if (row === 3 && diagonalSum !== target) return false;
    }

    if (row + column === 3) {
      const antiDiagonalSum =
        square.reduce((acc, currentRow, index) => acc + (index < row ? currentRow[3 - index] : 0), 0) +
        value;
      if (antiDiagonalSum > target) return false;
      if (row === 3 && antiDiagonalSum !== target) return false;
    }

    return true;
  }

  function backtrack(position: number): boolean {
    if (Date.now() - startedAt > timeLimit) return false;
    if (position === 16) return checkMagic(square, target).length === 0;

    const row = Math.floor(position / 4);
    const column = position % 4;

    for (let value = 1; value <= maxValue; value += 1) {
      if (!canPlace(row, column, value)) continue;

      square[row][column] = value;
      used.add(value);

      if (backtrack(position + 1)) return true;

      square[row][column] = 0;
      used.delete(value);
    }

    return false;
  }

  return backtrack(0) ? square.map((row) => [...row]) : null;
}

function generateMagicSquare(target: number) {
  if (target < 34) return null;
  return solveAdditive(target) ?? solveBacktrack(target);
}

function getHighlights(square: Square | null, hoveredCell: Cell) {
  if (!square || !hoveredCell) return new Set<string>();

  const [hoveredRow, hoveredColumn] = hoveredCell;
  const cells = new Set<string>();

  for (let column = 0; column < 4; column += 1) cells.add(`${hoveredRow},${column}`);
  for (let row = 0; row < 4; row += 1) cells.add(`${row},${hoveredColumn}`);

  if (hoveredRow === hoveredColumn) {
    for (let index = 0; index < 4; index += 1) cells.add(`${index},${index}`);
  }

  if (hoveredRow + hoveredColumn === 3) {
    for (let index = 0; index < 4; index += 1) cells.add(`${index},${3 - index}`);
  }

  const isCorner = (hoveredRow === 0 || hoveredRow === 3) && (hoveredColumn === 0 || hoveredColumn === 3);
  if (isCorner) {
    cells.add("0,0");
    cells.add("0,3");
    cells.add("3,0");
    cells.add("3,3");
  }

  return cells;
}

function getVerificationRows(square: Square, target: number) {
  return [
    {
      label: "Rows",
      sums: [0, 1, 2, 3].map((row) => square[row].reduce((acc, value) => acc + value, 0)),
    },
    {
      label: "Columns",
      sums: [0, 1, 2, 3].map((column) => square.reduce((acc, row) => acc + row[column], 0)),
    },
    {
      label: "Diagonals",
      sums: [
        square.reduce((acc, row, index) => acc + row[index], 0),
        square.reduce((acc, row, index) => acc + row[3 - index], 0),
      ],
    },
    {
      label: "Corners",
      sums: [square[0][0] + square[0][3] + square[3][0] + square[3][3]],
    },
  ].map((item) => ({
    ...item,
    matches: item.sums.every((sum) => sum === target),
  }));
}

export default function MagicSquareGenerator() {
  const [inputValue, setInputValue] = useState("48");
  const [target, setTarget] = useState(48);
  const [square, setSquare] = useState<Square | null>(null);
  const [solving, setSolving] = useState(false);
  const [error, setError] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  const [hoveredCell, setHoveredCell] = useState<Cell>(null);
  const [revealed, setRevealed] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    let active = true;

    const timeoutId = window.setTimeout(() => {
      if (!active) return;
      solve(48);
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, []);

  function solve(value: number) {
    setSolving(true);
    setError("");
    setIssues([]);
    setSquare(null);
    setRevealed(false);

    window.setTimeout(() => {
      const roundedValue = Math.round(value);

      if (Number.isNaN(value) || roundedValue < 34 || roundedValue > 500) {
        setError(
          roundedValue < 34
            ? "Magic sum must be at least 34 for positive integers."
            : "Enter a number from 34 to 500.",
        );
        setSolving(false);
        return;
      }

      const result = generateMagicSquare(roundedValue);
      setTarget(roundedValue);

      if (!result) {
        setError("No solution was found in time. Try a different number.");
        setSolving(false);
        return;
      }

      setIssues(checkMagic(result, roundedValue));
      setSquare(result);

      window.setTimeout(() => {
        setRevealed(true);
        setAnimationKey((current) => current + 1);
      }, 50);

      setSolving(false);
    }, 30);
  }

  const highlights = getHighlights(square, hoveredCell);

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-cyan-500/20 bg-slate-950 px-6 py-8 text-slate-100 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:px-8 sm:py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "linear-gradient(rgba(99,200,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(99,200,255,0.06) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-48"
        style={{ background: "radial-gradient(circle at top, rgba(99,200,255,0.22), transparent 60%)" }}
      />

      <div className="relative mx-auto max-w-4xl">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.45em] text-cyan-400/70">Featured experiment</p>
          <h2 className="mt-3 text-3xl tracking-[0.2em] text-slate-50 sm:text-4xl">Magic Square</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Generate a 4 x 4 square for any magic constant from 34 to 500. Hover a cell to inspect every valid line
            and the corner constraint.
          </p>
        </div>

        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <label className="flex flex-col gap-2 text-center sm:text-left">
            <span className="text-[11px] uppercase tracking-[0.35em] text-slate-400">Magic constant</span>
            <input
              type="number"
              inputMode="numeric"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") solve(Number(inputValue));
              }}
              className="w-32 rounded-xl border border-cyan-400/30 bg-white/5 px-4 py-3 text-center text-2xl tracking-[0.2em] text-cyan-300 outline-none transition focus:border-cyan-300 focus:bg-white/8"
            />
          </label>

          <button
            type="button"
            onClick={() => solve(Number(inputValue))}
            disabled={solving}
            className="rounded-full border border-cyan-400/35 bg-cyan-400/10 px-6 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:bg-cyan-400/5 disabled:text-cyan-300/60"
          >
            {solving ? "Solving..." : "Generate"}
          </button>
        </div>

        {error ? (
          <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-center text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        {square ? (
          <div
            key={animationKey}
            className="mt-10 transition duration-500"
            style={{
              opacity: revealed ? 1 : 0,
              transform: revealed ? "translateY(0)" : "translateY(20px)",
            }}
          >
            <div className="mx-auto grid max-w-md grid-cols-4 gap-2 sm:gap-3">
              {square.map((row, rowIndex) =>
                row.map((value, columnIndex) => {
                  const key = `${rowIndex},${columnIndex}`;
                  const isHighlighted = highlights.has(key);
                  const isHovered = hoveredCell?.[0] === rowIndex && hoveredCell?.[1] === columnIndex;
                  const isCorner = (rowIndex === 0 || rowIndex === 3) && (columnIndex === 0 || columnIndex === 3);

                  let background = "rgba(255,255,255,0.04)";
                  let border = "1px solid rgba(255,255,255,0.08)";
                  let color = "#c8d0e0";
                  let transform = "scale(1)";
                  let boxShadow = "none";

                  if (isHighlighted) {
                    background = "rgba(99,200,255,0.12)";
                    border = "1px solid rgba(99,200,255,0.35)";
                    color = "#e8f4ff";
                  }

                  if (isCorner && highlights.has("0,0")) {
                    background = "rgba(255,180,80,0.15)";
                    border = "1px solid rgba(255,180,80,0.4)";
                    color = "#ffe8b0";
                  }

                  if (isHovered) {
                    background = "rgba(99,200,255,0.25)";
                    border = "1px solid rgba(99,200,255,0.7)";
                    color = "#ffffff";
                    transform = "scale(1.08)";
                    boxShadow = "0 0 20px rgba(99,200,255,0.4)";
                  }

                  return (
                    <div
                      key={`${rowIndex}-${columnIndex}`}
                      onMouseEnter={() => setHoveredCell([rowIndex, columnIndex])}
                      onMouseLeave={() => setHoveredCell(null)}
                      className="flex aspect-square items-center justify-center rounded-2xl text-lg font-bold sm:text-2xl"
                      style={{ background, border, color, transform, boxShadow, transition: "all 0.15s ease" }}
                    >
                      {value}
                    </div>
                  );
                }),
              )}
            </div>

            <div className="mx-auto mt-8 flex max-w-xl flex-col gap-3">
              {getVerificationRows(square, target).map((row) => (
                <div key={row.label} className="flex items-center justify-center gap-3 text-[11px] uppercase tracking-[0.25em]">
                  <span className="w-24 text-right text-slate-400">{row.label}</span>
                  <div className="flex flex-wrap justify-center gap-2">
                    {row.sums.map((sum, index) => (
                      <span
                        key={`${row.label}-${index}`}
                        className="min-w-10 rounded-full px-3 py-1 text-center"
                        style={{
                          color: sum === target ? "#63c8ff" : "#ff8e8e",
                          background: sum === target ? "rgba(99,200,255,0.08)" : "rgba(255,80,80,0.1)",
                          border: `1px solid ${sum === target ? "rgba(99,200,255,0.2)" : "rgba(255,80,80,0.3)"}`,
                        }}
                      >
                        {sum}
                      </span>
                    ))}
                  </div>
                  <span className={row.matches ? "text-emerald-400" : "text-rose-300"}>{row.matches ? "OK" : "FAIL"}</span>
                </div>
              ))}
            </div>

            {issues.length === 0 ? (
              <p className="mt-8 text-center text-xs uppercase tracking-[0.4em] text-cyan-300/80">
                All constraints satisfied
              </p>
            ) : null}

            <p className="mt-5 text-center text-xs tracking-[0.2em] text-slate-500">
              Hover cells to highlight rows, columns, diagonals, and corners.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
