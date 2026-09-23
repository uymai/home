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
    metaphor: "Like bubbles rising in a glass of soda, big numbers float to the end!",
    description:
      "Picture a row of number cards. Look at the first two cards. If the left one is bigger, swap them. Then move one step to the right and compare the next two. When you reach the end of the row, the BIGGEST number has \"bubbled\" all the way to the end! Go back to the start and do it again. Each trip through the row moves the next-biggest number into its spot.",
    timeComplexity: { best: "O(n²)", avg: "O(n²)", worst: "O(n²)" },
    spaceComplexity: "O(1)",
    stable: true,
    funFact: "Bubble Sort is so slow that computer scientists use it as the classic example of what NOT to do. But it's great for learning!",
    pythonCode: `def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr`,
  },
  {
    id: "bubble-opt",
    name: "Bubble Sort+",
    emoji: "🫧",
    metaphor: "Same bubbles, but smarter: it knows when to stop early!",
    description:
      "This is Bubble Sort with one clever trick. On each trip through the row, we keep track of whether we swapped anything. If we get all the way to the end without a single swap, the list must already be in order, so we stop right away! On a list that's already sorted, that means just one trip instead of one trip per card. Shuffle a few times and watch how often it stops early.",
    timeComplexity: { best: "O(n)", avg: "O(n²)", worst: "O(n²)" },
    spaceComplexity: "O(1)",
    stable: true,
    funFact: "Adding just a few lines of code (the \"swapped\" check) turns an always-slow sort into a sometimes-fast one. A small idea can make a big difference!",
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
    metaphor: "Just like sorting playing cards in your hand, one card at a time!",
    description:
      "Picture picking up playing cards one at a time. Each time you pick up a new card, you slide it into the right spot among the cards already in your hand. Sometimes you have to scoot a few cards over to make room. The cards in your hand are always in order. You just keep adding one more card at a time until you're holding them all.",
    timeComplexity: { best: "O(n)", avg: "O(n²)", worst: "O(n²)" },
    spaceComplexity: "O(1)",
    stable: true,
    funFact: "Insertion Sort is actually FASTER than Quick Sort on tiny lists! That's why Tim Sort (the sort Python really uses) uses it for small chunks.",
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
    metaphor: "Pick a \"referee\" number, split everyone into a smaller team and a bigger team, then sort each team!",
    description:
      "Pick one number to be the \"pivot\" (we use the last one). Move every number smaller than the pivot to its left, and every bigger number to its right. Now the pivot is in its PERFECT final spot! Then do the same trick on the left group, and again on the right group. Keep splitting into smaller and smaller groups until each group has just one number. Then the whole list is sorted! This trick of breaking a big problem into smaller ones is called \"divide and conquer.\"",
    timeComplexity: { best: "O(n log n)", avg: "O(n log n)", worst: "O(n²)" },
    spaceComplexity: "O(log n)",
    stable: false,
    funFact: "Quick Sort is usually one of the fastest sorts in real life, so lots of programming languages use it. But it has a bad day: if the list is already sorted and you always pick the last number as the pivot, it gets as slow as Bubble Sort!",
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
      "Split a deck of cards into two piles. Split each of those in half, and keep going until every pile has just one card. A pile with one card is already sorted! Now join the piles back together, two at a time. To join two sorted piles, look at the top card of each and take the smaller one. Keep doing that until both piles are used up. Two-card piles become four-card piles, then eight, and so on, until you have one big sorted pile!",
    timeComplexity: { best: "O(n log n)", avg: "O(n log n)", worst: "O(n log n)" },
    spaceComplexity: "O(n)",
    stable: true,
    funFact: "Merge Sort is ALWAYS O(n log n). Unlike Quick Sort, it never has a \"bad day\"!",
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
      "First, arrange the numbers into a \"heap.\" Think of a family tree where every parent is bigger than its kids. That means the biggest number is always at the very top! Now swap the top number with the last number that isn't sorted yet. The biggest number is now at the end, in its final spot. Fix up the heap so the next-biggest number rises to the top, and do it again. It's like a contest that always knows who the current champion is.",
    timeComplexity: { best: "O(n log n)", avg: "O(n log n)", worst: "O(n log n)" },
    spaceComplexity: "O(1)",
    stable: false,
    funFact: "Heap Sort barely needs any extra memory (that's what O(1) space means). Merge Sort needs a whole extra list to hold the piles, but Heap Sort does all its work right inside the original list!",
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
    metaphor: "Python's secret weapon: two great ideas mixed together into one super-fast sort!",
    description:
      "Tim Sort is the real sorting method Python uses when you call list.sort()! It mixes two ideas. First, it cuts the list into small chunks called \"runs\" and sorts each chunk with Insertion Sort, which is great for small lists. Then it joins the sorted chunks together using Merge Sort's merging trick. The real Tim Sort is even smarter: it looks for parts of the list that are already in order and doesn't waste time on them. Using the best tool for each job makes it super fast on real-world data!",
    timeComplexity: { best: "O(n)", avg: "O(n log n)", worst: "O(n log n)" },
    spaceComplexity: "O(n)",
    stable: true,
    funFact: "Tim Peters invented Tim Sort in 2002, just for Python. It worked so well that Java, Android, and the JavaScript in the Chrome web browser started using it too!",
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
