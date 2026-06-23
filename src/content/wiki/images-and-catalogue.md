---
title: Images & catalogue
section: Content
order: 1
summary: image_catalogue.json, Vercel Blob, filename gotchas, adding images.
---

## Where images live

Images live locally in `public/images/<tier>/<client>/<project>/` for authoring but are served from Vercel Blob (CDN). The manifest references Blob URLs (`https://ws6i2dfuggcaavs2.public.blob.vercel-storage.com/...`), not local paths.

The folder tree is tier → client → project:

```
public/images/
  work/        client + studio work
  practice/    personal / educational / experimental
  teaching/    nyu/, parsons/
  tools/       tool write-ups
  m-a-r-v-i-n/ portraits / bio (not surfaced by default)
```

Tier routing: `work/` shows on Work; `practice/` (or `personal: true`) shows on Practice; any other tier sets `item.staging` (a holding pen — off both indexes). See [Pages & routing](/wiki/pages-and-routing).

## `image_catalogue.json`

One entry per image. Per-image tagging is stratified across four axes (full vocabularies in [Tag taxonomy](/wiki/tag-taxonomy)):

```json
{
  "title": "DFFPM Logo Design",
  "description": "A minimalist logo…",
  "medium": "print",
  "format": [],
  "characteristics": [],
  "content": ["logo"],
  "client": "DFFPM",
  "style": "minimalist geometric typography",
  "file_path": "work/studio/dffpm/Screenshot 2026-04-13 231222.png",
  "created": "2026-04-13T23:12:22.000Z",
  "created_date": "2026-04-13",
  "date_source": "estimated",
  "project_date_range": "2019-2022"
}
```

Each axis is authored independently and may be empty (except `content`, the required floor). The miner uses "fail rather than reach" — a weak match stays empty.

The catalogue is gitignored (local source of truth), and is intentionally larger than the published set — see the curation gate in [Ingest & build](/wiki/ingest-and-build).

Editing tags is normally done in the dev-only admin portal (`/admin/images`), which writes `image_catalogue.json` + `_project.md` directly. For bulk vocabulary changes, write a dated one-shot migration and audit with `node scripts/audit-tags.mjs`.

## Date priority

`exif` > filesystem date within `project_date_range` > range start year > filesystem fallback. Per-item EXIF dates are only honored when the project is `chronological: true` (see [Pages & routing](/wiki/pages-and-routing)).

## Filename gotcha

The pipeline does not URL-encode paths when generating blob URLs, so avoid characters that are special in a URL:

- `#` — treated as a fragment delimiter
- `?` — treated as a query-string start
- `%` — would need `%25`, which the pipeline doesn't do

Safe: letters, digits, spaces, `-`, `_`, `.`, `+`, `()`. Spaces work but produce verbose `%20` URLs; hyphens are cleaner.

If a blob URL that should exist 404s, check the filename. Rename the file, then `node scripts/reconcile-catalogue-paths.mjs --apply` to heal the `file_path`, then `node --env-file=.env scripts/upload-blob.mjs` to re-upload.

## Adding new images

The normal path is one command — see [Adding new images in Ingest & build](/wiki/ingest-and-build). In short: drop files under the right folder, ensure the project is wired, run `npm run ingest`. Dropping files alone is not enough — they must be stubbed into the catalogue first, or `upload-blob` will only push what's already in the manifest.
