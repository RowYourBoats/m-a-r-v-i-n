// Pinning for the index feeds (Work, Practice, Tools).
//
// One shared rule so the three pages don't diverge: pinned cards float to the
// top, and *within* the pinned group — and within the rest — each page keeps
// its own natural order (Practice/Tools by date, Work by year then project).
// So pinning three essays lifts those three above the feed, ordered among
// themselves by the same date rule as everything else; unpinned cards follow
// unchanged.
//
// `pinned` is sourced per content type but means the same thing everywhere:
//   - a writing essay  → `pinned: true` in its frontmatter
//   - a project        → `pinned: true` on its _project.md, propagated to that
//                         project's manifest items by build-manifest.mjs
export function pinnedFirst<T>(
  items: T[],
  isPinned: (item: T) => boolean,
  naturalCompare: (a: T, b: T) => number,
): T[] {
  return [...items].sort(
    (a, b) => Number(isPinned(b)) - Number(isPinned(a)) || naturalCompare(a, b),
  );
}
