export type SortStep = {
  array: number[];
  comparing: number[];
  swapping: number[];
  sorted: number[];
  pivot?: number;
};

export type AlgorithmId = "bubble" | "bubble-opt" | "insertion" | "quick" | "merge" | "heap" | "tim";

export type AlgorithmMeta = {
  id: AlgorithmId;
  name: string;
  emoji: string;
  metaphor: string;
  description: string;
  timeComplexity: { best: string; avg: string; worst: string };
  spaceComplexity: string;
  stable: boolean;
  funFact: string;
  pythonCode: string;
  pythonCodeLabel?: string;
  altPythonCode?: string;
  altPythonLabel?: string;
  altExplanation?: string;
};

function snap(arr: number[], comparing: number[], swapping: number[], sorted: Set<number>, pivot?: number): SortStep {
  return {
    array: [...arr],
    comparing,
    swapping,
    sorted: Array.from(sorted),
    ...(pivot !== undefined ? { pivot } : {}),
  };
}

function bubbleSteps(input: number[]): SortStep[] {
  const arr = [...input];
  const n = arr.length;
  const sorted = new Set<number>();
  const steps: SortStep[] = [];
  steps.push(snap(arr, [], [], sorted));

  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1 - i; j++) {
      steps.push(snap(arr, [j, j + 1], [], sorted));
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        steps.push(snap(arr, [], [j, j + 1], sorted));
      }
    }
    sorted.add(n - 1 - i);
  }
  sorted.add(0);
  steps.push(snap(arr, [], [], sorted));
  return steps;
}

function bubbleOptSteps(input: number[]): SortStep[] {
  const arr = [...input];
  const n = arr.length;
  const sorted = new Set<number>();
  const steps: SortStep[] = [];
  steps.push(snap(arr, [], [], sorted));

  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - 1 - i; j++) {
      steps.push(snap(arr, [j, j + 1], [], sorted));
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        steps.push(snap(arr, [], [j, j + 1], sorted));
        swapped = true;
      }
    }
    sorted.add(n - 1 - i);
    if (!swapped) {
      // Early exit: no swaps means everything remaining is already sorted
      for (let k = 0; k < n - 1 - i; k++) sorted.add(k);
      break;
    }
  }
  sorted.add(0);
  steps.push(snap(arr, [], [], sorted));
  return steps;
}

function insertionSteps(input: number[]): SortStep[] {
  const arr = [...input];
  const n = arr.length;
  const sorted = new Set<number>([0]);
  const steps: SortStep[] = [];
  steps.push(snap(arr, [], [], sorted));

  for (let i = 1; i < n; i++) {
    const key = arr[i];
    let j = i - 1;
    steps.push(snap(arr, [i, j < 0 ? 0 : j], [], sorted));
    while (j >= 0 && arr[j] > key) {
      arr[j + 1] = arr[j];
      steps.push(snap(arr, [], [j + 1, j], sorted));
      j--;
    }
    arr[j + 1] = key;
    for (let k = 0; k <= i; k++) sorted.add(k);
    steps.push(snap(arr, [], [], sorted));
  }
  return steps;
}

function quickSteps(input: number[]): SortStep[] {
  const arr = [...input];
  const sorted = new Set<number>();
  const steps: SortStep[] = [];
  steps.push(snap(arr, [], [], sorted));

  function partition(lo: number, hi: number): number {
    const pivotVal = arr[hi];
    let i = lo - 1;
    steps.push(snap(arr, [], [], sorted, hi));
    for (let j = lo; j < hi; j++) {
      steps.push(snap(arr, [j, hi], [], sorted, hi));
      if (arr[j] <= pivotVal) {
        i++;
        if (i !== j) {
          [arr[i], arr[j]] = [arr[j], arr[i]];
          steps.push(snap(arr, [], [i, j], sorted, hi));
        }
      }
    }
    const pivotPos = i + 1;
    if (pivotPos !== hi) {
      [arr[pivotPos], arr[hi]] = [arr[hi], arr[pivotPos]];
      steps.push(snap(arr, [], [pivotPos, hi], sorted, pivotPos));
    }
    sorted.add(pivotPos);
    steps.push(snap(arr, [], [], sorted, pivotPos));
    return pivotPos;
  }

  function qsort(lo: number, hi: number) {
    if (lo >= hi) {
      sorted.add(lo);
      return;
    }
    const p = partition(lo, hi);
    qsort(lo, p - 1);
    qsort(p + 1, hi);
    for (let k = lo; k <= hi; k++) sorted.add(k);
    steps.push(snap(arr, [], [], sorted));
  }

  qsort(0, arr.length - 1);
  steps.push(snap(arr, [], [], sorted));
  return steps;
}

