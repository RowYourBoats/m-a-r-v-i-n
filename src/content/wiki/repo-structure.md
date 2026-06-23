---
title: Repo structure
section: Start
order: 2
summary: Directory map and what ships in git vs. stays local.
---

## Directory map

```
src/
  components/      UI components (Filmstrip, PortfolioPageScript, diagrams/)
  content/         content collections: bullets/, diagrams/, pages/, wiki/
  data/            generated + authored JSON (see below)
  layouts/         Base.astro (the site shell)
  lib/             helpers (project-doc, order-items, remark-*, atomicWrite)
  pages/           routes, incl. api/ and the dev-only admin/
  styles/          global.css (all styling)
  middleware.ts    password gate
scripts/           build + data-sync scripts (see Scripts reference)
public/
  fonts/           PPNeueMontreal-Regular.woff2 (the one font)
  images/          tier/client/project tree + catalogue + miner
docs/              tag-taxonomy.md, ingest-log.md, tag-audit.json
_DEPRECATED/       gitignored archive of spent migrations/artifacts
_exclude/          gitignored large media + handoff files
```

## What ships in git vs. stays local

Driven by `.gitignore`:

| Path | Tracked? | Why |
|---|---|---|
| Image/video binaries under `public/images/` | No | Hosted on Vercel Blob, not bundled |
| `public/images/**/*.md`, `**/*.html` | Yes | Essays + `_project.md` + diagram HTML ship in code (gitignore negation) |
| `public/images/image_catalogue.json`, `schema.json`, `manifest.json` | No | Local build artifacts, regenerated |
| `public/images/miner.cjs`, `enrich.cjs` | No | Dev-only image tooling |
| `src/pages/admin/`, `src/pages/api/admin/` | No | Dev-only tagging portal |
| `src/data/manifest.archive.json` | No | Generated blob-URL safety net |
| `.env`, `.env.*` | No | Secrets |
| `_DEPRECATED/`, `_exclude/`, `public/evaluations/` | No | Local-only archives / large media |
| `node_modules/`, `dist/`, `.astro/`, `.vercel/`, `.claude/` | No | Build artifacts / tooling |

New file types under `public/images/` need a gitignore negation or they won't deploy (the tree is ignore-everything-then-negate-`.md`/`.html`).

## `src/data/` files

| File | Generated? | Source / purpose |
|---|---|---|
| `projects.json` | Generated | `build-projects.mjs` from `_project.md` |
| `manifest.json` | Generated | `build-manifest.mjs` from catalogue + projects |
| `manifest.archive.json` | Generated | Previous manifest; `rehydrate` reads it to restore blob URLs |
| `schema.json` | Generated + curated | Built by `build-projects.mjs`, but `work_filters`/`practice_filters`/`pinned`/`mediums` round-trip across rebuilds and are edited directly |
| `vimeo-posters.json` | Generated | `sync-vimeo-posters.mjs` poster cache |

`docs/tag-taxonomy.md` is the one authored doc that scripts point at — kept editable, not generated.

## Archives

- `_DEPRECATED/` — spent one-off migrations and stale artifacts moved out 2026-05-21. Reference only; see `_DEPRECATED/README.md`.
- `_exclude/` — large media and Jullie-Resume handoff reference HTML, kept off git.
