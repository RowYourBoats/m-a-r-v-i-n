---
title: Essays & tools
section: Content
order: 4
summary: The writing collection, essay folders, tools tier, layout:doc pages.
---

## Essays (the `writing` collection)

Essays are markdown under `public/images/` — the `writing` collection globs `**/[!_]*.md` (any non-underscore `.md`; `_project.md` is excluded). The entry id/slug is the path relative to `public/images` without the extension.

Convention: one folder per essay. Put the essay `.md` and its images together, with no `_project.md`:

```
public/images/practice/<essay>/
  <essay>.md          ← the essay
  some-image.jpg      ← companion image(s)
```

`build-manifest` flags every image sharing an essay's folder with `essay_of: <essay-id>` and `hidden_from_feed: true`, so they don't appear as standalone grid cards — they belong to the essay. A folder with a `_project.md` is a project instead; don't mix the two.

```yaml
---
title: "Essay Title"
date: "2024-04-20"
tags: [essay, real-time]
excerpt: "One-line summary shown on the grid."
cover: "some-image.jpg"   # optional — which companion image to show on the card
order: ["00-cover.jpg"]   # optional — explicit figure order; else alphabetical
layout: gallery           # optional — "standard" (default) or "gallery"
client: "The Politic"     # optional — the publication this appeared in
credits:                  # optional — collaborators
  - role: Design
    name: Marvin de Jong
videos:                   # optional — background/UI Vimeo (see Page elements)
  - title: Process capture
    url: https://player.vimeo.com/video/123456
    video_mode: background
    featured: true        # full-bleed at the top of the essay
---

Essay body in markdown.
```

The optional fields beyond `title`/`date` come from a schema fragment (`src/lib/content-schema.mjs`) shared with project docs, so essays and projects carry the same shape — lean by default, richer when a piece needs it. See [Page elements](/wiki/page-elements) for the `videos`/`credits` recipes.

Essays appear on Practice as oversized title cards (title + cover image). Clicking expands the body inline; the standalone page is `/writing/<slug>`. New images in an essay folder still need a catalogue pass (`stub-catalogue` or the miner) before they resolve.

Inline images by bare filename — `![cap](file.png)` — are resolved to Blob URLs (with width/height + lazy loading) at render time by `remark-essay-images.mjs`. An inline-referenced image is pulled out of the side rail so it isn't duplicated. The plugin is in the global markdown config, so it runs for both essays and `layout: doc` project bodies (the filename resolves against each document's own folder).

## Tools tier

`/tools` is its own tier. Tools are authored as essay-style `writing` entries under `public/images/tools/` (same treatment as Practice essays — title-first card, optional cover, a `/writing` page, an outbound link). A tool project not yet migrated to an essay still renders from the project pipeline at `/projects/<slug>`. Intro copy comes from `src/content/pages/tools.md`. The `/tools` page de-duplicates: a folder migrated to an essay is excluded from the legacy-project list.

## Markdown-authored project pages (`layout: doc`)

A project can render its detail page as the markdown body of its own `_project.md` instead of the default media grid. Opt in with `layout: doc` (the frontmatter still feeds `projects.json`). `/projects/[slug]` renders the body via the `projects` content collection (`render(entry)`), the same Astro pipeline essays use.

- Loaded by a custom collection loader (`src/lib/projects-loader.ts`) that reads the `_project.md` files directly — the content-layer glob ignores `_`-prefixed files, but a custom loader has no such restriction, so we keep the underscore (it still keeps these files out of the essay collection and out of build-manifest's essay-folder detection). The umbrella → sub-project fan-out stays in `build-projects.mjs`.
- Frontmatter is validated by the shared schema (`src/lib/content-schema.mjs`) — the same module the essay collection uses, so the two can't drift.
- Inline images and diagrams work the same as in essays: `remark-essay-images.mjs` resolves bare filenames to Blob URLs and `remark-diagram.mjs` mounts ` ```diagram ` fences, both from the global markdown config. See [Diagrams](/wiki/diagrams).
- Code fences render as plain `<pre><code>` (no Shiki) so they stay in the minimal one-font palette, reskinned by `.projectdoc` CSS.

Used by the tools tier (e.g. `tools/jullie-app`).
