---
title: Diagrams
section: Frontend
order: 3
summary: The animated-SVG diagram system and how to add one.
---

Animated SVG diagrams render both at `/diagrams/[slug]` and inline inside a `layout: doc` project body. They're built client-side and mounted into a placeholder, with a lifecycle that respects the viewport and reduced-motion.

## Pieces

- Content collection `src/content/diagrams/*.md` — frontmatter: `title`, `caption`, `component` (filename in `src/components/diagrams/` without `.astro`), optional `project_keys` (show "From:" links) and `aspect_ratio`.
- `src/components/diagrams/<slug>.client.ts` — exports a `mount(root)` that builds the SVG(s) into `root` and wires `attachLifecycle()`.
- `src/components/diagrams/registry.ts` — maps a diagram key → its mount function.
- `src/components/diagrams/_runtime.ts` — `attachLifecycle(target, start, stop)`: never starts under `prefers-reduced-motion`; uses an `IntersectionObserver` (100px margin) to start when visible and stop when off-screen; old browsers fall back to always-on.
- `src/lib/remark-diagram.mjs` — intercepts a ` ```diagram ` fence and replaces it with `<div class="diagram-mount" data-diagram="<slug>">`. The slug is the first word of the fence body.

Diagram CSS (`.diagram*`, `--diagram-*` tokens) lives in `global.css` so it applies in both render contexts; tokens re-theme with dark mode automatically.

## Inline in a project doc

A ` ```diagram ` fence with the diagram key inside becomes a mount placeholder; `/projects/[slug].astro` calls `mountAll()` on load to hydrate every placeholder from the registry. The fence is handled by `remark-diagram.mjs`, which is in the global markdown config — so it works in both project docs and essay bodies (any content-collection render).

## Adding a new diagram

1. Write `src/components/diagrams/<slug>.client.ts` exporting `mount(root)` (build SVG, call `attachLifecycle`).
2. Register it in `registry.ts` (`<slug>: mount<Slug>`).
3. Create `src/content/diagrams/<slug>.md` with `title` / `caption` / `component` (+ optional `project_keys`, `aspect_ratio`) for the standalone `/diagrams/<slug>` page.
4. Use it inline with a ` ```diagram ` fence naming the slug.

The first instance is Connectivity (an all-to-all flash + a nearest-neighbor grid-routing animation); more are planned.
