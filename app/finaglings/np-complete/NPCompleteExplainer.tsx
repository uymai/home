'use client';

import { useMemo, useState } from 'react';

type Item = {
  emoji: string;
  name: string;
  weight: number;
  fun: number;
};

const ITEMS: Item[] = [
  { emoji: '🎮', name: 'Video game', weight: 4, fun: 9 },
  { emoji: '📚', name: 'Books', weight: 3, fun: 5 },
  { emoji: '🍕', name: 'Pizza slice', weight: 1, fun: 7 },
  { emoji: '⚽', name: 'Soccer ball', weight: 2, fun: 6 },
  { emoji: '🎧', name: 'Headphones', weight: 2, fun: 8 },
  { emoji: '🔦', name: 'Flashlight', weight: 1, fun: 3 },
  { emoji: '🧸', name: 'Stuffed animal', weight: 3, fun: 4 },
  { emoji: '🍫', name: 'Chocolate bar', weight: 1, fun: 6 },
];

const CAPACITY = 8;

function computeOptimal(items: Item[], capacity: number): { selected: boolean[]; score: number } {
  const n = items.length;
  let bestScore = 0;
  let bestMask = 0;
  for (let mask = 0; mask < (1 << n); mask++) {
    let w = 0, s = 0;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) { w += items[i].weight; s += items[i].fun; }
    }
    if (w <= capacity && s > bestScore) { bestScore = s; bestMask = mask; }
  }
  return {
    selected: Array.from({ length: n }, (_, i) => !!(bestMask & (1 << i))),
    score: bestScore,
  };
}

type ProblemCard = {
  emoji: string;
  kidName: string;
  realName: string;
  description: string;
  hardExplanation: string;
};

const PROBLEMS: ProblemCard[] = [
  {
    emoji: '🚲',
    kidName: 'Visit All Your Friends',
    realName: 'Traveling Salesman Problem',
    description:
      "You want to visit 10 friends' houses in one bike ride — but you want to take the shortest possible route so you're not exhausted. Easy with 3 friends. Miserable with 30.",
    hardExplanation:
      "With 10 friends there are 3,628,800 possible routes to check. With 20 friends? 2,432,902,008,176,640,000. A computer checking a billion routes per second would take 77 years just for 20 friends. There's no known shortcut that's guaranteed to find the perfect answer.",
  },
  {
    emoji: '🎒',
    kidName: 'Pack Your Backpack',
    realName: 'Knapsack Problem',
    description:
      "Your backpack can only hold 8 lbs. You have a pile of stuff with different weights and fun-scores. Which combo fits AND gives you the most fun on your trip?",
    hardExplanation:
      "With 8 items you only need to check 256 combos — no problem! But with 100 items that's 1,267,650,600,228,229,401,496,703,205,376 combinations. That's more than the number of atoms in the observable universe. No computer can check them all.",
  },
  {
    emoji: '🗺️',
    kidName: 'Color the Map',
    realName: 'Graph Coloring Problem',
    description:
      "Color a map so that no two countries touching each other share the same color. Try to use as few colors as possible. Sounds easy — but figuring out the MINIMUM colors needed for any map is brutally hard.",
    hardExplanation:
      "You can always color any map with just 4 colors (proven in 1976!). But figuring out if 3 colors are enough for a specific map requires checking an explosion of possibilities. As the map gets bigger, the problem gets astronomically harder.",
  },
];

function ProblemCardView({ problem }: { problem: ProblemCard }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 flex flex-col gap-3">
      <div className="text-4xl">{problem.emoji}</div>
      <div>
        <div className="font-bold text-lg">{problem.kidName}</div>
        <div className="text-sm text-gray-500 dark:text-gray-400 italic">{problem.realName}</div>
      </div>
      <p className="text-sm text-gray-700 dark:text-gray-300">{problem.description}</p>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline text-left"
      >
        {open ? '▲ Hide' : '▼ Why is it so hard?'}
      </button>
      {open && (
        <p className="text-xs text-gray-600 dark:text-gray-400 bg-purple-50 dark:bg-purple-950 rounded-lg p-3">
          {problem.hardExplanation}
        </p>
      )}
    </div>
  );
}

