"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ALGORITHMS, AlgorithmId, AlgorithmMeta, generateSteps, SortStep } from "./algorithms";

// ─── Syntax highlighter (Python) ──────────────────────────────────────────────

function highlight(code: string): React.ReactNode[] {
  const keywords =
    /\b(def|return|for|while|if|elif|else|in|and|or|not|True|False|None|pass|break|continue|range|len|append|print|min|max)\b/g;
  const strings = /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g;
  const comments = /(#[^\n]*)/g;
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

// ─── Complexity color helper ───────────────────────────────────────────────────

function complexityColor(s: string): string {
  if (s === "O(n)" || s === "O(1)") return "text-green-400";
  if (s.includes("log")) return "text-sky-400";
  if (s.includes("²")) return "text-red-400";
  return "text-slate-300";
}

function complexityDisplay(s: string): React.ReactNode {
  if (!s.endsWith("*")) return s;
  return <>{s.slice(0, -1)}<sup>*</sup></>;
}

// ─── Code panel ───────────────────────────────────────────────────────────────

function CodePanel({ label, code, onCopy, copied }: {
  label: string;
  code: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
      <div className="flex items-center px-4 py-2.5 border-b border-slate-800">
        <span className="text-sm font-semibold text-slate-300">🐍 {label}</span>
        <button
          onClick={onCopy}
          className="ml-auto text-xs text-slate-400 hover:text-slate-200 transition-colors px-2 py-1 rounded hover:bg-slate-800"
        >
          {copied ? "✓ copied!" : "copy"}
        </button>
      </div>
      <pre className="px-5 py-4 text-sm font-mono leading-relaxed overflow-x-auto text-slate-300 whitespace-pre">
        <code>{highlight(code)}</code>
      </pre>
    </div>
  );
}

// ─── Bar chart ────────────────────────────────────────────────────────────────

function BarChart({ step, showPivot }: { step: SortStep; showPivot: boolean }) {
  const maxVal = 20;
  return (
    <div className="flex items-end gap-0.5 h-36 sm:h-44 px-1">
      {step.array.map((val, i) => {
        const isSwapping = step.swapping.includes(i);
        const isPivot = showPivot && step.pivot === i;
        const isComparing = step.comparing.includes(i);
        const isSorted = step.sorted.includes(i);

        let bg = "bg-slate-600";
        if (isSorted) bg = "bg-emerald-500";
        if (isComparing) bg = "bg-yellow-400";
        if (isPivot) bg = "bg-orange-500";
        if (isSwapping) bg = "bg-red-500";

        const heightPct = Math.max((val / maxVal) * 100, 4);
        return (
          <div
            key={i}
            className="flex-1 flex items-end"
            style={{ height: "100%" }}
          >
            <div
              className={`w-full rounded-t-sm ${bg}`}
              style={{ height: `${heightPct}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend({ showPivot }: { showPivot: boolean }) {
  const items = [
    { color: "bg-slate-600", label: "Unsorted" },
    { color: "bg-yellow-400", label: "Comparing" },
    ...(showPivot ? [{ color: "bg-orange-500", label: "Pivot" }] : []),
    { color: "bg-red-500", label: "Swapping" },
    { color: "bg-emerald-500", label: "Sorted" },
  ];
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
      {items.map(({ color, label }) => (
        <div key={label} className="flex items-center gap-1.5">
          <div className={`w-3 h-3 rounded-sm ${color}`} />
          <span className="text-xs text-slate-400">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function makeArray() {
  return Array.from({ length: 12 }, () => Math.floor(Math.random() * 20) + 1);
}

export default function SortingAlgorithmsClient() {
  const [activeTab, setActiveTab] = useState<AlgorithmId | "compare">("bubble");
  const [array, setArray] = useState<number[]>(makeArray);
  const [steps, setSteps] = useState<SortStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(300);
  const [copied, setCopied] = useState(false);
  const [copiedAlt, setCopiedAlt] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Regenerate steps when algorithm or array changes
  useEffect(() => {
    if (activeTab === "compare") return;
    const newSteps = generateSteps(activeTab, array);
    setSteps(newSteps);
    setCurrentStep(0);
    setIsPlaying(false);
  }, [activeTab, array]);

  // Manage play/pause interval
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, speed);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, speed, steps.length]);

  const handleShuffle = useCallback(() => {
    setIsPlaying(false);
    setArray(makeArray());
  }, []);

  const handlePlayPause = useCallback(() => {
    if (currentStep >= steps.length - 1) {
      setCurrentStep(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((p) => !p);
    }
  }, [currentStep, steps.length]);

  const handleStep = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep((p) => Math.min(p + 1, steps.length - 1));
  }, [steps.length]);

  const handleCopy = useCallback(async () => {
    const algo = ALGORITHMS.find((a) => a.id === activeTab);
    if (!algo) return;
    await navigator.clipboard.writeText(algo.pythonCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [activeTab]);

  const handleCopyAlt = useCallback(async () => {
    const algo = ALGORITHMS.find((a) => a.id === activeTab);
    if (!algo?.altPythonCode) return;
    await navigator.clipboard.writeText(algo.altPythonCode);
    setCopiedAlt(true);
    setTimeout(() => setCopiedAlt(false), 1500);
  }, [activeTab]);

  const handleTabChange = useCallback((tab: AlgorithmId | "compare") => {
    setActiveTab(tab);
    setIsPlaying(false);
  }, []);

  const currentAlgo: AlgorithmMeta | undefined = ALGORITHMS.find((a) => a.id === activeTab);
  const currentStepData = steps[currentStep];
  const atEnd = currentStep >= steps.length - 1;

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex overflow-x-auto gap-1 pb-1 -mx-1 px-1">
        {ALGORITHMS.map((algo) => (
          <button
            key={algo.id}
            onClick={() => handleTabChange(algo.id)}
            className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === algo.id
                ? "bg-violet-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
            }`}
          >
            {algo.emoji} {algo.name}
          </button>
        ))}
        <button
          onClick={() => handleTabChange("compare")}
          className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === "compare"
              ? "bg-violet-600 text-white"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
          }`}
        >
          📊 Compare All
        </button>
      </div>

      {/* Algorithm tab */}
      {activeTab !== "compare" && currentAlgo && (
        <div className="space-y-5">
          {/* Fun header */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
            <div className="text-xl font-bold text-white mb-1">
              {currentAlgo.emoji} {currentAlgo.name}
            </div>
            <p className="text-slate-400 italic">{currentAlgo.metaphor}</p>
          </div>

          {/* Demo */}
          <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 text-sm text-slate-400 font-medium">
              Animated Demo
            </div>
            <div className="p-4">
              {currentStepData && (
                <BarChart step={currentStepData} showPivot={activeTab === "quick"} />
              )}
              <Legend showPivot={activeTab === "quick"} />

              {/* Controls */}
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <button
                  onClick={handleShuffle}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm font-medium transition-colors"
                >
                  🔀 Shuffle
                </button>
                <button
                  onClick={handlePlayPause}
                  className="px-3 py-1.5 rounded-lg bg-violet-700 hover:bg-violet-600 text-white text-sm font-medium transition-colors"
                >
                  {isPlaying ? "⏸ Pause" : atEnd ? "↩ Restart" : "▶ Play"}
                </button>
                <button
                  onClick={handleStep}
                  disabled={atEnd}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                >
                  Step →
                </button>
                <span className="text-xs text-slate-500 ml-1">
                  {currentStep + 1} / {steps.length}
                </span>
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-xs text-slate-500">Slow</span>
                  <input
                    type="range"
                    min={50}
                    max={800}
                    step={50}
                    value={800 - speed + 50}
                    onChange={(e) => setSpeed(800 - Number(e.target.value) + 50)}
                    className="w-20 accent-violet-500"
                    aria-label="Animation speed"
                  />
                  <span className="text-xs text-slate-500">Fast</span>
                </div>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-3">
            <h3 className="font-semibold text-slate-200">How does it work?</h3>
            <p className="text-slate-300 leading-relaxed text-sm">{currentAlgo.description}</p>
            <p className="text-xs text-slate-500 italic border-t border-slate-800 pt-3">
              💡 {currentAlgo.funFact}
            </p>
          </div>

          {/* Python code */}
          <div className="space-y-3">
            <CodePanel
              label={currentAlgo.pythonCodeLabel ?? "🐍 Python"}
              code={currentAlgo.pythonCode}
              onCopy={handleCopy}
              copied={copied}
            />
            {currentAlgo.altPythonCode && (
              <>
                <div className="bg-amber-950/40 border border-amber-800/50 rounded-xl p-4 text-sm text-amber-200/80 leading-relaxed">
                  <span className="font-semibold text-amber-300">Two versions? Here&apos;s why: </span>
                  {currentAlgo.altExplanation}
                </div>
                <CodePanel
                  label={currentAlgo.altPythonLabel ?? "🐍 Python (alt)"}
                  code={currentAlgo.altPythonCode}
                  onCopy={handleCopyAlt}
                  copied={copiedAlt}
                />
              </>
            )}
          </div>

          {/* Complexity summary */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
            <h3 className="font-semibold text-slate-200 mb-3 text-sm">Speed &amp; Space</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Best case", value: currentAlgo.timeComplexity.best },
                { label: "Average", value: currentAlgo.timeComplexity.avg },
                { label: "Worst case", value: currentAlgo.timeComplexity.worst },
                { label: "Extra space", value: currentAlgo.spaceComplexity },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className={`font-mono font-bold text-sm ${complexityColor(value)}`}>
                    {complexityDisplay(value)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{label}</div>
                </div>
              ))}
            </div>
            {currentAlgo.altPythonCode && (
              <p className="mt-3 text-xs text-slate-500">
                * Best case is O(n²) for the naive version shown above. The optimized version with early exit achieves O(n) on an already-sorted list.
              </p>
            )}
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className="text-slate-400">Stable sort?</span>
              <span className={currentAlgo.stable ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>
                {currentAlgo.stable ? "✓ Yes" : "✗ No"}
              </span>
              <span className="text-xs text-slate-600 ml-1">
                {currentAlgo.stable
                  ? "(equal items keep their original order)"
                  : "(equal items may be reordered)"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Compare All tab */}
      {activeTab === "compare" && (
        <div className="space-y-5">
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
            <h3 className="font-bold text-white mb-1">📊 Side-by-Side Comparison</h3>
            <p className="text-sm text-slate-400">
              How fast is each algorithm? These are Big O notations — they describe how the time
              grows as the list gets bigger. Smaller is better!
            </p>
          </div>

          <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-4 py-3 text-xs text-slate-400 uppercase tracking-widest font-semibold">
                    Algorithm
                  </th>
                  <th className="text-center px-3 py-3 text-xs text-slate-400 uppercase tracking-widest font-semibold">
                    Best
                  </th>
                  <th className="text-center px-3 py-3 text-xs text-slate-400 uppercase tracking-widest font-semibold">
                    Average
                  </th>
                  <th className="text-center px-3 py-3 text-xs text-slate-400 uppercase tracking-widest font-semibold">
                    Worst
                  </th>
                  <th className="text-center px-3 py-3 text-xs text-slate-400 uppercase tracking-widest font-semibold">
                    Space
                  </th>
                  <th className="text-center px-3 py-3 text-xs text-slate-400 uppercase tracking-widest font-semibold">
                    Stable?
                  </th>
                </tr>
              </thead>
              <tbody>
                {ALGORITHMS.map((algo, i) => (
                  <tr
                    key={algo.id}
                    className={`border-b border-slate-800/50 cursor-pointer hover:bg-slate-900 transition-colors ${
                      i === ALGORITHMS.length - 1 ? "border-b-0" : ""
                    }`}
                    onClick={() => handleTabChange(algo.id)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-200">
                        {algo.emoji} {algo.name}
                      </span>
                    </td>
                    <td className={`text-center px-3 py-3 font-mono text-xs font-semibold ${complexityColor(algo.timeComplexity.best)}`}>
                      {complexityDisplay(algo.timeComplexity.best)}
                    </td>
                    <td className={`text-center px-3 py-3 font-mono text-xs font-semibold ${complexityColor(algo.timeComplexity.avg)}`}>
                      {complexityDisplay(algo.timeComplexity.avg)}
                    </td>
                    <td className={`text-center px-3 py-3 font-mono text-xs font-semibold ${complexityColor(algo.timeComplexity.worst)}`}>
                      {complexityDisplay(algo.timeComplexity.worst)}
                    </td>
                    <td className={`text-center px-3 py-3 font-mono text-xs font-semibold ${complexityColor(algo.spaceComplexity)}`}>
                      {complexityDisplay(algo.spaceComplexity)}
                    </td>
                    <td className="text-center px-3 py-3">
                      <span className={algo.stable ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                        {algo.stable ? "✓" : "✗"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-emerald-400 font-mono font-bold mb-1">O(n)</div>
              <div className="text-xs text-slate-400">Super fast — goes through the list once. Best possible!</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-sky-400 font-mono font-bold mb-1">O(n log n)</div>
              <div className="text-xs text-slate-400">Really fast — splits the problem in half each time. Great for sorting!</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-red-400 font-mono font-bold mb-1">O(n²)</div>
              <div className="text-xs text-slate-400">Slow — checks every pair. Fine for small lists, painful for big ones.</div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 text-sm text-slate-400">
            <span className="font-semibold text-slate-300">What does &quot;stable&quot; mean?</span>{" "}
            When two items have the same value, a stable sort keeps them in their original order.
            This matters when you&apos;re sorting something like a list of students by grade — you want
            students with the same grade to stay in alphabetical order!
          </div>

          <p className="text-xs text-slate-600">
            * Bubble Sort&apos;s best case is O(n²) for the naive version. With an early-exit optimization
            (stopping when no swaps occur in a pass), the best case improves to O(n).
          </p>
        </div>
      )}
    </div>
  );
}
