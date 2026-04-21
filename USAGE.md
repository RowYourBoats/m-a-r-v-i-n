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

Four sources of content, unified by a project registry:

1. **Project registry** — `_project.md` files in each `public/images/<Folder>/`, compiled to `src/data/projects.json`
2. **Images** — files in `public/images/<Folder>/`, described in `public/images/image_catalogue.json`, hosted on Vercel Blob
3. **Essays** — markdown in `src/content/writing/*.md` (Astro content collection)
4. **CV bullets** — markdown in `src/content/bullets/*.md` (junction to Jullie-Resume)

Generated files (do not hand-edit):
- `src/data/manifest.json` — generated from catalogue + projects.json
- `src/data/schema.json` — generated from projects.json
- `src/data/projects.json` — generated from `_project.md` files

### Project registry (`_project.md`)

Each image folder has a `_project.md` that defines the project. This is the **source of truth** for project identity.

```yaml
---
slug: herman-miller
name: Herman Miller
client: Herman Miller
aliases:
  - Herman Miller
  - HermanMiller
date_range: 2017-2019
roles:
  - Global Brand Designer
category: experience
portfolio_tags:
  - brand
  - spatial
  - print
  - merch
personal: false
description: ""
credits:
  - role: Design
    name: Marvin de Jong
videos:
  - title: Walkthrough
    url: https://player.vimeo.com/video/...
---

Optional prose description (rendered on project page).
```

Key fields:
- `slug` — canonical project key, used in URLs and manifest
- `aliases` — all name variants (resolves naming mismatches between systems)
- `image_folders` — derived from which folder the `_project.md` lives in
- `portfolio_tags` — display tags for the Work page filter bar
- `videos` — Vimeo embed URLs, generated as video items in the manifest
- `personal` — `true` → shows on Practice; `false` → shows on Work

**To add a new project:** create a folder in `public/images/`, add a `_project.md`, drop images in, then run `npm run build-data`.

**Bidirectional sync:**
- Edit `_project.md` files → run `node scripts/build-projects.mjs` → generates `projects.json`
- Edit `projects.json` → run `node scripts/scatter-projects.mjs` → updates `_project.md` files

### Images and Vercel Blob

Images live locally in `public/images/<Folder>/` but are **hosted on Vercel Blob** (CDN). The manifest references Blob URLs (`https://ws6i2dfuggcaavs2.public.blob.vercel-storage.com/...`), not local paths.

To upload new/changed images to Blob:
```
node --env-file=.env scripts/upload-blob.mjs
```

Requires `BLOB_READ_WRITE_TOKEN` in `.env`.

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
  "created": "2026-04-13T23:12:22.000Z",
  "created_date": "2026-04-13",
  "date_source": "estimated",
  "project_date_range": "2019-2022"
}
```

Date priority: `exif` > filesystem date within `project_date_range` > range start year > filesystem fallback.

**Profile images on `/marvin`** go through the same pipeline:
- Folder: `public/images/m-a-r-v-i-n/` with `01_`, `02_` numeric prefix for order.
- Catalogue entry per file; `title` field becomes the `<figcaption>` on the rendered page.
- `projects.json` has an `m-a-r-v-i-n` entry with `personal: true` and `image_folders: ["m-a-r-v-i-n"]` so the manifest groups them under `project: "m-a-r-v-i-n"`.
- `src/pages/marvin.astro` filters `manifest.items` by `project === "m-a-r-v-i-n"`, sorts by id (filename-derived, so `01_` < `02_`).

Swap workflow: drop new file → add/edit catalogue entry with `title` → `node scripts/build-manifest.mjs` → `node --env-file=.env scripts/upload-blob.mjs` → commit.

### CV bullets (content collection)

Sourced from Jullie-Resume via a directory junction (`src/content/bullets/` → `Jullie-Resume/input/bullets/`). Post-refactor (2026-04-20), each bullet is a single file with sizes as body sections. Filename pattern is `{slug}-{id}.md` where `{id}` is a 6-char hex.

```yaml
---
category: experience       # experience | teaching | exhibition | education | award | skill | writing
company: Herman Miller
role: Global Brand Designer
project: Picnic — the Herman Miller Design System (brand pillar)
date: May 2017 – June 2019
id: d91fb7                  # 6-char hex — matches filename suffix
tags:
  - brand-standards
  - design-documentation
  - ~cross-functional-collaboration   # ~prefix = secondary tag
---

## Small

- One-line version of the bullet, for tight resume layouts.

## Medium

- First list item, used in a standard resume.
- Second list item.

## Large