function mergeSteps(input: number[]): SortStep[] {
  const arr = [...input];
  const n = arr.length;
  const sorted = new Set<number>();
  const steps: SortStep[] = [];
  steps.push(snap(arr, [], [], sorted));

  function merge(lo: number, mid: number, hi: number) {
    const left = arr.slice(lo, mid + 1);
    const right = arr.slice(mid + 1, hi + 1);
    let i = 0, j = 0, k = lo;

    while (i < left.length && j < right.length) {
      steps.push(snap(arr, [lo + i, mid + 1 + j], [], sorted));
      if (left[i] <= right[j]) {
        arr[k] = left[i++];
      } else {
        arr[k] = right[j++];
      }
      steps.push(snap(arr, [], [k], sorted));
      k++;
    }
    while (i < left.length) {
      arr[k] = left[i++];
      steps.push(snap(arr, [], [k], sorted));
      k++;
    }
    while (j < right.length) {
      arr[k] = right[j++];
      steps.push(snap(arr, [], [k], sorted));
      k++;
    }
  }

  let width = 1;
  while (width < n) {
    for (let lo = 0; lo < n; lo += width * 2) {
      const mid = Math.min(lo + width - 1, n - 1);
      const hi = Math.min(lo + width * 2 - 1, n - 1);
      if (mid < hi) merge(lo, mid, hi);
    }
    width *= 2;
  }
  for (let k = 0; k < n; k++) sorted.add(k);
  steps.push(snap(arr, [], [], sorted));
  return steps;
}

function heapSteps(input: number[]): SortStep[] {
  const arr = [...input];
  const n = arr.length;
  const sorted = new Set<number>();
  const steps: SortStep[] = [];
  steps.push(snap(arr, [], [], sorted));

  function siftDown(root: number, size: number) {
    while (true) {
      let largest = root;
      const left = 2 * root + 1;
      const right = 2 * root + 2;
      if (left < size) {
        steps.push(snap(arr, [largest, left], [], sorted));
        if (arr[left] > arr[largest]) largest = left;
      }
      if (right < size) {
        steps.push(snap(arr, [largest, right], [], sorted));
        if (arr[right] > arr[largest]) largest = right;
      }
      if (largest === root) break;
      [arr[root], arr[largest]] = [arr[largest], arr[root]];
      steps.push(snap(arr, [], [root, largest], sorted));
      root = largest;
    }
  }

  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    siftDown(i, n);
  }
  steps.push(snap(arr, [], [], sorted));

  for (let end = n - 1; end > 0; end--) {
    [arr[0], arr[end]] = [arr[end], arr[0]];
    sorted.add(end);
    steps.push(snap(arr, [], [0, end], sorted));
    siftDown(0, end);
  }
  sorted.add(0);
  steps.push(snap(arr, [], [], sorted));
  return steps;
}

function timSteps(input: number[]): SortStep[] {
  const arr = [...input];
  const n = arr.length;
  const RUN = 4;
  const sorted = new Set<number>();
  const steps: SortStep[] = [];
  steps.push(snap(arr, [], [], sorted));

  function insertionSortRange(lo: number, hi: number) {
    for (let i = lo + 1; i <= hi; i++) {
      const key = arr[i];
      let j = i - 1;
      steps.push(snap(arr, [i, j < lo ? lo : j], [], sorted));
      while (j >= lo && arr[j] > key) {
        arr[j + 1] = arr[j];
        steps.push(snap(arr, [], [j + 1, j], sorted));
        j--;
      }
      arr[j + 1] = key;
    }
    for (let k = lo; k <= hi; k++) sorted.add(k);
    steps.push(snap(arr, [], [], sorted));
  }

  function merge(lo: number, mid: number, hi: number) {
    const left = arr.slice(lo, mid + 1);
    const right = arr.slice(mid + 1, hi + 1);
    let i = 0, j = 0, k = lo;
    while (i < left.length && j < right.length) {
      steps.push(snap(arr, [lo + i, mid + 1 + j], [], sorted));
      if (left[i] <= right[j]) {
        arr[k] = left[i++];
      } else {
        arr[k] = right[j++];
      }
      steps.push(snap(arr, [], [k], sorted));
      k++;
    }
    while (i < left.length) { arr[k] = left[i++]; steps.push(snap(arr, [], [k], sorted)); k++; }
    while (j < right.length) { arr[k] = right[j++]; steps.push(snap(arr, [], [k], sorted)); k++; }
  }

  for (let start = 0; start < n; start += RUN) {
    insertionSortRange(start, Math.min(start + RUN - 1, n - 1));
  }

  let width = RUN;
  while (width < n) {
    for (let lo = 0; lo < n; lo += width * 2) {
      const mid = Math.min(lo + width - 1, n - 1);
      const hi = Math.min(lo + width * 2 - 1, n - 1);
      if (mid < hi) merge(lo, mid, hi);
    }
    width *= 2;
  }
  for (let k = 0; k < n; k++) sorted.add(k);
  steps.push(snap(arr, [], [], sorted));
  return steps;
}

