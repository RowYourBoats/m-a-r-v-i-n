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

See `src/data/schema.json` for live values.

- Work pinned: spatial, identity, keynote, interactive, editorial
- Work expanded: poster, event, web, campaign, deck, merch, motion, video, data-visualization, photography, illustration, 3d
- Practice pinned: real-time, letter-form, video
- Practice expanded: essay, installation, exhibition

`build-projects.mjs` preserves both filter sets across rebuilds. To add or rename a filter, edit `schema.json` directly — it round-trips cleanly.

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
