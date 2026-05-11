'use client';

import { useState } from 'react';
import { CHECKOUTS, IMPOSSIBLE } from './checkouts';

type Mode = 'quick' | 'chart';

function dartColor(dart: string): string {
  if (dart.startsWith('T')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  if (dart.startsWith('D')) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
  return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
}

function dartCountColor(n: number): string {
  if (n === 1) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
  if (n === 2) return 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200';
  return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
}

function DartPill({ dart }: { dart: string }) {
  return (
    <span className={`inline-block px-3 py-1.5 rounded-full text-sm font-semibold ${dartColor(dart)}`}>
      {dart}
    </span>
  );
}

function CheckoutResult({ score }: { score: number | null }) {
  if (score === null) {
    return <div className="text-gray-400 dark:text-gray-500 text-center py-6">Enter a score above</div>;
  }
  if (score < 2 || score > 170) {
    return <div className="text-gray-500 dark:text-gray-400 text-center py-6">Score must be 2–170</div>;
  }
  if (IMPOSSIBLE.has(score)) {
    return (
      <div className="text-center py-6">
        <div className="text-red-600 dark:text-red-400 font-semibold">No checkout</div>
        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{score} is not a valid finish</div>
      </div>
    );
  }
  const darts = CHECKOUTS[score];
  if (!darts) {
    return <div className="text-gray-500 dark:text-gray-400 text-center py-6">No checkout found</div>;
  }
  return (
    <div className="text-center py-6 space-y-3">
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {darts.map((dart, i) => (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-gray-300 dark:text-gray-600">→</span>}
            <DartPill dart={dart} />
          </span>
        ))}
      </div>
      <div className="text-xs text-gray-400 dark:text-gray-500">
        {darts.length} dart{darts.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

const PAD_KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '⌫', '0', 'C'] as const;

export default function DartCheckoutClient() {
  const [mode, setMode] = useState<Mode>('quick');
  const [input, setInput] = useState('');

  const score = input === '' ? null : parseInt(input, 10);

  function handlePad(key: string) {
    if (key === 'C') { setInput(''); return; }
    if (key === '⌫') { setInput(s => s.slice(0, -1)); return; }
    setInput(s => {
      const next = s + key;
      const n = parseInt(next, 10);
      if (n > 170) return s;
      return next.replace(/^0+(\d)/, '$1');
    });
  }

  const allScores = Array.from({ length: 169 }, (_, i) => i + 2).filter(
    n => CHECKOUTS[n] || IMPOSSIBLE.has(n)
  );

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
        {(['quick', 'chart'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
              mode === m
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800'
            }`}
          >
            {m === 'quick' ? 'Quick Look' : 'Full Chart'}
          </button>
        ))}
      </div>

      {mode === 'quick' && (
        <>
          {/* Score display */}
          <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 px-6 py-5 text-center">
            <div className={`text-6xl font-bold tabular-nums tracking-tight ${input ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-gray-600'}`}>
              {input || '—'}
            </div>
          </div>

          {/* Checkout result */}
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 min-h-24">
            <CheckoutResult score={score} />
          </div>

          {/* Number pad */}
          <div className="grid grid-cols-3 gap-2">
            {PAD_KEYS.map(key => (
              <button
                key={key}
                onClick={() => handlePad(key)}
                className={`py-4 rounded-xl text-lg font-semibold transition-colors select-none ${
                  key === 'C'
                    ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900'
                    : key === '⌫'
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {key}
              </button>
            ))}
          </div>

          {/* Legend */}
          <div className="flex gap-3 justify-center text-xs flex-wrap pt-1">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-green-200 dark:bg-green-800" /> Triple
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-orange-200 dark:bg-orange-800" /> Double
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-700" /> Single / Bull
            </span>
          </div>
        </>
      )}

      {mode === 'chart' && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="grid grid-cols-[3rem_1fr_2.5rem] px-4 py-2 bg-gray-50 dark:bg-gray-800 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">
            <div>Score</div>
            <div>Checkout</div>
            <div className="text-right">Darts</div>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[60vh] overflow-y-auto">
            {allScores.map(n => {
              const darts = CHECKOUTS[n];
              const impossible = IMPOSSIBLE.has(n);
              return (
                <button
                  key={n}
                  disabled={impossible}
                  onClick={() => { setInput(String(n)); setMode('quick'); }}
                  className={`w-full grid grid-cols-[3rem_1fr_2.5rem] px-4 py-2.5 text-left transition-colors text-sm ${
                    impossible
                      ? 'bg-white dark:bg-gray-900 opacity-40 cursor-default'
                      : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer'
                  }`}
                >
                  <div className="font-semibold tabular-nums text-gray-900 dark:text-gray-100 self-center">{n}</div>
                  <div className="flex items-center gap-1.5 flex-wrap self-center">
                    {impossible ? (
                      <span className="text-gray-400 dark:text-gray-600 text-xs">no checkout</span>
                    ) : (
                      darts?.map((dart, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && <span className="text-gray-200 dark:text-gray-700 text-xs">›</span>}
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${dartColor(dart)}`}>{dart}</span>
                        </span>
                      ))
                    )}
                  </div>
                  <div className="flex items-center justify-end self-center">
                    {!impossible && darts && (
                      <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${dartCountColor(darts.length)}`}>
                        {darts.length}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
