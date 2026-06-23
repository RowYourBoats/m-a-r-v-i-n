---
title: Pages & routing
section: Frontend
order: 0
summary: Route map, per-page data/sort, theme, masonry, Vimeo pausing.
---

Output mode is `server` (SSR via the Vercel adapter). Pages are on-demand unless they opt into prerender.

## Route map

| Route | What |
|---|---|
| `/` (Marvin) | Editorial home — bio prose + `sections` from `src/content/pages/marvin.md`. See [Editorial home & filmstrip](/wiki/editorial-home-and-filmstrip). |
| `/work` | Full work archive: non-personal items, masonry grid, curated tag filters, newest first. |
| `/practice` | Personal images + essays, curated filters. |
| `/tools` | Tools tier — essay write-ups + legacy tool projects. See [Essays & tools](/wiki/essays-and-tools). |
| `/resume` | Intro + CV table (5 columns, size slider on Projects). See [CV bullets](/wiki/cv-bullets). |
| `/projects/[slug]` | Per project from the manifest — media grid, or a `layout: doc` markdown page. |
| `/diagrams/[slug]` | Animated SVG diagram pages. See [Diagrams](/wiki/diagrams). |
| `/writing/[slug]` | Standalone essay pages. |
| `/admin/images` | Dev-only tagging portal (404 in prod). |
| `/wiki`, `/wiki/[slug]` | This wiki (dev-only, 404 in prod). |
| `/api/items`, `/api/auth` | JSON endpoints (see below + [Auth & gating](/wiki/auth-and-gating)). |

Nav order: Marvin · Work · Practice · Tools (Wiki appears only in dev). Résumé is linked from the footer. `/projects/[slug]` and `/resume` pass a `section` prop to `Base.astro` to light up the right nav item (the path alone can't tell which tier).

## Per-page data & sorting

- `/work` — manifest items with `personal: false` and not `hidden_from_feed`; sorted year desc, then by project (so a project's videos sit adjacent to its images). Snapshot-only / unrouted cards render as `<div>`, not a dead `<a>`.
- `/practice` — essays from the `writing` collection (`id` starts `practice/`) merged with personal manifest items; reverse-chronological by real date, falling back to year, then 0.
- `/tools` — essays (`id` starts `tools/`) plus legacy tool projects, excluding folders already migrated to essays; reverse-chronological by year then title.
- `/projects/[slug]` — `layout: doc` body if present, else an ordered media grid (`orderItems()`). Project-page videos strip `background=1` to expose Vimeo chrome. Shows a couple of related items sharing the project's main tag.

## Filters & deep links

Filter state lives in the URL (`?tag=X`), not component state. See [Filters](/wiki/filters).

## `/api/items`

`GET /api/items?tag=&client=&medium=&project=&year=` → `{ items: [...] }`. Filters the manifest server-side (OR semantics on tag; client is case-insensitive; year via the project lookup). A query surface for client-side or external use.

## Theme system (light / dark)

- An inline script in `Base.astro` `<head>` reads `localStorage.theme` (default `light`) and sets `<html data-theme="…">` before first paint, so the page never flashes the wrong mode.
- The nav `.theme-toggle` button flips `data-theme` and persists to `localStorage`. The glyph is a CSS `::before` (☽ in light, ☀ in dark).
- All colors are CSS custom properties redefined under `[data-theme="dark"]`, so SVG diagrams and everything else re-theme automatically. See [Layout & design](/wiki/layout-and-design).

## Masonry engine

The grids are a single CSS grid; an inline script in `Base.astro` measures each `.grid-item` and assigns `grid-row-end: span N` to produce masonry. It re-runs on resize (debounced 100ms) and via `window.relayoutMasonry()` (called when filters change). A `ResizeObserver` on every item catches lazy-loaded images and font swaps; old browsers fall back to per-image load listeners. `/work` and `/practice` also SSR-seed the spans from each image's aspect ratio so lazy-loading doesn't all fire at once on first paint.

## Off-screen Vimeo pausing

Each Vimeo iframe is a full Player SPA — dozens on `/work` would burn ~2.5 GB of RAM and pin a CPU core. An `IntersectionObserver` (100px root margin) sends the Vimeo Player API `pause`/`play` over `postMessage` as iframes leave/enter the viewport. `loading="lazy"` handles the initial defer; messages sent before a player is ready are harmlessly dropped.
