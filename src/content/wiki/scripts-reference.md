---
title: Scripts reference
section: Pipeline
order: 1
summary: Every script in scripts/ — flags, what it reads/writes, when it runs.
---

Convention: most scripts default to dry-run and write only with `--apply`. Folder-scoped scripts take a `<folder>` argument and never bulk-process the whole tree unless told to.

## In the pipelines

| Script | Flags | Purpose / notes |
|---|---|---|
| `ingest.mjs` (`npm run ingest`) | `--dry-run` | The consolidated content pipeline — reconcile → stub → build → rehydrate → blob → posters. See [Ingest & build](/wiki/ingest-and-build). |
| `build-projects.mjs` | — | `_project.md` → `projects.json` + `schema.json` (umbrella → sub-project fan-out). Validates frontmatter against the shared schema (`src/lib/content-schema.mjs`); fails loudly with the file + field named (e.g. a non-string `date_range`). Preserves filter sets across rebuilds. |
| `mine-dates.mjs` | — | Stamps file birthtime/mtime onto catalogue entries as `created`. |
| `build-manifest.mjs` | — | Catalogue + `projects.json` → `manifest.json` (+ archives the previous). Applies the curation gate; preserves blob URLs by path/id; probes Vimeo dims (cached). Builds video items from both project `videos:` and essay `videos:` frontmatter (shared `buildVideoItem`); essay videos are flagged `essay_of` + `hidden_from_feed`. |
| `sync-vimeo-posters.mjs` | `--apply` | Walks `src/content/pages/*.md`, fetches Vimeo posters via oEmbed → `vimeo-posters.json`. Idempotent — only unknown IDs fetched. |
| `reconcile-catalogue-paths.mjs` | `--apply`, `--drop` | Heals `file_path` after moves; quarantines (keeps) missing-but-captioned entries. `--drop` purges them (global — see [Ingest & build](/wiki/ingest-and-build)). |
| `stub-catalogue.mjs` | `<folder>` or `--all`, `--apply` | Registers new images as empty stub entries. `--all` (whole tree) is what `ingest` uses. Only adds; never overwrites. |
| `sync-image-tags.mjs` | — | Aggregates per-image tags into each `_project.md` `image_tags:` cache (human-readable index; not consumed by the site). |
| `rehydrate-blob-urls.mjs` | — | Restores Blob URLs onto manifest items by matching `id` against `manifest.archive.json`. Never re-uploads. |
| `upload-blob.mjs` | (reads `BLOB_READ_WRITE_TOKEN`) | Uploads manifest images to Blob, rewrites URLs. Adopts existing blobs (no re-upload); `addRandomSuffix: false` for stable paths. Run with `node --env-file=.env scripts/upload-blob.mjs`. |

## Manual / occasional

| Script | Flags | Purpose / notes |
|---|---|---|
| `sync-bullets.mjs` (`npm run sync-bullets`) | `--apply`, `--src=` | Mirror CV bullets from the Jullie-Resume gdrive source. Mirror semantics (add/overwrite/delete). See [CV bullets](/wiki/cv-bullets). |
| `scatter-projects.mjs` | — | Reverse of build-projects: `projects.json` → `_project.md`. |
| `mine-shot-dates.mjs` | `<folder>`, `--apply` | Mines real capture dates (EXIF + filename patterns) → `date_source` + `created_date`. Only honored when the project is `chronological: true`. Idempotent; needs `exifr`. |
| `audit-tags.mjs` | — | Read-only tag audit: per-value counts, cross-axis duplicate flags, singletons → `docs/tag-audit.json`. Run after every tagging pass. |

## Image-folder tools (gitignored, in `public/images/`)

| Script | Purpose |
|---|---|
| `miner.cjs` | Ollama (Qwen3-VL) vision tagger — populates catalogue title/description + format/characteristics/content. Run from `public/images/`; needs Ollama running. Checkpoints every 50 images. "Fail rather than reach." |
| `enrich.cjs` | Companion image-metadata enrichment utility (dev-only). |

## Dated one-shot migrations (still present)

Run once, idempotent after. Kept for reference; safe to re-run.

- `migrate-event-medium-2026-05-25.mjs`
- `migrate-subject-to-content-2026-06-17.mjs`
- `migrate-taxonomy-2026-06-17.mjs`

Older spent migrations were moved to the gitignored `_DEPRECATED/scripts/` on 2026-05-21.
