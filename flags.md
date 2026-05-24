# Open flags

Things flagged during work but not yet decided or addressed.

## Data hygiene

- **Project descriptions are empty.** All `_project.md` files have `description: ""`. Needed for project detail pages (`/projects/[slug]`).
- **Tag mapping retired.** `tag-map.json` (bullet → portfolio tags) was unused and pointed at the pre-2026-05 vocabulary; moved to `_DEPRECATED/src/data/` on 2026-05-21. Re-map against `docs/tag-taxonomy.md` and wire a consumer if it's ever wanted back.

## Tooling

- **Junction recreation on fresh clone.** `src/content/bullets` is a directory junction to `D:\ClaudeCoding\Jullie-Resume\input\bullets`. Not tracked by git, so a fresh clone has no bullets. Document the setup step or add a setup script.

## Deferred

- **Bullet ↔ image-folder linking.** Bullets carry a 6-char `id` exposed as `data-bullet-id` on `/marvin` rows, but `projects.json` has no `bullet_ids`. Likely better as a forward-going convention applied when new work is added than a retroactive backfill — the linking model may need a rethink before wiring it up.
- **Image migration to `src/assets/`.** For build-time resizing / `srcset` / AVIF via `astro:assets`. Currently images are on Vercel Blob. Would need to integrate `astro:assets` with Blob URLs or move images into the build pipeline.
- **Chronological sorting refinement.** `practice.astro` sorts by real `created` date. `index.astro` and `archive.astro` still sort by `year` then project name — within-year ordering is by project, not date. Unify on `created`-date sorting if finer ordering is wanted.
- **Jullie-Resume live endpoint.** Interactive "paste a JD, get a resume" demo. Requires hosted Python service. Deferred in favor of static CV table.
- **Profile image swap workflow currently requires two script runs.** `build-manifest` then `upload-blob` (for new files) — could be wrapped in a single `npm run add-profile-image` script.