Prose narrative. May be multiple paragraphs. Used for long-form resume or portfolio detail views.
```

**Section classification** in `/marvin`:
- `experience`/`teaching` with a Large body and no `project` → **Roles** (e.g. `role-scope-*` files)
- `experience` (any other shape) → **Projects** (grouped by `company|project`, size slider picks variant)
- `teaching` (non-role) → **Teaching** (its own section, no size slider)
- `exhibition`/`writing` → **Exhibitions & Publications**
- `education`/`award`/`skill` → their own sections

**Size slider behavior:** for the Projects section, rows are grouped by `company|project`. The slider picks one size (small/medium/large) to show per group; falls back to the nearest available if the exact size isn't present.

**Junction setup** (needed after fresh clone on Windows):
```
cmd /c "mklink /J src\content\bullets D:\ClaudeCoding\Jullie-Resume\input\bullets"
```

### Bullet ↔ image-folder linking (via `id`)

The 6-char `id` in bullet frontmatter is the stable handle for linking bullets to image folders. Every row rendered on `/marvin` carries `data-bullet-id="<id>"` so downstream JS or project pages can query by it.

**Recommended integration pattern** (not yet wired):

1. Add `bullet_ids: ["d91fb7", "a8cafe"]` to each entry in `src/data/projects.json`. List all bullet ids whose work is represented by the project's image folder.
2. Manifest stays as-is (keyed by project slug, not bullet id).
3. A project page can resolve bullets → images by looking up `projects[slug].bullet_ids`, and the /marvin table can resolve rows → project images by reverse-indexing (`bulletId → project slug`) from projects.json.

**Why this shape:**
- Bullets are authored in Jullie and synced via junction. Adding a reverse field on the bullet (like `project_key:`) requires Jullie-side schema changes — we control `projects.json` locally, so putting the link there keeps authoring surfaces separated.
- One project typically owns multiple bullets (role-scope + individual project bullets). Array on the project side is natural.
- The 6-char id is filename-derived (content hash), so it survives edits/moves without breaking links as long as the body doesn't hash-collide.

**To prepare image folders with this in mind:**
- Group images under `public/images/<tier>/<client>/<project>/` as you do today.
- When adding a new project to `projects.json`, populate `bullet_ids` with any bullet whose content lives under that folder.
- If a bullet represents a cross-project role scope (no specific deliverables), leave it out of every project — it'll still show in Roles via the /marvin logic, just without a folder link.

**Where the id flows in the code:**
- `src/pages/marvin.astro` → `parseBody()` extracts sizes from body; each emitted row carries `bulletId: entry.data.id`.
- Rendered as `data-bullet-id` on each `<tr>` — inspectable in DOM, usable for JS lookup.
- `stripBold()` strips `**` markers from `where`/`what`/`how` at render time.

### Essays (content collection)

Essays live in `src/content/writing/*.md`:

```yaml
---
title: "Essay Title"
date: "2024-04-20"
tags: [essay, real-time]
excerpt: "One-line summary shown on the grid."
---

Essay body in markdown.
```

Essays appear on the Practice page as oversized title cards. Clicking expands the full body inline.

### Tag mapping

`src/data/tag-map.json` maps granular bullet tags (137 unique) to portfolio display tags (15). Used for cross-system filtering. Example: `"5g-campaigns" → "retail"`, `"unreal-engine-5" → "real-time"`.

## Build pipeline

```
npm run build-data
```

Runs three scripts in sequence:
1. `build-projects.mjs` — `_project.md` files → `projects.json` + `schema.json`
2. `mine-dates.mjs` — stamps file birthtimes onto catalogue entries
3. `build-manifest.mjs` — catalogue + `projects.json` → `manifest.json`

Run this after adding/moving images, editing `_project.md`, or updating the catalogue.

### Individual scripts

| Script | Purpose |
|---|---|
| `scripts/build-projects.mjs` | `_project.md` → `projects.json` + `schema.json` |
| `scripts/scatter-projects.mjs` | `projects.json` → `_project.md` (reverse sync) |
| `scripts/mine-dates.mjs` | Stamp file dates on catalogue entries |
| `scripts/build-manifest.mjs` | Catalogue + projects → manifest |
| `scripts/upload-blob.mjs` | Upload images to Vercel Blob, rewrite manifest URLs |
| `scripts/stamp-project-keys.mjs` | One-time: add `project_key` to bullet frontmatter |

## Pages

- `/` (Work) — non-personal items, masonry grid, tag filters, sorted newest first
- `/practice` — personal images + essays, light tag filter
- `/marvin` — bio, contact, profile images with captions (from manifest, project `m-a-r-v-i-n`), resume (5-column CV table: where/when/what/how/tags with size slider on Projects, section collapse, sort, search, company/category filters)
- `/projects/[slug]` — auto-generated per project from the manifest

## Password gate (under construction)

The site is gated behind a password via Astro middleware (`src/middleware.ts`).

- `SITE_PASSWORD` env var — the shared password (set in `.env` locally, in Vercel env vars for production)
- `SITE_LIVE=true` — disables the gate entirely (kill switch)
- Cookie-based session: 7-day `HttpOnly` cookie, SHA-256 hash of password

The gate page is at `src/pages/under-construction.astro`. Auth endpoint at `src/pages/api/auth.ts`.

## Deploying

Push to master. Vercel rebuilds automatically from GitHub (RowYourBoats/m-a-r-v-i-n).

```
git add .
git commit -m "update"
git push origin master
```

Images are on Vercel Blob — pushing code doesn't re-upload images. To upload new images, run `upload-blob.mjs` locally.

## Design tokens

All spacing and typography is controlled by two CSS variables in `src/styles/global.css`:

- `--fs: clamp(14px, 1.5625vw, 40px)` — font size, scales from 14px (mobile) to 40px (4K 27")
- `--pad: clamp(32px, 2.5vw, 64px)` — all padding/gaps, scales from 32px to 64px

One font (PP Neue Montreal Regular), one weight (400), one line-height (1.2). Font file goes in `public/fonts/PPNeueMontreal-Regular.woff2`.

Multi-paragraph body copy: wrap in `<div class="prose">` for tight `p + p` spacing.

## Known-stale tooling

`scripts/post.mjs` — pre-dates the registry-based flow. Appends directly to `manifest.json`, which gets overwritten by `build-manifest.mjs`. Should be rewritten or removed.
