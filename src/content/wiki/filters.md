---
title: Filters
section: Frontend
order: 1
summary: Curated filter bars, label/matches, ?tag deep links.
---

The `/work` and `/practice` filter bars are curated, not derived from a tag union. The two sets live in `src/data/schema.json` under `work_filters` and `practice_filters`, each with `pinned` and `expanded` arrays.

## `label` / `matches`

Each entry is a `{ label, matches[] }` pair:

```json
{ "label": "spatial", "matches": ["exhibition", "installation", "retail"] }
```

`label` is the button text. `matches` is the list of underlying values that count as a hit — checked against each item's `data-tags`, which is only `item.tags` (the per-image axes: format, characteristics, content, medium). `item.project_tags` is intentionally not in this set — project-level facets like `retail` no longer leak into the per-item filter, so a motion video in a retail-themed project doesn't surface under `spatial`. (`project_tags` is still emitted on every item for a future page-assembler — "pull all items from `retail` projects.")

The separation lets one button cover several values: `spatial` matches exhibition OR installation OR retail; `editorial` matches editorial and publication-design. A `label` need not be a real tag value.

## Current sets

`src/data/schema.json` is the source of truth for both sets — don't trust prose listings of chip names, they go stale. `build-projects.mjs` preserves both filter sets across rebuilds. To add or rename a filter, edit `schema.json` directly — it round-trips cleanly.

## Minimum-count threshold

The schema is a statement of intent; what renders is gated by real counts. At build time each page counts how many of its cards each chip would match (`src/lib/filter-counts.ts`, same match rule as the client JS) and skips chips under `MIN_FILTER_COUNT` (5). Practice counts both image items and essay cards. Dead chips — which would blank the grid when clicked — never render, and thin chips (e.g. `merch` on Work) reappear on their own once enough hidden work publishes. If fewer than 2 chips survive, the whole filter bar is omitted. A `?tag=X` deep link to a hidden chip still filters via the synthetic-fallback path on Work.

## Admin facet

`/admin/images` (dev only) has a "site filters" select that mirrors this system: for each row it derives which public chip(s) the image would light up (flat union of format/characteristics/content/medium against the schema `matches`), shows live counts per chip in the option labels, and offers `no chip (n)` to surface images invisible to every public filter. Read-only reflection — the facet never edits `schema.json`.

## Behavior

- Clicks apply OR semantics: show items whose tags include any active match. State lives in `?tag=X` (via `history.replaceState`, so no history pollution), restored on back-navigation.
- `?tag=X` deep-links: if `X` matches a filter button label, that button is clicked; otherwise a synthetic single-value filter on `X` is applied.
- On mobile (≤680px), tapping "Filter" opens a fullscreen overlay; all chips (pinned + expanded) show at once — no "more" step there. The shared client helper is `src/components/PortfolioPageScript.astro` (`initFilterTrigger()`).

## Project-level facet vocabularies

Drawn from `schema.json` via the projects' authored values; back the curated `matches` arrays:

- `market`: b2b, b2c, b2b2c, internal, personal
- `project_type`: retail, exhibition, event, campaign, internal-tools, editorial, keynote, installation, publication-design, teaching, writing
- `sector`: tech, telecom, furniture, fashion, cultural-institution, education, architecture, design-studio, quantum-computing, personal
- `characteristic`: interactive, real-time, generative
