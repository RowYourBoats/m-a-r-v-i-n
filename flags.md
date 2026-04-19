# Open flags

Things flagged during work but not yet decided or addressed.

## Data hygiene

- **Bullet deduplication on Jullie side.** 77 duplicate bullet pairs exist (with/without tags). Portfolio deduplicates at build time in `marvin.astro`, but the source data should be cleaned up in Jullie-Resume.
- **20 bullets without `company` or `project_key`.** These are skills, education entries, exhibitions, and awards without a company field. They appear ungrouped on the resume — intentional for now, but some may need a company added.
- **PreCog Magazine contamination.** Some bullets had copy-pasted company/role from PreCog. User is fixing on the Jullie side.
- **Verizon role inconsistency.** Two role strings for the same tenure — one with Unicode arrow, one with ASCII. Should be unified in Jullie-Resume.
- **Project descriptions are empty.** All `_project.md` files have `description: ""`. Needed for project detail pages (`/projects/[slug]`).
- **Samsung images.** Currently in the images folder without a `_project.md`. User plans to reclassify as independent explorations (move to IndependentProjects).
- **Tag mapping is a first draft.** `src/data/tag-map.json` maps 137 bullet tags to 15 portfolio tags. Some mappings are approximate (e.g. `cross-functional-collaboration` → `concept`). Review and refine.

## Tooling

- **`scripts/post.mjs` is stale.** Appends to `manifest.json` which is now generated. Rewrite or remove.
- **Junction recreation on fresh clone.** `src/content/bullets` is a Windows directory junction to Jullie-Resume. Not tracked by git. Document setup step or add a setup script.

## Deferred

- **Image migration to `src/assets/`.** For build-time resizing / `srcset` / AVIF via `astro:assets`. Currently images are on Vercel Blob. Would need to integrate `astro:assets` with Blob URLs or move images into the build pipeline.
- **Chronological sorting refinement.** Work page sorts by `year` (newest first). Images within the same year are unsorted. Could sort by `created` date for finer ordering.
- **Jullie-Resume live endpoint.** Interactive "paste a JD, get a resume" demo. Requires hosted Python service. Deferred in favor of static CV table.
- **Short/medium/long resume views.** Bullets tagged with `size` field in Jullie-Resume. Portfolio would add toggle buttons. Requires data on Jullie side first.
- **Domain setup.** Squarespace domain → Vercel DNS. Ready whenever a domain is chosen.
