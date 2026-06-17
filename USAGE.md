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

**Always quote `date_range`, even a single year** — `date_range: "2026"`, not `date_range: 2026`. Unquoted, YAML parses a bare year as a *number*, and the build needs a string (it splits on `-` for ranges). `build-projects.mjs` validates this and fails loudly with the offending project named, but quoting up front avoids the round-trip. Ranges like `2021-2022` and `2015-present` already parse as strings, so they're fine either way — but quote for consistency.

## Image filename gotcha

Avoid these characters in image filenames — the build pipeline doesn't URL-encode paths when generating blob URLs, so any character that's special in a URL will silently break the image:

- `#` — browser treats as a fragment delimiter, strips everything after
- `?` — browser treats as the start of a query string
- `%` — would need to be encoded as `%25`, which the pipeline doesn't do

Safe to use: letters, digits, spaces, `-`, `_`, `.`, `+`, `()`. Spaces work but produce verbose URLs (`%20`); hyphens are cleaner.

If you spot a broken image whose blob URL clearly *should* exist, check for one of the above characters in the filename. Rename the file, run `node scripts/reconcile-catalogue-paths.mjs --apply` to heal the catalogue's `file_path`, then `node --env-file=.env scripts/upload-blob.mjs` to re-upload under the clean name.

## Project visibility

Four mechanisms to control where a project appears. Authored on the project's `_project.md` unless noted.

| What you want | How |
|---|---|
| Shown on `/work` | default for anything under `public/images/work/` |
| Shown on `/practice` instead | `personal: true` (or place under `practice/`) |
| Off both indexes, direct link gated by `SITE_PASSWORD` | `unlisted: true` on `_project.md` |
| Off both indexes, no project page either | `snapshot_only: true` (`/projects/<slug>` redirects home) |
| Off both indexes, project page may resolve | place the folder under any tier other than `work/` / `practice/` (sets `item.staging` automatically — useful as a holding pen) |

`hidden_from_feed` on individual manifest items is derived, not authored: set for every item in an `unlisted` project, and for any image that sits in an essay-companion folder (a folder containing a non-underscore `.md` file alongside the images).

### Chronological projects

By default, every item in a project takes its `year` from the project's `date_range` and clusters together in the grid feeds (Work / Practice) — that's the right behavior for a deck, a book, a campaign, anywhere the project is one coherent thing. Set `chronological: true` on a project's `_project.md` when the folder is instead a *timeline*: a snapshots collection, a journal, anything where each item has its own moment and should sort by capture date among other items in the feed. Pair it with `node scripts/mine-shot-dates.mjs <folder> --apply` to populate per-item dates from EXIF / filename patterns; `build-manifest` only honors those dates when the flag is set.

## Content model

Four sources of content, unified by a project registry:

