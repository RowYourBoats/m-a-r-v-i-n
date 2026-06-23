---
title: Layout & design
section: Frontend
order: 2
summary: Design tokens, the one-font rule, and the layout class vocabulary.
---

All styling lives in `src/styles/global.css`, imported globally by `Base.astro`.

## The rules

- One font: PP Neue Montreal Regular (`public/fonts/PPNeueMontreal-Regular.woff2`).
- One weight: 400, everywhere. Headings are `font-weight: 400` and `font-size: inherit` — hierarchy comes from color, spacing, and position, never weight or size jumps. The site never bolds; `**markdown**` is neutralized (`strong { font-weight: inherit }`).
- One line-height: 1.2.
- Emphasis via color (the accent + the Dick Bruna palette) and italics/spacing, not weight.

## Design tokens

```css
--fs-base:      clamp(14px, 1.5625vw, 1.3rem);  /* mobile floor (~14–21px) */
--fs-body:      clamp(14px, 2.5vw, 48px);        /* desktop ceiling 3em — body, intros, nav */
--fs-secondary: clamp(14px, 1.667vw, 32px);      /* desktop ceiling 2em — CV table, captions, this wiki */
--pad:          clamp(32px, 2.5vw, 64px);        /* all padding/gaps */
--pad-sm:       clamp(8px, 0.625vw, 16px);       /* caption-to-image gap */
--pad-bottom:   derived;                          /* bottom margin under captioned cells */
```

Colors: `--color-bg`, `--color-fg`, `--color-accent` (#ed0f0a), `--color-code-bg`, plus the Bruna palette (`--color-green/blue/red/yellow/orange/purple/brown`). All are redefined under `[data-theme="dark"]`, so everything (including SVG diagrams via `--diagram-*`) re-themes from one place. See the theme system in [Pages & routing](/wiki/pages-and-routing).

Mobile (≤760px) flattens both `--fs-body` and `--fs-secondary` back to `--fs-base`, so the type hierarchy disappears at small sizes.

## Layout classes

- `.page` — the page shell: flex column, `--pad` gap and padding.
- `.page-intro` — page-intro copy on `/work`, `/practice`, `/resume`. `max-width: 66.6667%` on desktop, full-width below 760px.
- `.editorial` — editorial home column. Vertical flex, `--pad` gap. No max-width — filmstrips are intentionally full-bleed.
- `.editorial-lead` — lead prose under the title on `/`. `max-width: 60ch`.
- `.prose-line` — body-style paragraph for `kind: text` sections. `--fs-body`, `max-width: 60ch`.
- `.filmstrip-stage` — grid-stacked primary/inactive slots so swapping doesn't reflow. No height cap — aspect ratio honored at full width.
- `.filmstrip-thumbs` — horizontal thumb row; `overflow-x: auto` on narrow viewports.
- `.project-media` — project page media stack, full width within the page padding.
- `.hero-feed` — legacy; not used by any page after the home rewrite. Safe to remove if it doesn't return.

The `/resume` CV table (`.cv-head`, `.cv-filters`, `.cv-table-wrap`) is explicitly sized at `--fs-secondary` so it stays at 2em while the rest of the page uses `--fs-body` (3em desktop). This wiki follows the same reasoning — a reference tool, sized for density.

## Doc / prose vocabulary

Multi-paragraph body copy: wrap in `<div class="prose">` for tight `p + p` spacing. Markdown-rendered docs use:

- `.prose.projectdoc` — `layout: doc` project bodies. Accent `h2`s, no-bold guard, single flex-gap rhythm.
- `.essay` — essay bodies (`/writing`), with a "lobotomized owl" rhythm and a side rail of figures.
- A shared `:is(.projectdoc, .essay)` block covers code, lists, and the `.flow` / `.callout` / `.axis` diagram primitives + color labels.
- `.wiki-body` — this wiki: built on `.prose`, sized `--fs-secondary`, with its own owl rhythm and table styling.
