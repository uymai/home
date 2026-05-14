'use client';

import { useState } from 'react';

type Option = {
  price: string;
  count: string;
};

function parseNum(val: string): number {
  return parseFloat(val.replace(/[^0-9.]/g, ''));
}

function pricePerUnit(price: number, count: number): number {
  return price / count;
}

export default function ToiletPaperMathClient() {
  const [a, setA] = useState<Option>({ price: '16.99', count: '48' });
  const [b, setB] = useState<Option>({ price: '30.99', count: '90' });
  const [label, setLabel] = useState('rolls');

  const priceA = parseNum(a.price);
  const countA = parseNum(a.count);
  const priceB = parseNum(b.price);
  const countB = parseNum(b.count);

  const validA = priceA > 0 && countA > 0;
  const validB = priceB > 0 && countB > 0;
  const bothValid = validA && validB;

  const ppu_a = validA ? pricePerUnit(priceA, countA) : null;
  const ppu_b = validB ? pricePerUnit(priceB, countB) : null;

  let winner: 'a' | 'b' | 'tie' | null = null;
  if (bothValid && ppu_a !== null && ppu_b !== null) {
    if (Math.abs(ppu_a - ppu_b) < 0.0001) winner = 'tie';
    else winner = ppu_a < ppu_b ? 'a' : 'b';
  }

  const savingsPct =
    bothValid && ppu_a !== null && ppu_b !== null
      ? Math.abs(ppu_a - ppu_b) / Math.max(ppu_a, ppu_b)
      : null;

  function inputClass(highlight: boolean) {
    return `w-full rounded-lg border px-3 py-2 text-base bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
      highlight
        ? 'border-emerald-400 dark:border-emerald-500'
        : 'border-gray-300 dark:border-gray-600'
    }`;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
          Unit label
        </label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 w-32"
          placeholder="rolls, oz, ct…"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {(
          [
            { key: 'a', opt: a, set: setA, label: 'Option A', color: 'indigo' },
            { key: 'b', opt: b, set: setB, label: 'Option B', color: 'rose' },
          ] as const
        ).map(({ key, opt, set, label: optLabel, color }) => {
          const isWinner = winner === key;
          return (
            <div
              key={key}
              className={`rounded-2xl border-2 p-5 transition-colors ${
                isWinner
                  ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-lg font-bold text-${color}-600 dark:text-${color}-400`}>
                  {optLabel}
                </h2>
                {isWinner && (
                  <span className="text-xs font-semibold bg-emerald-400 text-white rounded-full px-2.5 py-0.5">
                    Best value
                  </span>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Price ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={opt.price}
                    onChange={(e) => set((o) => ({ ...o, price: e.target.value }))}
                    className={inputClass(isWinner)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Count ({label || 'units'})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={opt.count}
                    onChange={(e) => set((o) => ({ ...o, count: e.target.value }))}
                    className={inputClass(isWinner)}
                    placeholder="0"
                  />
                </div>
              </div>

              {key === 'a' && ppu_a !== null && (
                <p className="mt-4 text-2xl font-mono font-bold">
                  ${ppu_a.toFixed(4)}
                  <span className="text-sm font-sans font-normal text-gray-500 dark:text-gray-400 ml-1">
                    / {label || 'unit'}
                  </span>
                </p>
              )}
              {key === 'b' && ppu_b !== null && (
                <p className="mt-4 text-2xl font-mono font-bold">
                  ${ppu_b.toFixed(4)}
                  <span className="text-sm font-sans font-normal text-gray-500 dark:text-gray-400 ml-1">
                    / {label || 'unit'}
                  </span>
                </p>
              )}
            </div>
          );
        })}
      </div>

      {bothValid && winner !== null && savingsPct !== null && (
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-5 text-center space-y-1">
          {winner === 'tie' ? (
            <p className="text-lg font-semibold">Same price per {label || 'unit'} — it&apos;s a tie.</p>
          ) : (
            <>
              <p className="text-lg font-semibold">
                Option {winner.toUpperCase()} saves you{' '}
                <span className="text-emerald-600 dark:text-emerald-400">
                  {(savingsPct * 100).toFixed(1)}%
                </span>{' '}
                per {label || 'unit'}.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {winner === 'a'
                  ? `$${ppu_a!.toFixed(4)} vs $${ppu_b!.toFixed(4)} — Option A wins by $${(ppu_b! - ppu_a!).toFixed(4)} per ${label || 'unit'}`
                  : `$${ppu_b!.toFixed(4)} vs $${ppu_a!.toFixed(4)} — Option B wins by $${(ppu_a! - ppu_b!).toFixed(4)} per ${label || 'unit'}`}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