1. **Project registry** — `_project.md` files in each `public/images/<Folder>/`, compiled to `src/data/projects.json`
2. **Images** — files in `public/images/<Folder>/`, described in `public/images/image_catalogue.json`, hosted on Vercel Blob
3. **Essays** — non-underscore markdown under `public/images/` (the `writing` collection; one folder per essay, co-located with its images — see [Essays](#essays-content-collection))
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
market: b2b2c              # one of: b2b, b2c, b2b2c, internal, personal
project_type:              # zero or more (defines what kind of work the project is)
  - retail                 # vocabulary: retail, exhibition, event, campaign, internal-tools,
  - exhibition             # editorial, keynote, installation, publication-design, teaching, writing
sector: furniture          # tech, telecom, furniture, fashion, cultural-institution,
                           # education, architecture, design-studio, quantum-computing, personal
characteristic: []         # zero or more: interactive, real-time, generative
role: Lead                 # optional — Marvin's role on the project (Lead, Design, Art Direction, ...)
scale: enterprise          # optional — enterprise, sme, individual
personal: false
description: ""
credits:
  - role: Design
    name: Marvin de Jong
videos:
  - title: Walkthrough
    url: https://player.vimeo.com/video/...
    video_mode: background    # "background" (default) or "ui" — see Video modes below
    featured: true            # optional — surface this video on the homepage hero feed
lead_images:
  - hero-shot.jpg             # filenames in this folder; matched items get featured: true
---

Optional prose description (rendered on project page).
```

Key fields:
- `slug` — canonical project key, used in URLs and manifest
- `aliases` — all name variants (resolves naming mismatches between systems)
- `image_folders` — derived from which folder the `_project.md` lives in
- `market` / `project_type` / `sector` / `characteristic` — the four project-level facets used for filtering and recruiter-context. Replaced the older `portfolio_tags:` field — see "Filter architecture" below for vocabularies and how the `/work` filter buttons translate to these values.
- `role` / `scale` — optional. Plumbed for the future art-direction cross-logic (subject = photography/illustration AND project.role contains "Art Direction") and recruiter-mode filtering.
- `videos` — Vimeo embed URLs, generated as video items in the manifest. Each entry may set `video_mode` and `featured` (see below)
- `lead_images` — list of image filenames in this folder that should be flagged `featured` in the manifest (the homepage hero feed reads from here)
- `personal` — `true` → shows on Practice; `false` → shows on Work

Sub-projects (a `projects:` map nested in the umbrella `_project.md`) inherit the four facets from the umbrella unless they explicitly override.

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

Each entry describes one image. Per-image tagging is stratified along four axes:

```json
{
  "title": "DFFPM Logo Design",
  "description": "A minimalist logo…",
  "medium": "print",                 // substrate (one): digital, print, environments, product, video
  "format": [],                      // artifact shape: deck, poster, editorial, publication-design,
                                     //   campaign, event, installation, exhibition, web, stationery,
                                     //   merch, booth, product-marking
  "characteristics": [],             // qualities the image embodies: interactive, motion, 3d, real-time, making
  "subject": ["logo"],               // what it's about: proposal, photography, illustration, typography,
                                     //   identity, data-visualization, letter-design, logo, study,
                                     //   product-render, diagram, iconography
  "client": "DFFPM",
  "style": "minimalist geometric typography",
  "file_path": "work/studio/dffpm/Screenshot 2026-04-13 231222.png",
  "created": "2026-04-13T23:12:22.000Z",
  "created_date": "2026-04-13",
  "date_source": "estimated",
  "project_date_range": "2019-2022"
}
```

The axes are authored independently — each array can be empty. The miner (`public/images/miner.cjs`) uses the "fail rather than reach" rule: when nothing in an axis clearly applies, the array stays empty rather than reaching for a weak match.

**`docs/tag-taxonomy.md` is the canonical reference** — closed vocabularies, per-tag definitions, migration log, and the recurring audit process. Update it whenever a tag decision is made. `public/images/schema.json` carries the auto-derived `tags` union for tooling but the editorial source of truth is the taxonomy doc.

Project-level concepts (retail, brand, exhibition, etc.) are NOT image tags — they live on the project's `_project.md` as the four facets. The build pipeline joins them in via `item.project_tags` at manifest time.

**Editing tags:** the dev-only admin portal (see "Admin media-tagging portal" below) is the normal way to edit catalogue + video tags. It writes `image_catalogue.json` and `_project.md` directly. For bulk vocabulary changes, write a dated one-shot migration script (see `scripts/migrate-tags-2026-05-13.mjs`) and audit before/after with `node scripts/audit-tags.mjs`.

Date priority: `exif` > filesystem date within `project_date_range` > range start year > filesystem fallback.

**Portraits / profile imagery on the editorial home `/`** — no auto-rendered gallery. The old `/marvin` page used to ingest `public/images/m-a-r-v-i-n/` as a `project: "m-a-r-v-i-n"` slot and render it as a side gallery; that block was dropped with the editorial-home rewrite. To surface portraits today, author them explicitly as a `kind: filmstrip` section in `src/content/pages/marvin.md` (see [Editorial home `/`](#editorial-home-)). The `public/images/m-a-r-v-i-n/` folder is no longer surfaced anywhere by default.

### CV bullets (content collection)

Bullets are **real committed files** in `src/content/bullets/*.md` — the old directory junction to Jullie-Resume is retired (it broke builds on machines without the junction). The gdrive editing source is still the source of truth; `npm run sync-bullets` mirrors it into the repo (`--apply` to write; dry-run by default). Each bullet is a single file with sizes as body sections. Filename pattern is `{slug}-{id}.md` where `{id}` is a 6-char hex.

```yaml
---
category: experience       # experience | teaching | exhibition | education | award | skill | writing
company: Herman Miller
role: Global Brand Designer
project: Picnic — the Herman Miller Design System (brand pillar)
date: May 2017 – June 2019
id: d91fb7                  # 6-char hex — matches filename suffix
order: 1                    # optional integer — lifts this bullet within a same-date group; unranked bullets fall to alphabetical-by-filename
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

**Section classification** in `/resume`:
- `experience`/`teaching` with a Large body and no `project` → **Roles** (e.g. `role-scope-*` files)
- `experience` (any other shape) → **Projects** (grouped by `company|project`, size slider picks variant)
- `teaching` (non-role) → **Teaching** (its own section, no size slider)
- `exhibition`/`writing`/`publication`/`talks` → **Exhibitions & Publications**
- `education`/`skill` → their own sections
- `award` → currently hidden (single bullet; section + dropdown option suppressed)

**Size slider behavior:** for the Projects section, rows are grouped by `company|project`. The slider picks one size (small/medium/large) to show per group; falls back to the nearest available if the exact size isn't present.

**Sort within a section:** primary `whenSort` desc (newest first) → `order` ascending among same-date bullets → unranked bullets stay in stable filename-alphabetical order. Use `order:` on the frontmatter to lift a bullet above its alphabetical peers when many bullets share a date (e.g. all `m-a-r-v-i-n` bullets share `June 2015 – Present`).

**Role-scope prefix strip:** some legacy role-scope bullets begin their Large body with `**Role scope** —` as an inline prefix. The render-time strip in `src/pages/resume.astro` removes it (redundant with the "Roles" section header). New bullets don't need the prefix; if they have it, the strip is idempotent.

**Updating bullets** (after editing them in the gdrive source):
```
npm run sync-bullets            # dry-run — prints the plan
npm run sync-bullets -- --apply # mirror into src/content/bullets
```
Mirror semantics: adds new bullets, overwrites changed ones, and deletes repo bullets no longer in the source (so renames propagate). Source resolves from `--src=<path>`, then `$BULLETS_SRC`, then the default `G:\My Drive\Claude Coding\Jullie-Resume-data\input\bullets` (Windows). On Mac, pass `--src` to the Google Drive equivalent. No junction or symlink needed.

### Bullet ↔ image-folder linking (via `id`)

The 6-char `id` in bullet frontmatter is the stable handle for linking bullets to image folders. Every row rendered on `/resume` carries `data-bullet-id="<id>"` so downstream JS or project pages can query by it.

**Recommended integration pattern** (not yet wired):

1. Add `bullet_ids: ["d91fb7", "a8cafe"]` to each entry in `src/data/projects.json`. List all bullet ids whose work is represented by the project's image folder.
2. Manifest stays as-is (keyed by project slug, not bullet id).
3. A project page can resolve bullets → images by looking up `projects[slug].bullet_ids`, and the /resume table can resolve rows → project images by reverse-indexing (`bulletId → project slug`) from projects.json.

**Why this shape:**
- Bullets are authored in Jullie and synced via junction. Adding a reverse field on the bullet (like `project_key:`) requires Jullie-side schema changes — we control `projects.json` locally, so putting the link there keeps authoring surfaces separated.
- One project typically owns multiple bullets (role-scope + individual project bullets). Array on the project side is natural.
- The 6-char id is filename-derived (content hash), so it survives edits/moves without breaking links as long as the body doesn't hash-collide.

**To prepare image folders with this in mind:**
- Group images under `public/images/<tier>/<client>/<project>/` as you do today.
- When adding a new project to `projects.json`, populate `bullet_ids` with any bullet whose content lives under that folder.
- If a bullet represents a cross-project role scope (no specific deliverables), leave it out of every project — it'll still show in Roles via the /resume logic, just without a folder link.

**Where the id flows in the code:**
- `src/pages/resume.astro` → `parseBody()` extracts sizes from body; each emitted row carries `bulletId: entry.data.id`.
- Rendered as `data-bullet-id` on each `<tr>` — inspectable in DOM, usable for JS lookup.
- `stripBold()` strips `**` markers from `where`/`what`/`how` at render time.

### Essays (content collection)

Essays are markdown files under `public/images/` — the `writing` collection globs
`**/[!_]*.md` (any non-underscore `.md`; `_project.md` is excluded). The entry
`id`/slug is the path relative to `public/images` without the extension.

**Convention: one folder per essay.** Put the essay `.md` and its images together
in their own folder, with **no `_project.md`**:

```
public/images/practice/<essay>/
  <essay>.md          ← the essay
  some-image.jpg      ← companion image(s)
```

build-manifest flags every image sharing an essay's folder with
`essay_of: <essay-id>` and `hidden_from_feed: true`, so the images don't appear
as standalone grid cards — they belong to the essay. (A folder with a
`_project.md` is a *project* instead; don't mix the two in one folder.)

```yaml
---
title: "Essay Title"
date: "2024-04-20"
tags: [essay, real-time]
excerpt: "One-line summary shown on the grid."
cover: "some-image.jpg"   # optional: which companion image to show on the card
---

Essay body in markdown.
```

Essays appear on the Practice page as oversized title cards. When the essay has
companion images, the card shows **title + cover image** (`cover` picks the
file; otherwise the first uploaded companion image is used). Clicking expands the
full body inline; the standalone essay page is at `/writing/<slug>`. New images
in an essay folder still need a catalogue pass (`stub-catalogue.mjs` or the
miner) before they resolve — same as any image.

### Tag mapping

`src/data/tag-map.json` maps granular bullet tags (137 unique) to portfolio display tags. Currently **not consumed by any code** — file exists but no script or page reads it. Listed under Known-stale tooling. Values still reference the pre-2026-05 vocabulary (`brand`, `spatial`, `typography`) and would need a remap to the current filter architecture (`identity`, `retail`, `exhibition`, etc.) before resurrecting.

## Filter architecture

The `/work` and `/practice` filter bars are **curated**, not derived from a tag union. The two filter sets live in `src/data/schema.json` under `work_filters` and `practice_filters`, each with `pinned` and `expanded` arrays.

Each filter entry is a `{ label, matches[] }` pair:

```json
{ "label": "spatial", "matches": ["exhibition", "installation", "retail"] }
```

`label` is the button text. `matches` is the list of underlying values that count as a hit — they're checked against each item's `data-tags`, which is **only `item.tags`** (the per-image axes: format, characteristics, subject). `item.project_tags` is intentionally *not* in this set — project-level facets like `retail` or `exhibition` no longer leak into the per-item filter, so a motion video in a retail-themed project doesn't surface under `spatial`. `project_tags` is still emitted on every item for future page-assembler use (e.g. "pull all items from `retail` projects").

This `label`/`matches` separation lets one button cover several underlying values: `spatial` matches `exhibition` OR `installation` OR `retail`; `editorial` matches both `editorial` and `publication-design`. A `label` need not be a real tag value — it's just a display label over its `matches` set.

Current sets (see `src/data/schema.json` for live values):

- **Work pinned**: spatial, identity, keynote, interactive, editorial
- **Work expanded**: poster, event, web, campaign, deck, merch, motion, video, data-visualization, photography, illustration, 3d
- **Practice pinned**: real-time, letter-design, video
- **Practice expanded**: essay, installation, exhibition

`build-projects.mjs` preserves both filter sets across rebuilds (same pattern as `schema.pinned` and `schema.mediums`). To add or rename a filter, edit `schema.json` directly — it round-trips cleanly.

On mobile (≤680px), tapping "Filter" opens a fullscreen overlay; all chips (pinned + expanded) show at once — there's no "more" step there.

`?tag=X` deep-links continue to work: if `X` matches a filter button label, that button is clicked; otherwise a synthetic single-value filter on `X` is applied.

Project-level facet vocabularies (also drawn from `schema.json` via the projects' authored values):

- `market`: b2b, b2c, b2b2c, internal, personal
- `project_type`: retail, exhibition, event, campaign, internal-tools, editorial, keynote, installation, publication-design, teaching, writing
- `sector`: tech, telecom, furniture, fashion, cultural-institution, education, architecture, design-studio, quantum-computing, personal
- `characteristic`: interactive, real-time, generative

`identity-system` and `design-system` were removed from `project_type` (2026-05-13) — those concepts are claimed in Marvin's bio rather than surfaced as project categories. See `docs/tag-taxonomy.md` for the full rationale.

These appear in `schema.tags` (auto-unioned with image-axis vocabularies) and back the curated filter `matches` arrays.

## Ingest — the one content-update command

```
npm run ingest
```

`npm run ingest` is the **single consolidated command** for any content update. Drop images in, edit `_project.md`, tag in `/admin/images` — then run ingest once and the whole tree is reconciled, rebuilt, and published. It's idempotent and safe to re-run; running it on a clean tree is a no-op beyond rewriting the generated JSON.

It runs these stages in order (`scripts/ingest.mjs`):

1. **reconcile** (`reconcile-catalogue-paths.mjs --apply`) — heals `file_path` entries after folder moves/renames. Runs **before** stub so a renamed image keeps its tags instead of being re-stubbed empty. Missing files are **quarantined, never auto-dropped** (a catalogue entry whose file is gone but which carries a caption is kept, not deleted).
2. **stub** (`stub-catalogue.mjs --all --apply`) — registers genuinely-new images across the whole tree as empty stub entries (blank tag axes), getting them into the pipeline + `/admin/images` for hand-tagging.
3. **mine-dates** — stamps created dates (including the fresh stubs).
4. **sync-image-tags** — aggregates per-image tags into each `_project.md` before projects are built.
5. **build-projects** → **build-manifest** — rebuild `projects.json` / `schema.json` / `manifest.json`.
6. **rehydrate** (`rehydrate-blob-urls.mjs`, non-fatal) — recovers any Blob URLs the rebuild dropped by matching item `id` against `src/data/manifest.archive.json`. Guards against the silent-blob-wipe failure mode (see below). Skipped on the first run, before any archive exists.
7. **upload-blob** (non-fatal) — publishes to Vercel Blob **only when `BLOB_READ_WRITE_TOKEN` is set** (read from the environment or a root `.env`). Without the token this step is skipped and local `/images/` paths are left in place — still visible under `astro dev`, just not on the deployed CDN.
8. **vimeo-posters** (`sync-vimeo-posters.mjs --apply`, non-fatal) — refreshes the Vimeo poster cache.

```
npm run ingest -- --dry-run
```

Previews the **reconcile + stub** changes only (remaps, quarantines, new stubs) and writes nothing — the build/blob/poster stages are skipped. Use it to see what a run *would* do before committing.

Every run appends a dated entry to **`docs/ingest-log.md`** (newest first) recording exactly what each stage changed — the audit trail for "what did that ingest touch?"

**Curation gate:** `build-manifest` only publishes images a human has actually curated — ones carrying a **description and/or any tag**. Untagged stubs stay catalogued (and visible in `/admin/images` for gardening) but are held out of the manifest, so they don't appear on the site until someone tags them. The source of truth (the catalogue) is intentionally larger than the published set.

**Blob redundancy:** rebuilds can otherwise silently wipe the `https://…blob…` URLs off manifest items, 404-ing them in production. `manifest.archive.json` is the safety net the rehydrate stage reads from; keep it around.

### Removing deleted images (the `--drop` step)

Deleting an image file from disk does **not** remove it from the site. A deleted-but-described image lingers because all three layers have to agree before it disappears: reconcile *quarantines* (keeps) the catalogue entry since it carries a description, the [curation gate](#ingest--the-one-content-update-command) *publishes* anything with a description, and Blob still serves the old upload. `npm run ingest` won't break this — it runs reconcile with plain `--apply` and **ignores `--drop`** (the only flag it reads is `--dry-run`).

To actually purge captioned-but-missing entries, run reconcile directly with `--drop`, then rebuild:

```
node scripts/reconcile-catalogue-paths.mjs            # dry-run — lists what would be dropped
node scripts/reconcile-catalogue-paths.mjs --apply --drop   # remove them from the catalogue
npm run ingest                                        # rebuild manifest + restore blob URLs
```

Caveats:
- **It's global** — `--drop` removes *every* quarantined entry, not a single folder. Eyeball the dry-run list first; anything that's just unsynced on this machine (file lives on Blob, not on local disk) would lose its caption.
- **The catalogue is gitignored**, so this isn't reversible via git. Back it up first (`cp public/images/image_catalogue.json public/images/image_catalogue.backup.json`).
- **Blob isn't pruned** — the orphaned file stays in Blob storage (harmless, just unreferenced). There's no auto-delete in the pipeline.
- **Watch for a now-empty project.** If the dropped images were the only *curated* ones in a project, its `/projects/<slug>` page goes empty — the remaining on-disk files may be uncurated stubs the gate is hiding. Tag/describe them in `/admin/images`, then `npm run ingest`.

## Build pipeline

For most content changes, prefer `npm run ingest` (above) — it wraps this pipeline plus reconcile/stub/blob/rehydrate. `npm run build-data` is the lower-level subset, useful when you only touched `_project.md` or the catalogue and don't need the blob/reconcile stages.

```
npm run build-data
```

Runs four scripts in sequence:
1. `build-projects.mjs` — `_project.md` files → `projects.json` + `schema.json`
2. `mine-dates.mjs` — stamps file birthtimes onto catalogue entries
3. `build-manifest.mjs` — catalogue + `projects.json` → `manifest.json`
4. `sync-vimeo-posters.mjs --apply` — refreshes the Vimeo poster cache

Run this after adding/moving images, editing `_project.md`, or updating the catalogue.

```
npm run refresh-images
```

Runs the heavier image-reconciliation cycle:
1. `reconcile-catalogue-paths.mjs --apply` — fixes catalogue `file_path` entries after folder moves/renames
2. `sync-image-tags.mjs` — writes per-project `image_tags:` caches back into each `_project.md` (a human-readable index, not consumed by the site)
3. `npm run build-data` chain (above)

### Individual scripts

| Script | Purpose |
|---|---|
| `scripts/ingest.mjs` (`npm run ingest`) | The consolidated content-update pipeline — reconcile → stub → build → rehydrate → blob → posters. `--dry-run` previews reconcile/stub only. See [Ingest](#ingest--the-one-content-update-command). |
| `scripts/rehydrate-blob-urls.mjs` | Restore Blob URLs onto manifest items by matching `id` against `src/data/manifest.archive.json` (recovers URLs a rebuild dropped; never re-uploads). |
| `scripts/sync-bullets.mjs` (`npm run sync-bullets`) | Mirror CV bullets from the Jullie-Resume gdrive source into `src/content/bullets/`. Dry-run by default; `--apply` writes. Mirror semantics (adds/overwrites/deletes to match source). Source via `--src=`, `$BULLETS_SRC`, or the default gdrive path. |
| `scripts/build-projects.mjs` | `_project.md` → `projects.json` + `schema.json` |
| `scripts/scatter-projects.mjs` | `projects.json` → `_project.md` (reverse sync) |
| `scripts/mine-dates.mjs` | Stamp file dates on catalogue entries |
| `scripts/mine-shot-dates.mjs` | Mine real capture dates (EXIF + filename patterns) for entries in a folder. `node scripts/mine-shot-dates.mjs <folder> [--apply]`. Writes `date_source` + `created_date` to the catalogue. `build-manifest` only honors these for projects flagged `chronological: true` — so the project must opt in (typical workflow: create `_project.md` with `chronological: true`, then mine, then build-data). Idempotent. Requires `exifr`. |
| `scripts/build-manifest.mjs` | Catalogue + projects → manifest |
| `scripts/sync-image-tags.mjs` | Catalogue → per-project `image_tags:` cache in `_project.md` |
| `scripts/reconcile-catalogue-paths.mjs` | Heal stale `file_path` entries after folder moves |
| `scripts/stub-catalogue.mjs` | Register new images into the catalogue as stub entries (empty tag axes). `node scripts/stub-catalogue.mjs <folder> [--apply]` for one folder, or `--all [--apply]` for the whole tree (what `npm run ingest` uses). Lightweight stand-in for the miner — gets images into the pipeline + `/admin/images` for hand-tagging |
| `scripts/upload-blob.mjs` | Upload images to Vercel Blob, rewrite manifest URLs |
| `scripts/sync-vimeo-posters.mjs` | Walks `src/content/pages/*.md`, finds Vimeo URLs in filmstrip assets, fetches canonical posters via oEmbed, writes `src/data/vimeo-posters.json`. Idempotent — only unknown IDs are fetched. Runs as the last step of `npm run build-data`. |
| `scripts/audit-tags.mjs` | Read-only tag audit: per-value counts across all image + project axes, cross-axis duplicate flags, singletons. Writes `docs/tag-audit.json`. Run after every tagging pass. |
| `public/images/miner.cjs` | Ollama-based vision tagger; run from `public/images/` to populate catalogue entries (format/characteristics/subject) for newly-added images |

### Adding new images

Images only reach the site once they have a row in `image_catalogue.json` — `build-manifest` builds the manifest *from the catalogue*, and `upload-blob` only pushes what's in the manifest. Dropping files in a folder (and wiring the project) is not enough; they must be **ingested** first.

**The normal path is one command:**

1. Add the image files under `public/images/<tier>/<client>/<folder>/`
2. Make sure the project is wired (a `_project.md` or a `projects:` entry whose `image_folders` includes the folder)
3. `npm run ingest` — stubs the new files, rebuilds, and (with a blob token) uploads them in one pass
4. (optional) tag/title them in `/admin/images`, then `npm run ingest` again to publish — remember the [curation gate](#ingest--the-one-content-update-command): untagged stubs stay hidden until they carry a description and/or tag

Skipping the stub step is the classic "I added images but `upload-blob` only pushed some" symptom — the un-ingested ones never enter the manifest. `npm run ingest -- --dry-run` (or `node scripts/reconcile-catalogue-paths.mjs` dry-run) lists every on-disk image missing from the catalogue before you commit.

The manual long-form (`stub-catalogue` → `build-data` → `upload-blob`, or the Ollama miner via `public/images/miner.cjs` instead of stub) still works if you need finer control over a single folder.

One-shot migrations (already run) now live in the gitignored `_DEPRECATED/` archive — `_DEPRECATED/scripts/`. They are kept as reference only, not part of any pipeline. See `_DEPRECATED/README.md` for the full inventory.

## Admin media-tagging portal

A dev-only portal for tagging images and videos visually. **Not in version control** — `src/pages/admin/` and `src/pages/api/admin/` are gitignored and 404 outside `import.meta.env.DEV`, so they only exist locally and only run under `astro dev`. If you `git clone` fresh, they won't be there.

- **`/admin/images`** — grid of all media (601 images + 46 videos). Side panel edits title, description, and tag chips. Filters: type (image/video), tier, client, missing-tags, text search. Multi-select (⌘/Ctrl-click, Shift-range, ⌘A, Esc) with tri-state tag chips for bulk editing. ← / → keyboard nav.
- **`/api/admin/image-tags`** — GET returns merged image + video rows + tag vocabularies; POST writes back. Image patches → `image_catalogue.json` + re-synced `_project.md image_tags`. Video patches → the matching `_project.md videos:` block (adds `description` / `characteristics` / `subject` fields inline).
- **`/api/admin/thumb`** — Sharp-resized thumbnails (120/280/600px webp), in-memory LRU cache.
- **`/api/admin/vimeo-poster`** — resolves a Vimeo ID to its CDN poster via oEmbed, caches to `_exclude/vimeo-thumbs.json`, 302-redirects.

Saves are immediate but downstream JSON is not — run `npm run build-data` after a tagging session to propagate to `projects.json` / `manifest.json` / `schema.json`.

## Pages

Nav order: **Marvin · Work · Practice · Tools** (with **Résumé** linked separately).

- `/` (Marvin) — editorial home: lead bio prose from `src/content/pages/marvin.md` body, then iterates the frontmatter `sections` array (short prose lines + filmstrip modules). See [Editorial home `/`](#editorial-home-) below.
- `/work` — full work archive: non-personal items, masonry grid, curated tag filters (`work_filters` in `schema.json`), sorted newest first.
- `/practice` — personal images + essays, curated tag filters (`practice_filters`).
- `/tools` — tools tier. Tools are authored as essay-style `writing` entries under `public/images/tools/` (markdown + frontmatter, same treatment as Practice essays — title-first card, optional cover, a `/writing` page, an outbound `link`). Tool projects not yet migrated to an essay still render from the project pipeline at `/projects/<slug>`. Intro copy comes from `src/content/pages/tools.md`.
- `/resume` — short intro + contact (from `src/content/pages/resume.md`), then the CV table: 5 columns (where/when/what/how/tags) with size slider on Projects, section collapse, sort, search, company/category filters.
- `/projects/[slug]` — auto-generated per project from the manifest. Media renders single-column full-bleed. Highlights the **Work** nav item (or **Practice** for items under `practice/`). A project can instead author its detail page as a **markdown doc** (see below).
- `/diagrams/[slug]` — animated SVG diagram pages from the diagram content collection + runtime registry.

### Markdown-authored project pages (`layout: doc`)

A project can render its detail page as the markdown **body** of its own `_project.md` instead of the default media grid. Opt in with `layout: doc` in the frontmatter (the frontmatter still feeds `projects.json` as usual). `src/lib/project-doc.ts` renders the body to HTML for the `/projects/[slug]` route to inject.

- Loaded via Vite's `import.meta.glob` (not a content collection) because Astro's content-layer `glob` loader ignores `_`-prefixed files like `_project.md`.
- Supports inline animated diagrams: a ```` ```diagram ```` fence is intercepted by `remark-diagram.mjs` and mounted from the client-side diagram registry. First instance is the Connectivity diagram; more planned.
- Code fences render as plain `<pre><code>` (no Shiki) so they stay in the minimal one-font/one-weight palette, reskinned by `.projectdoc` CSS.

Used by the tools tier (e.g. `tools/jullie-app`).

### Editorial home (`/`)

The home page is content-driven, not layout-driven. It reads `src/content/pages/marvin.md`:

- The **markdown body** renders as the lead (a few intro paragraphs).
- The **`sections` array** in frontmatter is iterated below. Two section kinds today:

```yaml
---
title: Marvin
sections:
  - kind: text
    body: "Brand and identity work."
  - kind: filmstrip
    assets:
      - src: /images/aws-keynote.jpg
        type: image
        project_url: /projects/aws
        project_label: AWS Re:Invent
      - src: /images/ionq-identity.jpg
        type: image
        project_url: /projects/ionq-brand
        project_label: IonQ
      - src: /videos/verizon-flagship.mp4
        type: video
        poster: /images/verizon-poster.jpg
        project_url: /projects/verizon-chicago
        project_label: Verizon Chicago
---
Lead bio paragraph(s) here.
```

**`kind: text`** — renders a single `<p class="prose-line">` styled as body copy (full size, roman, default color). No headers — sections aren't hierarchical, they're just stacked. Future room to add a `kind: aside` variant for small/italic flow markers if needed.

**`kind: filmstrip`** — the Filmstrip module (`src/components/Filmstrip.astro`). Up to 5 assets per filmstrip. Schema is enforced by Zod in `src/content.config.ts` — adding a 6th asset fails the build with `sections.<i>.assets: Too big: expected array to have <=5 items`.

Filmstrip behavior:
- Thumbnails row sits **above** the primary (acts as a contents bar). Click a thumb to swap which asset is primary, in place (no modal, no carousel — vanilla JS scoped to `[data-filmstrip]`).
- Primary is full content-column width; height scales with the asset's natural aspect ratio (no max-height cap — the editorial column is intentionally full-bleed, even on large displays).
- Caption sits under the primary as a small link to `project_url`. `project_label` text + link target update on swap. `project_url` is per-asset (each thumb can deep-link to a different project).
- Mobile: primary stays full-width; thumbs scroll horizontally instead of wrapping.

Three rendering paths, picked automatically per asset:
- `type: image` → `<img>`. Clicking the primary navigates to `project_url`.
- `type: video` with a Vimeo / YouTube URL → `<iframe>` (auto-detected). An invisible `<a>` overlay on top of the iframe catches clicks and navigates; the iframe still plays. Tradeoff: in-place player chrome (Vimeo play/pause) is unreachable — visitors play the full video on the project page.
- `type: video` with an HTML5 file (.mp4 etc.) → `<video muted autoplay loop>` with a sound toggle when primary. Clicking the primary navigates.

Video posters:
- Vimeo assets auto-resolve their poster via oEmbed at build time. The cache lives at `src/data/vimeo-posters.json` and is populated by `scripts/sync-vimeo-posters.mjs --apply` (runs as the last step of `npm run build-data`, idempotent — only unknown IDs are fetched).
- Explicit `poster:` in YAML always wins over the auto-resolved one.
- HTML5 video without a poster shows a neutral placeholder behind the play glyph.

Authoring gotcha:
- Don't paste HTML entity-encoded `&amp;` into YAML — YAML stores it literally and Vimeo will treat `amp;autoplay` as a parameter name. The component auto-decodes `&amp;` → `&` for forgiveness, but write plain `&` in YAML to begin with.

To add a new section, edit `marvin.md`'s `sections` array. Astro picks up content collection changes via hot reload in `dev`. If you added new Vimeo URLs, also run `npm run build-data` (or just `node scripts/sync-vimeo-posters.mjs --apply`) so their posters land in the cache before the next build.

## Video modes

Vimeo videos in `_project.md` can be configured per-entry:

- `video_mode: background` (default) — autoplay, muted, looped, no controls UI. Treats the video as ambient motion. URL params: `?background=1`.
- `video_mode: ui` — autoplay muted, looped, controls visible (play/pause/scrub/unmute). URL params: `?autoplay=1&muted=1&loop=1`.

The flag is consumed at build time. URL params are stripped from `vid.url` and rebuilt from the flag, so the flag is the single source of truth on every rebuild.

## Password gate (under construction)

The site is gated behind a password via Astro middleware (`src/middleware.ts`).

- `SITE_PASSWORD` env var — the shared password (set in `.env` locally, in Vercel env vars for production)
- `SITE_LIVE=true` — disables the gate entirely (kill switch)
- Cookie-based session: 7-day `HttpOnly` cookie, SHA-256 hash of password

The gate page is at `src/pages/under-construction.astro`. Auth endpoint at `src/pages/api/auth.ts`.

## Deploying

Push to `main`. Vercel rebuilds automatically from GitHub (RowYourBoats/m-a-r-v-i-n). Solo site — direct push to `main`, no PR route.

```
git add .
git commit -m "update"
git push origin main
```

Run `npm run build-data` before committing if you changed the catalogue, `_project.md` files, or anything upstream of the generated JSON — Vercel runs `astro build` only, not `build-data`.

Images are on Vercel Blob — pushing code doesn't re-upload images. To upload new images, run `upload-blob.mjs` locally.

## Design tokens

Tokens in `src/styles/global.css`:

- `--fs-base: clamp(14px, 1.5625vw, 1.3rem)` — mobile floor (~14–21px). Used as the legacy `--fs` alias and as the mobile-flatten target.
- `--fs-body: clamp(14px, 2.5vw, 48px)` — desktop ceiling 3em. Body copy, page intros, prose, essays, nav, filter bar.
- `--fs-secondary: clamp(14px, 1.667vw, 32px)` — desktop ceiling 2em. Resume table on `/resume`, grid item captions (`.label`), detail foldout, project tags, hero feed captions, filmstrip captions.
- `--pad: clamp(32px, 2.5vw, 64px)` — all padding/gaps.
- `--pad-sm: clamp(8px, 0.625vw, 16px)` — caption-to-image gap.
- `--pad-bottom` — derived; bottom margin under captioned grid cells so total whitespace below the image equals `--pad`.

Mobile (≤760px) flattens both `--fs-body` and `--fs-secondary` back to `--fs-base` so the type hierarchy disappears at small sizes.

One font (PP Neue Montreal Regular), one weight (400), one line-height (1.2). Font file goes in `public/fonts/PPNeueMontreal-Regular.woff2`.

Multi-paragraph body copy: wrap in `<div class="prose">` for tight `p + p` spacing.

## Layout

- `.page-intro` — page-intro copy on `/work`, `/practice`, and `/resume`. `max-width: 66.6667%` on desktop (8 of 12 cols), full-width below 760px.
- `.editorial` — editorial home (`/`) column. Vertical flex with `--pad` gap. No max-width — filmstrips are intentionally full-bleed at any viewport.
- `.editorial-lead` — lead prose under the title on `/`. `max-width: 60ch` so the text doesn't run line-wide on huge displays even though the filmstrip can.
- `.prose-line` — body-style paragraph for `kind: text` sections. `--fs-body`, default color, roman. Same visual weight as the lead prose. `max-width: 60ch`.
- `.filmstrip-stage` — grid-stacked primary/inactive slots in one cell so swapping doesn't reflow surrounding content (`visibility` toggle, not `display`). No height cap — the asset's aspect ratio is honored at full width.
- `.filmstrip-thumbs` — horizontal row of thumbs above the primary; `overflow-x: auto` on narrow viewports.
- `.hero-feed` — (legacy) hero feed shape; not currently used by any page after the home rewrite. Reachable through grep; safe to remove if it doesn't return.
- `.project-media` — project page media stack. Full width within the page padding.

The CV table on `/resume` (`.cv-head`, `.cv-filters`, `.cv-table-wrap`) is explicitly sized at `--fs-secondary` so it stays at 2em while the rest of the page uses `--fs-body` (3em on desktop).

## Known-stale tooling

Cleared out 2026-05-21 — spent migrations and stale artifacts moved to the gitignored `_DEPRECATED/` archive (see `_DEPRECATED/README.md`). This included `src/data/tag-map.json`, the two dead studio sub-folder `_project.md` stubs (`dffpm`, `tillotson-associates` — their images stay in place), `public/images/image_catalogue - Copy.json`, and the one-off migration scripts. `scripts/post.mjs` and `public/images/work/aws/_project.md` were already gone before the sweep.