export default function NPCompleteExplainer() {
  const [selected, setSelected] = useState<boolean[]>(Array(ITEMS.length).fill(false));
  const [revealed, setRevealed] = useState(false);

  const optimal = useMemo(() => computeOptimal(ITEMS, CAPACITY), []);

  const currentWeight = ITEMS.reduce((s, it, i) => s + (selected[i] ? it.weight : 0), 0);
  const currentFun = ITEMS.reduce((s, it, i) => s + (selected[i] ? it.fun : 0), 0);
  const overWeight = currentWeight > CAPACITY;

  function toggle(i: number) {
    setSelected((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
    setRevealed(false);
  }

  const playerFoundOptimal = currentFun === optimal.score && !overWeight;

  return (
    <div className="flex flex-col gap-12 mt-8">

      {/* Section 1 — The Big Question */}
      <section className="rounded-2xl bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 p-6 sm:p-8 flex flex-col gap-4">
        <h2 className="text-2xl font-bold">🤔 The Big Question</h2>
        <p className="text-gray-700 dark:text-gray-300">
          Imagine your friend hands you a finished jigsaw puzzle and asks: <em>&ldquo;Did I put this together correctly?&rdquo;</em>
          — you can check in seconds. But if they hand you a box of 1,000 scrambled pieces and say <em>&ldquo;You do it&rdquo;</em> —
          that takes way longer.
        </p>
        <p className="text-gray-700 dark:text-gray-300">
          That&apos;s the big idea behind NP-Complete problems. <strong>Checking an answer is easy. Finding the answer might take longer than the age of the universe.</strong>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
          {[
            { label: 'P', color: 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700', description: 'Problems that are fast to solve AND fast to check. Like multiplying two numbers.' },
            { label: 'NP', color: 'bg-yellow-100 dark:bg-yellow-900 border-yellow-300 dark:border-yellow-700', description: 'Fast to check, but might be slow to solve. Like verifying a jigsaw vs. solving one.' },
            { label: 'NP-Complete', color: 'bg-purple-100 dark:bg-purple-900 border-purple-300 dark:border-purple-700', description: 'The hardest NP problems. If you find a shortcut for ANY of these, you solve them all.' },
          ].map(({ label, color, description }) => (
            <div key={label} className={`rounded-xl border p-4 ${color}`}>
              <div className="font-bold text-lg mb-1">{label}</div>
              <p className="text-sm text-gray-700 dark:text-gray-300">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 2 — Three Classic Problems */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold">🧩 Famous NP-Complete Problems</h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Each of these sounds simple — until you try to solve them perfectly for a big input.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PROBLEMS.map((p) => (
            <ProblemCardView key={p.realName} problem={p} />
          ))}
        </div>
      </section>

      {/* Section 3 — Interactive Knapsack */}
      <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 sm:p-8 flex flex-col gap-5">
        <div>
          <h2 className="text-2xl font-bold">🎒 Try It: Pack Your Backpack</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Your backpack holds <strong>{CAPACITY} lbs</strong>. Click items to pack them. Try to get the highest fun score without going over the weight limit!
          </p>
        </div>

        {/* Items grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ITEMS.map((item, i) => {
            const isSelected = selected[i];
            const wouldOver = !isSelected && currentWeight + item.weight > CAPACITY;
            return (
              <button
                key={item.name}
                onClick={() => toggle(i)}
                disabled={wouldOver && !isSelected}
                className={[
                  'rounded-xl border-2 p-3 flex flex-col items-center gap-1 transition-all text-center',
                  isSelected
                    ? 'border-purple-500 bg-purple-100 dark:bg-purple-900 scale-105'
                    : wouldOver
                    ? 'border-gray-200 dark:border-gray-700 opacity-40 cursor-not-allowed'
                    : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950 cursor-pointer',
                ].join(' ')}
              >
                <span className="text-3xl">{item.emoji}</span>
                <span className="text-xs font-medium">{item.name}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{item.weight} lbs</span>
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400">⭐ {item.fun} fun</span>
              </button>
            );
          })}
        </div>

        {/* Weight bar */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-sm font-medium">
            <span>Backpack weight</span>
            <span className={overWeight ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}>
              {currentWeight} / {CAPACITY} lbs {overWeight && '⚠️ Too heavy!'}
            </span>
          </div>
          <div className="h-3 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${overWeight ? 'bg-red-500' : 'bg-purple-500'}`}
              style={{ width: `${Math.min(100, (currentWeight / CAPACITY) * 100)}%` }}
            />
          </div>
        </div>

        {/* Score */}
        <div className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-800 p-4">
          <span className="font-semibold">Your fun score:</span>
          <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {overWeight ? '❌' : `⭐ ${currentFun}`}
          </span>
        </div>

        {/* Reveal button */}
        <button
          onClick={() => setRevealed(true)}
          className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 transition-colors"
        >
          Show me the best possible answer 🤖
        </button>

        {revealed && (
          <div className={`rounded-xl p-4 flex flex-col gap-2 ${playerFoundOptimal ? 'bg-green-100 dark:bg-green-900 border border-green-400' : 'bg-yellow-50 dark:bg-yellow-950 border border-yellow-300 dark:border-yellow-700'}`}>
            <div className="font-bold text-lg">
              {playerFoundOptimal ? '🎉 You found the perfect answer!' : `🤖 Best possible score: ⭐ ${optimal.score}`}
            </div>
            {!playerFoundOptimal && (
              <div className="text-sm text-gray-700 dark:text-gray-300">
                The computer packed: {ITEMS.filter((_, i) => optimal.selected[i]).map((it) => `${it.emoji} ${it.name}`).join(', ')}
              </div>
            )}
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              The computer checked all <strong>256 combinations</strong> instantly for 8 items.
              But with 100 items? That&apos;s more combinations than atoms in the universe — no computer could ever check them all.
              That&apos;s what makes this an NP-Complete problem.
            </p>
          </div>
        )}
      </section>

      {/* Section 4 — Why It Matters */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold">🌍 Why Does This Matter?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              emoji: '🔐',
              title: 'Your Passwords Are Safe',
              body: "Encryption that protects your bank account and messages uses math that's NP-hard to crack. Breaking it would take longer than the universe has existed.",
            },
            {
              emoji: '📦',
              title: 'Shipping & Logistics',
              body: "Companies like Amazon and FedEx need to pack trucks and plan delivery routes. They use clever tricks to get a *good* answer fast — but nobody can guarantee the perfect answer.",
            },
            {
              emoji: '🎮',
              title: 'Video Game Levels',
              body: "Many puzzle games (Tetris, Minesweeper, even Mario!) are secretly NP-complete. Game designers use this difficulty to make levels that feel impossibly tricky.",
            },
          ].map(({ emoji, title, body }) => (
            <div key={title} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 flex flex-col gap-2">
              <div className="text-3xl">{emoji}</div>
              <div className="font-bold">{title}</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 5 — Million Dollar Question */}
      <section className="rounded-2xl bg-yellow-50 dark:bg-yellow-950 border border-yellow-300 dark:border-yellow-700 p-6 sm:p-8 flex flex-col gap-3">
        <h2 className="text-2xl font-bold">💰 The Million Dollar Question</h2>
        <p className="text-gray-700 dark:text-gray-300">
          Nobody has ever proven whether a perfect shortcut exists for NP-Complete problems — or proven it&apos;s impossible.
          This is called the <strong>P vs NP</strong> problem, and it&apos;s one of the 7 <em>Millennium Prize Problems</em>.
        </p>
        <p className="text-gray-700 dark:text-gray-300">
          Solve it, and you win <strong>$1,000,000</strong> from the Clay Mathematics Institute — plus you&apos;d probably break all the encryption on the internet, which would be a problem.
        </p>
        <p className="text-gray-700 dark:text-gray-300 font-medium">
          The smartest mathematicians and computer scientists in the world have been working on it for 50+ years. Maybe you&apos;ll crack it. 🤷
        </p>
      </section>

    </div>
  );
}
