---
title: Deploying
section: Ops
order: 0
summary: Push to main, Vercel auto-build, what to run first.
---

Solo site — direct push to `main`, no PR route. Vercel rebuilds automatically from GitHub (RowYourBoats/m-a-r-v-i-n).

```
git add .
git commit -m "update"
git push origin main
```

(Push from a machine with the SSH key loaded — the remote is SSH.)

## Before you commit

Run `npm run build-data` (or `npm run ingest`) if you changed the catalogue, `_project.md` files, or anything upstream of the generated JSON. Vercel runs `astro build` only — not `build-data` — so the generated `manifest.json` / `projects.json` / `schema.json` must already be committed.

Images are on Vercel Blob — pushing code doesn't re-upload images. To upload new images, run `node --env-file=.env scripts/upload-blob.mjs` (or `npm run ingest`) locally first.

## Build config

- `astro.config.mjs` — `output: "server"`, Vercel adapter with `imageService: true` and web analytics; remote-image allowlist for `*.public.blob.vercel-storage.com`; the global markdown config wires `remark-essay-images`.
- `.vercelignore` excludes build artifacts, image binaries, the local JSON manifests + `miner.cjs`/`enrich.cjs`, the admin tooling, `_exclude/`, `public/evaluations/`, templates, and env files from the deploy.
- No `vercel.json` — adapter defaults; no custom redirects configured (see the old-URL redirects note in [Open flags](/wiki/open-flags)).

## Vercel environment

Set the same env vars in the Vercel project as in your local `.env` (`SITE_PASSWORD`, `BLOB_READ_WRITE_TOKEN`). See [Getting started](/wiki/getting-started).
