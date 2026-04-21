# Open flags

Things flagged during work but not yet decided or addressed.

## Data hygiene

- **Bullet ↔ image folder linking is unwired.** Bullets now carry a 6-char `id` in frontmatter and expose it as `data-bullet-id` on `/marvin` rows, but `projects.json` doesn't yet list `bullet_ids`. See `USAGE.md` → "Bullet ↔ image-folder linking" for the integration plan.
- **One pipe-category bullet.** The `category: experience | education | exhibition | skill` oddball in the bullet set doesn't match any single category, so `/marvin` drops it. Fix on the Jullie side by picking a single category.
- **Tags empty on size-variant rendering.** Under the old schema, size-variant bullets lacked tags. Under the new consolidated schema, tags are shared across sizes — resolved. Confirm after next retag pass.
- **Project descriptions are empty.** All `_project.md` files have `description: ""`. Needed for project detail pages (`/projects/[slug]`).
- **Samsung images.** Currently in the images folder without a `_project.md`. User plans to reclassify as independent explorations (move to IndependentProjects).
- **Tag mapping is a first draft.** `src/data/tag-map.json` maps bullet tags to portfolio tags. Tag inventory changed with the refactor — review whether the mapping still covers the current vocabulary.

## Tooling

- **`scripts/post.mjs` is stale.** Appends to `manifest.json` which is now generated. Rewrite or remove.
- **Junction recreation on fresh clone.** `src/content/bullets` is a Windows directory junction to Jullie-Resume. Not tracked by git. Document setup step or add a setup script.

## Deferred

- **Image migration to `src/assets/`.** For build-time resizing / `srcset` / AVIF via `astro:assets`. Currently images are on Vercel Blob. Would need to integrate `astro:assets` with Blob URLs or move images into the build pipeline.
- **Chronological sorting refinement.** Work page sorts by `year` (newest first). Images within the same year are unsorted. Could sort by `created` date for finer ordering.
- **Jullie-Resume live endpoint.** Interactive "paste a JD, get a resume" demo. Requires hosted Python service. Deferred in favor of static CV table.
- **Profile image swap workflow currently requires two script runs.** `build-manifest` then `upload-blob` (for new files) — could be wrapped in a single `npm run add-profile-image` script.
- **Domain setup.** Squarespace domain → Vercel DNS. Ready whenever a domain is chosen.
