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
      "You want to ride your bike to 10 friends' houses and then go home. What is the shortest trip that visits every house? With 3 friends it's easy. With 30 friends it's a nightmare.",
    hardExplanation:
      "With 10 friends, there are 3,628,800 different orders you could visit them in. With 20 friends, there are about 2.4 billion billion orders! A computer that checks a billion trips every second would need 77 years to try them all. Nobody knows a fast trick that always finds the very best trip.",
  },
  {
    emoji: '🎒',
    kidName: 'Pack Your Backpack',
    realName: 'Knapsack Problem',
    description:
      "Your backpack can only hold 8 pounds. Each thing you could bring has a weight and a fun score. Which things fit in the bag AND give you the most fun?",
    hardExplanation:
      "With 8 things, there are only 256 ways to pack. Easy! Each new thing doubles the number of ways. With 100 things, there are about 1,000,000,000,000,000,000,000,000,000,000 ways (a 1 with 30 zeros). A computer checking a billion ways every second would need about 40 trillion years. That's thousands of times longer than the universe has existed!",
  },
  {
    emoji: '🗺️',
    kidName: 'Color the Map',
    realName: 'Graph Coloring Problem',
    description:
      "Color a map so that countries that touch each other never have the same color. Can you do it with only 3 colors? For a small map, you can figure it out. For a huge map, it gets really, really hard.",
    hardExplanation:
      "In 1976, mathematicians proved that 4 colors are always enough for any flat map. But is 3 enough for YOUR map? Every country you add gives you more choices to try, so the number of possible colorings grows super fast. Nobody knows a quick way to always answer that question.",
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
          Your friend shows you a finished jigsaw puzzle and asks, <em>&ldquo;Did I do it right?&rdquo;</em> You can
          check in a few seconds. Now your friend dumps out a box of 1,000 mixed-up pieces and says, <em>&ldquo;Your
          turn.&rdquo;</em> That takes a LOT longer.
        </p>
        <p className="text-gray-700 dark:text-gray-300">
          That&apos;s the big idea behind NP-Complete problems. <strong>Checking an answer is quick. Finding the answer
          can be so slow that, for big puzzles, even the fastest computer would need longer than the universe has
          existed.</strong>
        </p>
        <p className="text-gray-700 dark:text-gray-300">
          Computer scientists sort problems into groups. Here are the three you need to know:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
          {[
            { label: 'P', color: 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700', description: 'Problems a computer can SOLVE quickly, even when they get big. Example: putting a list of names in ABC order.' },
            { label: 'NP', color: 'bg-yellow-100 dark:bg-yellow-900 border-yellow-300 dark:border-yellow-700', description: 'Problems where you can CHECK an answer quickly. Some are also quick to solve, but for others nobody knows a fast way. Heads up: NP does NOT mean "not P"!' },
            { label: 'NP-Complete', color: 'bg-purple-100 dark:bg-purple-900 border-purple-300 dark:border-purple-700', description: 'The toughest problems in NP. They are all linked together: find a fast way to solve just ONE of them, and you get a fast way to solve ALL of NP.' },
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
          Each of these sounds simple. The trouble starts when you want the PERFECT answer for a really big one.
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
            Your backpack holds <strong>{CAPACITY} pounds</strong>. Click things to pack them. Can you get the highest fun score without going over the weight limit?
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
              With 8 things, the computer tried all <strong>256 ways to pack</strong> in the blink of an eye.
              But every new thing doubles the number of ways. With 100 things, trying them all would take trillions
              of years. That&apos;s why packing problems like this one are NP-Complete.
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
              title: 'Keeping Secrets Safe',
              body: "The secret codes that protect online banking and messages use math puzzles that are easy to check but (we think) super hard to solve. They aren't NP-Complete, but they ARE in NP, so a fast way to solve NP problems would crack them too.",
            },
            {
              emoji: '📦',
              title: 'Delivering Packages',
              body: "Delivery companies have to pack trucks and plan routes every day. They use clever tricks to find a GOOD answer fast, but they can't be sure it's the BEST answer.",
            },
            {
              emoji: '🎮',
              title: 'Video Games',
              body: "Mathematicians have proven that giant-sized levels of Tetris, Minesweeper, and even Super Mario Bros. are at least as hard as NP-Complete problems!",
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
          Here&apos;s the question nobody can answer: <strong>if an answer is quick to CHECK, is it always quick to
          FIND, too?</strong> In other words, are P and NP really the same group? This is called the{' '}
          <strong>P vs NP</strong> problem.
        </p>
        <p className="text-gray-700 dark:text-gray-300">
          Most experts think the answer is &ldquo;no&rdquo; (some problems really are hard), but nobody has been
          able to prove it either way. It&apos;s one of 7 famous <em>Millennium Prize Problems</em>, and the Clay
          Mathematics Institute will pay <strong>$1,000,000</strong> to whoever solves it.
        </p>
        <p className="text-gray-700 dark:text-gray-300">
          If someone proved the answer is &ldquo;yes&rdquo; and found a fast trick, the secret codes that protect
          the internet might stop working. That would be a very big deal!
        </p>
        <p className="text-gray-700 dark:text-gray-300 font-medium">
          The smartest mathematicians and computer scientists in the world have been stuck on it for more than 50
          years. Maybe you&apos;ll be the one to crack it. 🤷
        </p>
      </section>

    </div>
  );
}
