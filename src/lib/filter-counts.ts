// Build-time chip visibility for the index feed filter bars (Work, Practice).
//
// The chip taxonomy in schema.json (work_filters / practice_filters) is a
// curated statement of intent — it stays intact across content shifts. What
// actually *renders* is decided here: a chip only shows if it matches at
// least MIN_FILTER_COUNT cards in the page's current feed. Dead chips (which
// would blank the grid when clicked) and near-singletons disappear on their
// own, and reappear automatically once enough content publishes — no manual
// re-curation when hidden_from_feed items start surfacing.
//
// The match rule mirrors the client-side filter JS exactly: a card is a hit
// when any of the chip's `matches` values appears in the card's data-tags.

export const MIN_FILTER_COUNT = 5;

export type FilterDef = { label: string; matches: string[] };
export type CountedFilter = FilterDef & { count: number };

export function visibleFilters(
  set: { pinned: FilterDef[]; expanded: FilterDef[] },
  tagLists: string[][],
  min: number = MIN_FILTER_COUNT,
): { pinned: CountedFilter[]; expanded: CountedFilter[] } {
  const withCount = (f: FilterDef): CountedFilter => ({
    ...f,
    count: tagLists.reduce(
      (n, tags) => n + (f.matches.some((m) => tags.includes(m)) ? 1 : 0),
      0,
    ),
  });
  const keep = (defs: FilterDef[]) =>
    defs.map(withCount).filter((f) => f.count >= min);
  return { pinned: keep(set.pinned), expanded: keep(set.expanded) };
}