export function generateSteps(id: AlgorithmId, input: number[]): SortStep[] {
  switch (id) {
    case "bubble": return bubbleSteps(input);
    case "bubble-opt": return bubbleOptSteps(input);
    case "insertion": return insertionSteps(input);
    case "quick": return quickSteps(input);
    case "merge": return mergeSteps(input);
    case "heap": return heapSteps(input);
    case "tim": return timSteps(input);
  }
}

export const ALGORITHMS: AlgorithmMeta[] = [
  {
    id: "bubble",
    name: "Bubble Sort",
    emoji: "🫧",
    metaphor: "Like bubbles rising to the surface — big numbers float to the end!",
    description:
      "Imagine you have a row of numbered cards. You look at two cards next to each other. If the bigger number is on the left, you swap them. Then you move one step to the right and check again. After one full pass, the BIGGEST number has \"bubbled\" all the way to the end! You keep doing this over and over, and each pass, the next biggest number finds its home.",
    timeComplexity: { best: "O(n²)*", avg: "O(n²)", worst: "O(n²)" },
    spaceComplexity: "O(1)",
    stable: true,
    funFact: "Bubble sort is so slow that computer scientists use it as the classic example of what NOT to do — but it's great for learning!",
    pythonCode: `def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr`,
    pythonCodeLabel: "Naive version — O(n²) always",
    altPythonCode: `def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        swapped = False
        for j in range(n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swapped = True
        if not swapped:
            break  # already sorted!
    return arr`,
    altPythonLabel: "Optimized version — O(n) best case",
    altExplanation: "The naive version always runs every comparison no matter what — even if the list is already sorted, it keeps going. That's O(n²) in all cases. The optimized version tracks whether any swaps happened during a pass. If nothing got swapped, the list must already be sorted, so it stops early with `break`. On an already-sorted list, it only needs one pass — that's O(n)! The animation above uses the naive version so you can see every step clearly.",
  },
  {
    id: "bubble-opt",
    name: "Bubble Sort+",
    emoji: "🫧",
    metaphor: "Same bubbles, but smarter — it knows when to stop early!",
    description:
      "This is the same as Bubble Sort, but with one clever trick: we keep track of whether any swaps happened during a full pass. If we get all the way through without swapping anything, that means the list is already sorted — so we stop immediately! On a list that's already sorted, we only need one pass instead of n passes. On a nearly-sorted list, we stop much sooner too. Try shuffling and see how often it exits early!",
    timeComplexity: { best: "O(n)", avg: "O(n²)", worst: "O(n²)" },
    spaceComplexity: "O(1)",
    stable: true,
    funFact: "This tiny one-line change (tracking the swapped flag) is the difference between always-slow and sometimes-fast. A small idea can make a big difference!",
    pythonCode: `def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        swapped = False
        for j in range(n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swapped = True
        if not swapped:
            break  # already sorted — stop early!
    return arr`,
  },
  {
    id: "insertion",
    name: "Insertion Sort",
    emoji: "🃏",
    metaphor: "Just like sorting playing cards in your hand — one card at a time!",
    description:
      "Picture picking up playing cards one by one. When you pick up a new card, you slide it into the right spot among the cards you're already holding. You might need to move several cards to the right to make room. The left part of your hand is always sorted — you just keep growing it by inserting each new card in its correct position.",
    timeComplexity: { best: "O(n)", avg: "O(n²)", worst: "O(n²)" },
    spaceComplexity: "O(1)",
    stable: true,
    funFact: "Insertion sort is actually FASTER than quicksort on tiny lists! That's why Tim Sort (Python's real sort) uses it for small chunks.",
    pythonCode: `def insertion_sort(arr):
    for i in range(1, len(arr)):
        key = arr[i]
        j = i - 1
        while j >= 0 and arr[j] > key:
            arr[j + 1] = arr[j]
            j -= 1
        arr[j + 1] = key
    return arr`,
  },
  {
    id: "quick",
    name: "Quick Sort",
    emoji: "⚡",
    metaphor: "Pick a \"referee\" number and split the team into smaller and bigger — then sort each team!",
    description:
      "Choose a \"pivot\" number (we pick the last one). Now separate everything: numbers smaller than the pivot go to its left, bigger ones go to its right. The pivot is now in its PERFECT final spot! Then do the exact same trick on the left group and the right group. Keep splitting and sorting until every number is in its own group — and you're done! This divide-and-conquer trick is why it's called \"Quick\" Sort.",
    timeComplexity: { best: "O(n log n)", avg: "O(n log n)", worst: "O(n²)" },
    spaceComplexity: "O(log n)",
    stable: false,
    funFact: "Quick Sort is often the fastest sorting algorithm in practice, which is why it's used inside many programming languages and databases.",
    pythonCode: `def quick_sort(arr, lo=0, hi=None):
    if hi is None:
        hi = len(arr) - 1
    if lo < hi:
        p = partition(arr, lo, hi)
        quick_sort(arr, lo, p - 1)
        quick_sort(arr, p + 1, hi)
    return arr

def partition(arr, lo, hi):
    pivot = arr[hi]
    i = lo - 1
    for j in range(lo, hi):
        if arr[j] <= pivot:
            i += 1
            arr[i], arr[j] = arr[j], arr[i]
    arr[i + 1], arr[hi] = arr[hi], arr[i + 1]
    return i + 1`,
  },
  {
    id: "merge",
    name: "Merge Sort",
    emoji: "🧩",
    metaphor: "Split everything in half, sort each half, then carefully zip them back together!",
    description:
      "Imagine tearing a deck of cards in half, then in half again, and again — until each pile has just one card. A single card is always sorted! Now start combining piles: pick up two one-card piles and merge them into a sorted two-card pile. Combine two-card piles into four-card piles, and so on. When merging, you always compare the top card of each pile and take the smaller one. Keep merging until you have one big sorted pile!",
    timeComplexity: { best: "O(n log n)", avg: "O(n log n)", worst: "O(n log n)" },
    spaceComplexity: "O(n)",
    stable: true,
    funFact: "Merge Sort is one of the few algorithms that's ALWAYS O(n log n) — it never has a \"bad day\" unlike Quick Sort.",
    pythonCode: `def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return merge(left, right)

def merge(left, right):
    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1
    result.extend(left[i:])
    result.extend(right[j:])
    return result`,
  },
  {
    id: "heap",
    name: "Heap Sort",
    emoji: "🏔️",
    metaphor: "Build a \"biggest on top\" tower, then keep pulling the top off — it's always the next biggest!",
    description:
      "First, arrange all the numbers into a special structure called a \"max-heap\" — like a tree where every parent is bigger than its children. The biggest number is always at the very top! Swap the top with the last number, put that last spot aside (it's sorted!), and fix the heap so the new biggest floats back to the top. Repeat until everything is sorted. It's like a sorting machine that always knows the current champion.",
    timeComplexity: { best: "O(n log n)", avg: "O(n log n)", worst: "O(n log n)" },
    spaceComplexity: "O(1)",
    stable: false,
    funFact: "Heap Sort uses O(1) extra space unlike Merge Sort — it sorts everything right in place using the heap structure!",
    pythonCode: `def heap_sort(arr):
    n = len(arr)
    # Build max-heap
    for i in range(n // 2 - 1, -1, -1):
        sift_down(arr, i, n)
    # Extract elements one by one
    for end in range(n - 1, 0, -1):
        arr[0], arr[end] = arr[end], arr[0]
        sift_down(arr, 0, end)
    return arr

def sift_down(arr, root, size):
    while True:
        largest = root
        left = 2 * root + 1
        right = 2 * root + 2
        if left < size and arr[left] > arr[largest]:
            largest = left
        if right < size and arr[right] > arr[largest]:
            largest = right
        if largest == root:
            break
        arr[root], arr[largest] = arr[largest], arr[root]
        root = largest`,
  },
  {
    id: "tim",
    name: "Tim Sort",
    emoji: "🐍",
    metaphor: "Python's secret weapon — combines two great ideas for a super-fast real-world sort!",
    description:
      "Tim Sort is the actual algorithm Python uses when you call list.sort()! It combines two tricks: first, it chops the list into small chunks (called \"runs\") and sorts each chunk with Insertion Sort — which is great for small lists. Then it merges all those sorted chunks together using Merge Sort's clever merging trick. By using the best tool for each job, Tim Sort is incredibly fast on real-world data!",
    timeComplexity: { best: "O(n)", avg: "O(n log n)", worst: "O(n log n)" },
    spaceComplexity: "O(n)",
    stable: true,
    funFact: "Tim Sort was invented by Tim Peters in 2002 specifically for Python. It's so good that Java, Android, and Swift all copied it!",
    pythonCode: `# Python's built-in list.sort() IS Tim Sort!
# Here's a simplified version showing the key ideas:

RUN = 32  # sort small chunks with insertion sort

def tim_sort(arr):
    n = len(arr)
    # Phase 1: insertion sort each small run
    for start in range(0, n, RUN):
        end = min(start + RUN, n)
        insertion_sort(arr, start, end)
    # Phase 2: merge runs together
    size = RUN
    while size < n:
        for lo in range(0, n, size * 2):
            mid = min(lo + size, n)
            hi = min(lo + size * 2, n)
            if mid < hi:
                merge_inplace(arr, lo, mid, hi)
        size *= 2
    return arr`,
  },
];
