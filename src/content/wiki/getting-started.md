---
title: Getting started
section: Start
order: 1
summary: Run locally, set up .env, fresh-clone caveats.
---

## Running locally

```
npm run dev
```

Astro watches all files and hot-reloads on save — no restart needed when editing markdown, images, or styles.

## Environment variables

Create a root `.env`. Values below are placeholders — use the real ones from the project's secret store, never commit them.

```
SITE_PASSWORD="your-shared-password"
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
# optional — only for syncing CV bullets on a non-default machine:
BULLETS_SRC="/path/to/Jullie-Resume-data/input/bullets"
```

| Var | Used by | Effect when unset |
|---|---|---|
| `SITE_PASSWORD` | `src/middleware.ts`, `src/pages/api/auth.ts` | Nothing is gated (fine for local dev). See [Auth & gating](/wiki/auth-and-gating). |
| `BLOB_READ_WRITE_TOKEN` | `scripts/upload-blob.mjs`, `scripts/ingest.mjs` | Blob upload step is skipped; local `/images/` paths stay in the data (still visible under `astro dev`, just not on the deployed CDN). |
| `BULLETS_SRC` | `scripts/sync-bullets.mjs` | Falls back to the default gdrive path (Windows) or `--src=`. See [CV bullets](/wiki/cv-bullets). |

`import.meta.env.DEV` / `.PROD` are Astro built-ins (not in `.env`) — they gate the admin portal and this wiki to dev, and limit analytics to prod.

## Fresh-clone caveats

A fresh `git clone` is missing things that are intentionally local-only:

- The admin portal (`src/pages/admin/`, `src/pages/api/admin/`) is gitignored — it won't be there.
- The image catalogue (`public/images/image_catalogue.json`) is gitignored — regenerate via `npm run ingest`.
- CV bullets are committed, but to re-sync from the gdrive source you need `npm run sync-bullets` (and the source available).
- Images themselves are on Blob, not in git — see [Images & catalogue](/wiki/images-and-catalogue).

## Optional tooling

- `public/images/miner.cjs` (Ollama vision tagger) needs Ollama running locally — optional; `stub-catalogue` is the lightweight stand-in.
