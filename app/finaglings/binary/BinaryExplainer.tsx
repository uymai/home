'use client';

import { useEffect, useState } from 'react';

// Fingers from left to right when you hold up your RIGHT hand with your palm facing you.
// That order matches how binary numbers are written: biggest place on the left.
const FINGERS = [
  { name: 'Pinky', value: 16 },
  { name: 'Ring', value: 8 },
  { name: 'Middle', value: 4 },
  { name: 'Pointer', value: 2 },
  { name: 'Thumb', value: 1 },
];

const MAX = 31;

function toBits(n: number, width = 5): string {
  return n.toString(2).padStart(width, '0');
}

function isUp(n: number, value: number): boolean {
  return (n & value) !== 0;
}

// Finger shapes for the SVG hand: x position, raised height, folded height.
const FINGER_SHAPES: Record<number, { x: number; up: number; down: number; base: number }> = {
  16: { x: 38, up: 78, down: 24, base: 168 },
  8: { x: 78, up: 104, down: 26, base: 158 },
  4: { x: 118, up: 116, down: 26, base: 155 },
  2: { x: 158, up: 100, down: 26, base: 158 },
};

function Hand({ n, onToggle }: { n: number; onToggle: (value: number) => void }) {
  const thumbUp = isUp(n, 1);
  const upClass = 'fill-sky-400 dark:fill-sky-500 stroke-sky-700 dark:stroke-sky-300';
  const downClass = 'fill-gray-300 dark:fill-gray-600 stroke-gray-500 dark:stroke-gray-400';

  return (
    <svg viewBox="0 0 270 300" className="w-full max-w-xs mx-auto select-none" role="group" aria-label={`Hand showing ${n}`}>
      {Object.entries(FINGER_SHAPES).map(([key, shape]) => {
        const value = Number(key);
        const up = isUp(n, value);
        const h = up ? shape.up : shape.down;
        return (
          <g
            key={value}
            onClick={() => onToggle(value)}
            className="cursor-pointer"
            role="button"
            aria-pressed={up}
            aria-label={`${FINGERS.find((f) => f.value === value)?.name} finger, worth ${value}`}
          >
            <rect
              x={shape.x}
              y={shape.base - h}
              width={36}
              height={h + 30}
              rx={18}
              strokeWidth={2}
              className={`transition-all duration-200 ${up ? upClass : downClass}`}
            />
            {up && (
              <text
                x={shape.x + 18}
                y={shape.base - h + 28}
                textAnchor="middle"
                className="fill-white text-[15px] font-bold pointer-events-none"
              >
                {value}
              </text>
            )}
          </g>
        );
      })}

      {/* Palm */}
      <rect
        x={30}
        y={150}
        width={176}
        height={130}
        rx={44}
        strokeWidth={2}
        className="fill-amber-100 dark:fill-amber-900 stroke-amber-400 dark:stroke-amber-700"
      />

      {/* Thumb: sticks out to the right when up, tucks across the palm when down */}
      <g
        onClick={() => onToggle(1)}
        className="cursor-pointer"
        role="button"
        aria-pressed={thumbUp}
        aria-label="Thumb, worth 1"
      >
        <rect
          x={-18}
          y={thumbUp ? -86 : -50}
          width={36}
          height={thumbUp ? 96 : 60}
          rx={18}
          strokeWidth={2}
          transform={`translate(198 238) rotate(${thumbUp ? 45 : -70})`}
          className={`transition-all duration-200 ${thumbUp ? upClass : downClass}`}
        />
        {thumbUp && (
          <text x={246} y={186} textAnchor="middle" className="fill-white text-[15px] font-bold pointer-events-none">
            1
          </text>
        )}
      </g>

      <text x={105} y={255} textAnchor="middle" className="fill-amber-700 dark:fill-amber-200 text-[36px] font-bold pointer-events-none">
        {n}
      </text>
    </svg>
  );
}

function PlaceValueRow({ n }: { n: number }) {
  return (
    <div className="grid grid-cols-5 gap-2 text-center">
      {FINGERS.map((f) => {
        const up = isUp(n, f.value);
        return (
          <div key={f.value} className="flex flex-col gap-1">
            <div className="text-xs text-gray-500 dark:text-gray-400">{f.name}</div>
            <div
              className={`rounded-lg py-2 text-2xl font-mono font-bold border-2 ${
                up
                  ? 'bg-sky-100 dark:bg-sky-900 border-sky-400 text-sky-700 dark:text-sky-200'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400'
              }`}
            >
              {up ? 1 : 0}
            </div>
            <div className="text-xs font-semibold">{f.value}</div>
          </div>
        );
      })}
    </div>
  );
}

