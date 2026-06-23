---
title: Open flags
section: Status
order: 0
summary: Flagged-but-undecided items and deferred work.
---

Things flagged during work but not yet decided or addressed.

## Data hygiene

- Some project descriptions still empty. A subset of `_project.md` files still have `description: ""`, needed for project detail pages. Herman Miller and MoMA umbrellas now have sub-project descriptions; gaps remain in projects without sub-project structure.
- `content` backfill. At the 2026-06-17 axis migration, 109 published images had no `content` tag (the required floor). Work through them in `/admin/images` (toggle "missing tags"). See [Tag taxonomy](/wiki/tag-taxonomy).
- Tag mapping retired. `tag-map.json` (bullet → portfolio tags) was unused and pointed at the pre-2026-05 vocabulary; moved to `_DEPRECATED/` on 2026-05-21. Re-map against `docs/tag-taxonomy.md` and wire a consumer if it's ever wanted back.

## Deferred

- Bullet ↔ image-folder linking. Bullets carry a 6-char `id` exposed as `data-bullet-id` on `/resume`, but `projects.json` has no `bullet_ids`. Likely better as a forward-going convention applied to new work than a retroactive backfill. See [CV bullets](/wiki/cv-bullets).
- Image migration to `src/assets/`. For build-time resizing / `srcset` / AVIF via `astro:assets`. Images are on Vercel Blob today; would need `astro:assets` integrated with Blob URLs or images moved into the build.
- Chronological sorting refinement. `practice.astro` sorts by real `created` date; `work.astro` still sorts by year then project name — within-year ordering is by project, not date. Unify on `created`-date sorting if finer ordering is wanted.
- Jullie-Resume live endpoint. Interactive "paste a JD, get a resume" demo. Requires a hosted Python service; deferred in favor of the static CV table.
- Old-URL redirects. `/archive` and `/marvin` (old CV) 404 after the 2026-05-25 restructure. If external links exist, add `vercel.json` redirects (`/archive → /work`, `/marvin → /resume`).
- Filmstrip extensions. `kind: aside` (small/italic flow-marker text); manifest-id refs in filmstrip assets instead of explicit `src`; keyboard arrow nav between thumbs. Earn them if the pattern proves itself.
- Motion-graphics tag. `medium: moving-image` is a broad dragnet (every video). A distinct motion-graphics tag for designed animation was scoped but deferred. See `docs/tag-taxonomy.md` working notes.
- `m-a-r-v-i-n/` folder unsurfaced. `public/images/m-a-r-v-i-n/01_WikipediaImage.jpeg` exists but no page renders it after the editorial-home rewrite. Drop the folder, or author the image into a home-page filmstrip.

## Tooling

- Password gate is partial. Only unlisted project pages are gated; there is no whole-site gate or `SITE_LIVE` kill switch despite older docs. See [Auth & gating](/wiki/auth-and-gating).
