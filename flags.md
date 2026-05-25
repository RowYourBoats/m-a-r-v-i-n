# Open flags

Things flagged during work but not yet decided or addressed.

## Data hygiene

- **Some project descriptions still empty.** Subset of `_project.md` files still have `description: ""`. Needed for project detail pages (`/projects/[slug]`). Herman Miller and MoMA umbrellas now have sub-project descriptions; remaining gaps live in projects without sub-project structure.
- **Tag mapping retired.** `tag-map.json` (bullet → portfolio tags) was unused and pointed at the pre-2026-05 vocabulary; moved to `_DEPRECATED/src/data/` on 2026-05-21. Re-map against `docs/tag-taxonomy.md` and wire a consumer if it's ever wanted back.

## Tooling

- **Junction recreation on fresh clone.** `src/content/bullets` is a directory junction to `D:\ClaudeCoding\Jullie-Resume\input\bullets`. Not tracked by git, so a fresh clone has no bullets. Document the setup step or add a setup script.

## Deferred

- **Bullet ↔ image-folder linking.** Bullets carry a 6-char `id` exposed as `data-bullet-id` on `/resume` rows, but `projects.json` has no `bullet_ids`. Likely better as a forward-going convention applied when new work is added than a retroactive backfill — the linking model may need a rethink before wiring it up.
- **Image migration to `src/assets/`.** For build-time resizing / `srcset` / AVIF via `astro:assets`. Currently images are on Vercel Blob. Would need to integrate `astro:assets` with Blob URLs or move images into the build pipeline.
- **Chronological sorting refinement.** `practice.astro` sorts by real `created` date. `work.astro` still sorts by `year` then project name — within-year ordering is by project, not date. Unify on `created`-date sorting if finer ordering is wanted.
- **Jullie-Resume live endpoint.** Interactive "paste a JD, get a resume" demo. Requires hosted Python service. Deferred in favor of static CV table.
- **Old-URL redirects.** `/archive` and `/marvin` (old CV) now 404 after the 2026-05-25 restructure. If anyone has external links to those paths, add `vercel.json` redirects to send `/archive → /work` and `/marvin → /resume`.
- **Filmstrip extensions.** `kind: aside` for small/italic flow-marker text variant; manifest-id refs in filmstrip assets (instead of explicit `src`); keyboard arrow nav between thumbs. Earn them if the pattern proves itself.
- **`m-a-r-v-i-n/` folder unsurfaced.** `public/images/m-a-r-v-i-n/01_WikipediaImage.jpeg` exists but no page renders it after the editorial-home rewrite. Drop the folder entirely, or author the image into a filmstrip on the new home page.