function sumSentence(n: number): string {
  const parts = FINGERS.filter((f) => isUp(n, f.value)).map((f) => f.value);
  if (parts.length === 0) return 'No fingers up = 0';
  return `${parts.join(' + ')} = ${n}`;
}

function randomTarget(not: number): number {
  let t = not;
  while (t === not) t = 1 + Math.floor(Math.random() * MAX);
  return t;
}

export default function BinaryExplainer() {
  const [n, setN] = useState(0);
  const [autoCount, setAutoCount] = useState(false);
  const [target, setTarget] = useState(0);
  const [challengeHand, setChallengeHand] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    setTarget(randomTarget(0));
  }, []);

  const counting = autoCount && n < MAX;

  useEffect(() => {
    if (!counting) return;
    const id = setTimeout(() => setN((prev) => prev + 1), 700);
    return () => clearTimeout(id);
  }, [counting, n]);

  const toggle = (value: number) => {
    setAutoCount(false);
    setN((prev) => prev ^ value);
  };

  const solved = target !== 0 && challengeHand === target;

  function nextChallenge() {
    if (solved) setStreak((s) => s + 1);
    setTarget(randomTarget(target));
    setChallengeHand(0);
  }

  return (
    <div className="flex flex-col gap-12 mt-8">

      {/* Section 1 — The quote */}
      <section className="rounded-2xl bg-sky-50 dark:bg-sky-950 border border-sky-200 dark:border-sky-800 p-6 sm:p-10 flex flex-col gap-4">
        <blockquote className="text-2xl sm:text-3xl font-bold leading-snug text-center">
          &ldquo;There are 10 kinds of people in the world: those who understand binary, and those who don&apos;t.&rdquo;
        </blockquote>
        <p className="text-center text-gray-600 dark:text-gray-400 text-sm">
          Did you get the joke? If not, don&apos;t worry. By the end of this page, you will. 😄
        </p>
      </section>

      {/* Section 2 — How you already count */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold">🔟 How You Already Count</h2>
        <p className="text-gray-700 dark:text-gray-300">
          You count using ten digits: <strong>0, 1, 2, 3, 4, 5, 6, 7, 8, 9</strong>. That&apos;s called{' '}
          <strong>base 10</strong>, probably because people have 10 fingers.
        </p>
        <p className="text-gray-700 dark:text-gray-300">
          What happens after 9? You run out of digits! So you put a <strong>0</strong> in the ones place and carry a{' '}
          <strong>1</strong> over to a new spot, the tens place. That&apos;s how you get <strong>10</strong>.
        </p>
        <p className="text-gray-700 dark:text-gray-300">
          Every spot in a number has a job. In the number <strong>347</strong>:
        </p>
        <div className="grid grid-cols-3 gap-3 max-w-md">
          {[
            { digit: 3, place: 'hundreds', value: 300 },
            { digit: 4, place: 'tens', value: 40 },
            { digit: 7, place: 'ones', value: 7 },
          ].map((d) => (
            <div key={d.place} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-center">
              <div className="text-4xl font-mono font-bold">{d.digit}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{d.place}</div>
              <div className="text-sm font-semibold mt-1">= {d.value}</div>
            </div>
          ))}
        </div>
        <p className="text-gray-700 dark:text-gray-300">
          300 + 40 + 7 = 347. Each spot is worth <strong>10 times</strong> the spot to its right: 1, 10, 100, 1000...
        </p>
      </section>

      {/* Section 3 — Binary */}
      <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 sm:p-8 flex flex-col gap-4">
        <h2 className="text-2xl font-bold">💡 Binary: Counting With Only 0 and 1</h2>
        <p className="text-gray-700 dark:text-gray-300">
          Now imagine you only had <strong>two</strong> digits: <strong>0</strong> and <strong>1</strong>. That&apos;s
          binary, or <strong>base 2</strong>. Think of each digit as a light switch: <strong>0 means off</strong> and{' '}
          <strong>1 means on</strong>.
        </p>
        <p className="text-gray-700 dark:text-gray-300">
          The spots work the same way as before, but each spot is worth <strong>2 times</strong> the spot to its right
          instead of 10 times:
        </p>
        <div className="flex flex-wrap gap-2 items-center font-mono text-lg">
          {[16, 8, 4, 2, 1].map((v, i) => (
            <span key={v} className="flex items-center gap-2">
              <span className="rounded-lg bg-sky-100 dark:bg-sky-900 px-3 py-1 font-bold">{v}</span>
              {i < 4 && <span className="text-gray-400">←</span>}
            </span>
          ))}
        </div>
        <p className="text-gray-700 dark:text-gray-300">
          Start at 1 and keep doubling as you go left: 1, 2, 4, 8, 16. To read a binary number, add up the spots that
          have a <strong>1</strong> in them. Here&apos;s <strong className="font-mono">10110</strong>:
        </p>
        <PlaceValueRow n={0b10110} />
        <p className="text-gray-700 dark:text-gray-300">
          16 + 4 + 2 = <strong>22</strong>. So <span className="font-mono">10110</span> in binary is 22 in regular
          numbers.
        </p>
        <div className="rounded-xl bg-yellow-50 dark:bg-yellow-950 border border-yellow-300 dark:border-yellow-700 p-4">
          <div className="font-bold mb-1">🤣 Now the joke makes sense!</div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            In binary, <span className="font-mono">10</span> means one 2 and zero 1s. That&apos;s <strong>two</strong>!
            So &ldquo;10 kinds of people&rdquo; really means &ldquo;<strong>2</strong> kinds of people.&rdquo; People
            who know binary read it as two. People who don&apos;t read it as ten and get confused.
          </p>
        </div>
      </section>

      {/* Section 4 — Counting table */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold">🔢 Let&apos;s Count!</h2>
        <p className="text-gray-700 dark:text-gray-300">
          Counting in binary works just like regular counting. You add 1 to the rightmost spot. But there&apos;s no
          digit &ldquo;2,&rdquo; so when a spot is already 1 and you add 1, it flips back to <strong>0</strong> and
          carries a 1 to the left. It&apos;s like 9 + 1 = 10, but it happens way sooner!
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Array.from({ length: MAX + 1 }, (_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5"
            >
              <span className="font-bold w-6 text-right">{i}</span>
              <span className="font-mono tracking-wider">
                {toBits(i).split('').map((b, j) => (
                  <span key={j} className={b === '1' ? 'text-sky-600 dark:text-sky-400 font-bold' : 'text-gray-300 dark:text-gray-600'}>
                    {b}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Spot the pattern: the rightmost digit flips every time. The next one flips every 2 counts. The next one every
          4, then every 8, then every 16. Each spot flips half as often as the one to its right.
        </p>
      </section>

      {/* Section 5 — One hand */}
      <section className="rounded-2xl bg-sky-50 dark:bg-sky-950 border border-sky-200 dark:border-sky-800 p-6 sm:p-8 flex flex-col gap-5">
        <h2 className="text-2xl font-bold">✋ Count to 31 on One Hand</h2>
        <p className="text-gray-700 dark:text-gray-300">
          The normal way, one hand can count to <strong>5</strong>. Each finger is worth 1, and you just count how many
          are up. Boring!
        </p>
        <p className="text-gray-700 dark:text-gray-300">
          Here&apos;s the trick: give each finger a different binary spot. A finger that&apos;s <strong>up is a 1</strong>{' '}
          and a finger that&apos;s <strong>down is a 0</strong>. Hold up your right hand with your palm facing you:
        </p>
        <ul className="grid grid-cols-5 gap-1 sm:gap-2 text-center text-xs sm:text-sm">
          {FINGERS.map((f) => (
            <li key={f.value} className="rounded-lg bg-white dark:bg-gray-900 border border-sky-200 dark:border-sky-800 px-1 py-2">
              <div className="font-semibold">{f.name}</div>
              <div className="text-xl font-bold text-sky-600 dark:text-sky-400">{f.value}</div>
            </li>
          ))}
        </ul>
        <p className="text-gray-700 dark:text-gray-300">
          Click the fingers to raise and lower them, or press the buttons to count up one at a time.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
          <Hand n={n} onToggle={toggle} />
          <div className="flex flex-col gap-4">
            <PlaceValueRow n={n} />
            <div className="rounded-xl bg-white dark:bg-gray-900 p-4 text-center">
              <div className="font-mono text-3xl font-bold tracking-widest">{toBits(n)}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{sumSentence(n)}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setAutoCount(false); setN((p) => (p >= MAX ? 0 : p + 1)); }}
                className="flex-1 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 transition-colors"
              >
                +1
              </button>
              <button
                onClick={() => { if (n >= MAX) setN(0); setAutoCount(!counting); }}
                className="flex-1 whitespace-nowrap rounded-xl border-2 border-sky-600 text-sky-700 dark:text-sky-300 font-semibold py-2 px-4 hover:bg-sky-100 dark:hover:bg-sky-900 transition-colors"
              >
                {counting ? '⏸ Pause' : '▶ Count to 31'}
              </button>
              <button
                onClick={() => { setAutoCount(false); setN(0); }}
                className="rounded-xl border border-gray-300 dark:border-gray-600 font-semibold py-2 px-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Reset
              </button>
            </div>
            {n === 4 && (
              <p className="text-sm rounded-lg bg-yellow-100 dark:bg-yellow-900 p-3">
                😬 Uh oh. Number 4 is just your middle finger. Maybe skip showing that one to your teacher.
              </p>
            )}
            {n === MAX && (
              <p className="text-sm rounded-lg bg-green-100 dark:bg-green-900 p-3">
                🎉 All five fingers up: 16 + 8 + 4 + 2 + 1 = <strong>31</strong>! That&apos;s the biggest number one
                hand can make.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-white dark:bg-gray-900 border border-sky-200 dark:border-sky-800 p-4 flex flex-col gap-2">
          <div className="font-bold">🧠 The +1 rule for your fingers</div>
          <ol className="list-decimal list-inside text-sm text-gray-700 dark:text-gray-300 flex flex-col gap-1">
            <li>Start with your thumb.</li>
            <li>If that finger is <strong>down</strong>, put it up. You&apos;re done!</li>
            <li>If that finger is <strong>up</strong>, put it down and move to the next finger. Go back to step 2.</li>
          </ol>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Try it slowly on your real hand from 0 to 31. It feels weird at first, then it gets fast. (Bending your ring
            finger by itself is the hardest part. Everyone&apos;s ring finger is lazy.)
          </p>
        </div>

        <div className="rounded-xl bg-white dark:bg-gray-900 border border-sky-200 dark:border-sky-800 p-4">
          <div className="font-bold mb-1">Why does it stop at 31?</div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            With every finger up you get 16 + 8 + 4 + 2 + 1 = 31. Each finger has 2 choices, up or down, so 5 fingers
            give you 2 × 2 × 2 × 2 × 2 = <strong>32</strong> different hands. One of them is all fingers down (zero), so
            you can show every number from <strong>0 to 31</strong>. That&apos;s six times more than counting the
            normal way!
          </p>
        </div>
      </section>

      {/* Section 6 — Challenge */}
      <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 sm:p-8 flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-bold">🎯 Challenge: Make the Number</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Click the fingers to make the number below. Tip: start with the biggest finger that fits, then fill in the rest.
          </p>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">Make this number:</div>
          <div className="text-6xl font-bold text-sky-600 dark:text-sky-400">{target || '…'}</div>
        </div>
        <Hand n={challengeHand} onToggle={(v) => setChallengeHand((p) => p ^ v)} />
        <div
          className={`rounded-xl p-4 text-center font-semibold ${
            solved
              ? 'bg-green-100 dark:bg-green-900 border border-green-400'
              : 'bg-gray-50 dark:bg-gray-800'
          }`}
        >
          {solved ? `🎉 Yes! ${toBits(target)} is ${target}.` : `Your hand shows ${challengeHand} (${toBits(challengeHand)})`}
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">Streak: 🔥 {streak}</span>
          <button
            onClick={nextChallenge}
            className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-6 transition-colors"
          >
            {solved ? 'Next number →' : 'Skip'}
          </button>
        </div>
      </section>

      {/* Section 7 — Bigger */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold">🚀 Going Bigger</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              emoji: '🙌',
              title: 'Two hands',
              body: 'Your other hand keeps doubling: 32, 64, 128, 256, 512. With 10 fingers you can count all the way to 1,023!',
            },
            {
              emoji: '🦶',
              title: 'Add your toes',
              body: '20 fingers and toes can count to 1,048,575. Good luck bending your toes one at a time, though.',
            },
            {
              emoji: '💻',
              title: 'Computers',
              body: 'A computer chip has billions of tiny switches that are either on (1) or off (0). Each one is called a bit. 8 bits make a byte, which can count to 255.',
            },
          ].map(({ emoji, title, body }) => (
            <div key={title} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 flex flex-col gap-2">
              <div className="text-3xl">{emoji}</div>
              <div className="font-bold">{title}</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{body}</p>
            </div>
          ))}
        </div>
        <p className="text-gray-700 dark:text-gray-300">
          Every picture, video game, and song on a computer is stored as a giant list of 0s and 1s. Now you know how to
          read them. Welcome to the 10 kinds of people who understand binary. 😎
        </p>
      </section>

    </div>
  );
}
