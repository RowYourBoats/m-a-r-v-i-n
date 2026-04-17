# Usage

## Running locally

```
npm run dev
```

Astro watches all files and hot-reloads on save. No restart needed when editing markdown, images, or styles.

## Frontmatter gotcha

If a title or description contains `:` or other special YAML characters (`#`, `[`, `]`, `{`, `}`), wrap it in quotes:

```yaml
title: "Perdido Street Station: Architectural Crevices"
```

Without quotes, YAML interprets the colon as a key-value separator and the build fails.

## Content model

There are **three** sources of content:

1. **Images** — files in `public/images/<FolderName>/`, described in `public/images/image_catalogue.json`
2. **Essays** — markdown in `src/content/writing/*.md`, served via an Astro content collection
3. **Project/item manifest** — `src/data/manifest.json`, **generated** from the catalogue by `scripts/build-manifest.mjs`. Do not hand-edit.

Taxonomy (tag/medium/client vocabulary) lives in `src/data/schema.json`.

### Images — folder-as-project

Images live in `public/images/<FolderName>/…`. The top-level folder is the source of truth for which project an image belongs to. The mapping from folder → project is defined in `scripts/build-manifest.mjs` under `FOLDER_MAP`:

```js
"HermanMiller":      { key: "herman-miller", title: "Herman Miller", client: "Herman Miller" },
"Verizon_Selection": { key: "verizon",       title: "Verizon",       client: "Verizon" },
"Verizon Decks-JPG": { key: "verizon",       title: "Verizon",       client: "Verizon" },
"Yale":              { key: "yale",          title: "Yale",          client: "Yale", personal: true },
"IndependentProjects": { key: "snapshot",    title: "Snapshots",     personal: true },
// …
```

- Multiple folders can collapse into one project (e.g. both `Verizon_*` folders → `verizon`).
- A folder marked `personal: true` is shown on the Practice page, not Work.
- Unmapped folders fall back to the `snapshot` project.
- To add a new client, drop the folder under `public/images/`, add an entry to `FOLDER_MAP`, then rebuild.

### `image_catalogue.json`

Each entry describes one image:

```json
{
  "title": "DFFPM Logo Design",
  "description": "A minimalist logo…",
  "tags": ["brand", "typography"],
  "medium": "identity",
  "client": "DFFPM",
  "style": "minimalist geometric typography",
  "file_path": "DFFPM/Screenshot 2026-04-13 231222.png",
  "created": "2026-04-13T23:12:22.000Z"
}
```

`file_path` is the image's path relative to `public/images/`. The `client` field is informational — the actual grouping is done by the folder name via `FOLDER_MAP`. `created` is stamped by `scripts/mine-dates.mjs`.

### Rebuilding the manifest

Run after adding or moving images, or after editing the catalogue:

```
node scripts/mine-dates.mjs      # stamps file birthtime onto each catalogue entry
node scripts/build-manifest.mjs  # regenerates src/data/manifest.json (archives the old one)
```

`build-manifest.mjs` does the following:

- Archives the current manifest to `src/data/manifest.archive.json`
- Groups items by folder → project via `FOLDER_MAP`
- Auto-generates item `id`s from file paths
- Carries over `title`, `description`, `tags`, `medium`, `style`, `created`, and derives `year` from `created`
- Marks items in `personal` folders with `personal: true` (plus the `snapshot` tag for the `snapshot` project)
- Only creates project records for keys that actually have items

### Essays (content collection)

Essays live in `src/content/writing/*.md` with this frontmatter:

```yaml
---
title: "Essay Title"
date: "2024-04-20"
tags: [essay, real-time]
excerpt: "One-line summary shown on the grid."
personal: true   # optional; currently all essays are shown on Practice
---

Essay body in markdown.
```

The collection schema is defined in `src/content.config.ts`. Essays render into the Practice page as oversized cards; clicking a card expands the full body inline via a hidden `<template>` — no runtime fetch.

To add an essay: drop a new `.md` file in `src/content/writing/` and restart `npm run dev` (Astro picks up new collection entries on restart).

## Pages

- `/` (Work) — non-personal items only, grouped into a masonry grid with tag filters. `essay` is excluded from Work's filter bar.
- `/practice` — personal images + essays, with a light tag filter bar.
- `/marvin` — bio + profile images.
- `/projects/[slug]` — auto-generated per project from the manifest.

## Deploying

Push to main. Vercel rebuilds automatically.

```
git add .
git commit -m "add project"
git push
```

If you updated images or the catalogue, remember to rebuild the manifest locally first and commit the new `src/data/manifest.json`.

## Design tokens

All spacing and typography is controlled by two CSS variables in `src/styles/global.css`:

- `--fs: clamp(14px, 1.5625vw, 40px)` — font size, scales from 14px (mobile) to 40px (4K 27")
- `--pad: clamp(32px, 2.5vw, 64px)` — all padding/gaps, scales from 32px to 64px

One font (PP Neue Montreal Regular), one weight (400), one line-height (1.2). Font file goes in `public/fonts/PPNeueMontreal-Regular.woff2`.

Multi-paragraph body copy should be wrapped in `<div class="prose">` — that class applies a tight `p + p` margin so paragraphs don't inherit the site-wide flex gap.

## Known-stale tooling

`scripts/post.mjs` (the old `npm run post` CLI) pre-dates the catalogue-based flow. It appends directly to `manifest.json`, which gets overwritten on the next `build-manifest.mjs` run. It should either be rewritten to append to `image_catalogue.json` instead, or removed. Don't use it until that decision is made.
