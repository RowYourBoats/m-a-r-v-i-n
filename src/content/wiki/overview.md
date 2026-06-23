---
title: Overview
section: Start
order: 0
summary: What the site is and how the pieces fit together.
---

A portfolio site built with Astro 6 (server output, Vercel adapter). Content is authored as files on disk and compiled into generated JSON the pages read at build/request time. Images live locally for authoring but are served from Vercel Blob.

## The four content sources

Everything on the site comes from one of four places, unified by a project registry:

1. Project registry — `_project.md` files in each `public/images/<folder>/`, compiled to `src/data/projects.json`. The source of truth for project identity.
2. Images — files in `public/images/<folder>/`, described in `public/images/image_catalogue.json`, hosted on Vercel Blob.
3. Essays — non-underscore markdown under `public/images/` (the `writing` collection), co-located with their images.
4. CV bullets — markdown in `src/content/bullets/*.md`, mirrored from the Jullie-Resume gdrive source.

Generated files (never hand-edited):

- `src/data/projects.json` — from `_project.md` files
- `src/data/manifest.json` — from catalogue + projects.json
- `src/data/schema.json` — from projects.json (filter sets are preserved across rebuilds)

See [Content model](/wiki/content-model) for the full pipeline.

## How the wiki is organized

- Start — orientation, running locally, the repo map.
- Authoring — how to build the pieces on a page: inline images, diagrams, filmstrips, video. Start at [Page elements](/wiki/page-elements).
- Content — the content model, images/catalogue, tags, CV bullets, essays.
- Pipeline — `ingest` / `build-data` and the full script reference.
- Frontend — routing, filters, layout/design tokens, diagrams, the editorial home.
- Ops — deploying and the password gate.
- Status — open flags and undecided questions.

This wiki is the single source of truth — it replaced the old flat `USAGE.md`. The canonical tag reference still lives at `docs/tag-taxonomy.md` (edited directly as part of the audit workflow); [the taxonomy topic](/wiki/tag-taxonomy) mirrors it.
