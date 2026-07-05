// Build-time chip visibility + ordering for the index feed filter bars
// (Work, Practice).
//
// The chip taxonomy in schema.json (work_filters / practice_filters) is a
// curated statement of intent — it stays intact across content shifts. What
// actually *renders* is decided here:
//
// 1. Visibility — a chip only shows if it matches at least MIN_FILTER_COUNT
//    cards in the page's current feed. Dead chips (which would blank the
//    grid when clicked) and near-singletons disappear on their own, and
//    reappear automatically once enough content publishes.
// 2. Order — chips that match largely the same cards (print/poster,
//    typography/letter-form) shouldn't sit next to each other. Each group is
//    ordered to minimize adjacent-pair Jaccard overlap: worst pair first,
//    mean as tie-break. Groups of ≤8 are solved exactly; larger ones fall
//    back to greedy + pairwise-swap improvement. Pinned and expanded stay
//    separate groups, but the expanded chain seeds off the last pinned chip
//    since they read as one row when expanded (and always on mobile).
//
// The match rule mirrors the client-side filter JS exactly: a card is a hit
// when any of the chip's `matches` values appears in the card's data-tags.

export const MIN_FILTER_COUNT = 5;

export type FilterDef = { label: string; matches: string[] };
export type CountedFilter = FilterDef & { count: number };

type ChipWithSet = CountedFilter & { set: Set<number> };

function jaccard(a: Set<number>, b: Set<number>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const i of a) if (b.has(i)) inter++;
  return inter / (a.size + b.size - inter);
}

// Anti-overlap ordering. `prev` lets the expanded group continue the chain
// from the last pinned chip — its boundary pair counts toward the objective.
// Objective per ordering: [worst adjacent overlap, sum of adjacent overlaps]
// compared lexically. Groups of ≤8 chips (all current sets' pinned, and
// expanded once thin chips are hidden … usually) are solved exactly by DFS
// with pruning; larger groups use a greedy chain plus pairwise-swap
// improvement, which can land in a local optimum but stays cheap. Both paths
// are deterministic, so the rendered HTML is stable across requests.
const EXACT_ORDER_MAX = 8;

function spreadByOverlap(
  chips: ChipWithSet[],
  prev: ChipWithSet | null,
): ChipWithSet[] {
  if (chips.length < 2) return chips;

  // Stable base order (by count, then label) + precomputed pair overlaps.
  const base = [...chips].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label),
  );
  const n = base.length;
  // Index n stands for the `prev` anchor chip.
  const J: number[][] = Array.from({ length: n + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i < n; i++)
    for (let k = i + 1; k < n; k++)
      J[i][k] = J[k][i] = jaccard(base[i].set, base[k].set);
  if (prev) for (let i = 0; i < n; i++) J[n][i] = J[i][n] = jaccard(prev.set, base[i].set);

  const scoreOf = (order: number[]): [number, number] => {
    let worst = 0;
    let sum = 0;
    let last = prev ? n : -1;
    for (const idx of order) {
      if (last >= 0) {
        const j = J[last][idx];
        if (j > worst) worst = j;
        sum += j;
      }
      last = idx;
    }
    return [worst, sum];
  };
  const better = (a: [number, number], b: [number, number]) =>
    a[0] < b[0] - 1e-9 || (Math.abs(a[0] - b[0]) < 1e-9 && a[1] < b[1] - 1e-9);

  let bestOrder = base.map((_, i) => i);
  let bestScore = scoreOf(bestOrder);

  if (n <= EXACT_ORDER_MAX) {
    // Exact: DFS over permutations, pruning any prefix whose worst adjacent
    // pair already ties-or-beats the incumbent's.
    const used = new Array(n).fill(false);
    const order: number[] = [];
    const dfs = (last: number, worst: number, sum: number) => {
      if (order.length === n) {
        const s: [number, number] = [worst, sum];
        if (better(s, bestScore)) {
          bestScore = s;
          bestOrder = [...order];
        }
        return;
      }
      for (let i = 0; i < n; i++) {
        if (used[i]) continue;
        const j = last >= 0 ? J[last][i] : 0;
        const w = Math.max(worst, j);
        if (w > bestScore[0] + 1e-9) continue;
        used[i] = true;
        order.push(i);
        dfs(i, w, sum + j);
        order.pop();
        used[i] = false;
      }
    };
    dfs(prev ? n : -1, 0, 0);
  } else {
    // Greedy chain: repeatedly append the least-overlapping remaining chip…
    const remaining = base.map((_, i) => i);
    const out: number[] = [];
    while (remaining.length) {
      const anchor = out.length ? out[out.length - 1] : prev ? n : -1;
      let pick = 0;
      if (anchor >= 0) {
        let bestSim = Infinity;
        for (let i = 0; i < remaining.length; i++) {
          if (J[anchor][remaining[i]] < bestSim) {
            bestSim = J[anchor][remaining[i]];
            pick = i;
          }
        }
      }
      out.push(remaining.splice(pick, 1)[0]);
    }
    // …then take any pairwise swap that improves the objective.
    let current = scoreOf(out);
    let improved = true;
    while (improved) {
      improved = false;
      for (let i = 0; i < n; i++) {
        for (let k = i + 1; k < n; k++) {
          [out[i], out[k]] = [out[k], out[i]];
          const next = scoreOf(out);
          if (better(next, current)) {
            current = next;
            improved = true;
          } else {
            [out[i], out[k]] = [out[k], out[i]];
          }
        }
      }
    }
    bestOrder = out;
  }

  return bestOrder.map((i) => base[i]);
}

export function visibleFilters(
  set: { pinned: FilterDef[]; expanded: FilterDef[] },
  tagLists: string[][],
  min: number = MIN_FILTER_COUNT,
): { pinned: CountedFilter[]; expanded: CountedFilter[] } {
  const withSet = (f: FilterDef): ChipWithSet => {
    const s = new Set<number>();
    tagLists.forEach((tags, i) => {
      if (f.matches.some((m) => tags.includes(m))) s.add(i);
    });
    return { ...f, count: s.size, set: s };
  };
  const keep = (defs: FilterDef[]) =>
    defs.map(withSet).filter((f) => f.count >= min);

  const pinned = spreadByOverlap(keep(set.pinned), null);
  const expanded = spreadByOverlap(
    keep(set.expanded),
    pinned[pinned.length - 1] || null,
  );
  const strip = ({ set: _set, ...chip }: ChipWithSet): CountedFilter => chip;
  return { pinned: pinned.map(strip), expanded: expanded.map(strip) };
}
