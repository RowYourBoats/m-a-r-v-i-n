---
title: Ingest & build
section: Pipeline
order: 0
summary: The one content-update command, build-data, curation gate, --drop.
---

## `npm run ingest` — the one content-update command

```
npm run ingest
```

The single consolidated command for any content update. Drop images in, edit `_project.md`, tag in `/admin/images` — then run ingest once and the whole tree is reconciled, rebuilt, and published. Idempotent; safe to re-run.

Stages, in order (`scripts/ingest.mjs`):

1. reconcile (`reconcile-catalogue-paths.mjs --apply`) — heals `file_path` after folder moves/renames. Runs before stub so a renamed image keeps its tags. Missing files are quarantined, never auto-dropped (a captioned entry whose file is gone is kept).
2. stub (`stub-catalogue.mjs --all --apply`) — registers genuinely-new images as empty stub entries so they enter the pipeline + `/admin/images` for hand-tagging.
3. mine-dates — stamps created dates (including the fresh stubs).
4. sync-image-tags — aggregates per-image tags into each `_project.md`.
5. build-projects → build-manifest — rebuild `projects.json` / `schema.json` / `manifest.json`.
6. rehydrate (`rehydrate-blob-urls.mjs`, non-fatal) — restores any Blob URLs the rebuild dropped, by matching item `id` against `manifest.archive.json`. Skipped on the first run, before any archive exists.
7. upload-blob (non-fatal) — publishes to Vercel Blob only when `BLOB_READ_WRITE_TOKEN` is set. Without it this is skipped and local `/images/` paths are left in place.
8. vimeo-posters (`sync-vimeo-posters.mjs --apply`, non-fatal) — refreshes the Vimeo poster cache.

```
npm run ingest -- --dry-run
```

Previews reconcile + stub only (remaps, quarantines, new stubs) and writes nothing — build/blob/poster stages are skipped. The only flag ingest reads is `--dry-run`.

Every run appends a dated entry to `docs/ingest-log.md` (newest first) — the audit trail for "what did that ingest touch?"

## Curation gate

`build-manifest` only publishes images a human has curated — ones carrying a description and/or any tag. Untagged stubs stay catalogued (and visible in `/admin/images` for gardening) but are held out of the manifest, so they don't appear on the site until tagged. The catalogue is intentionally larger than the published set.

## Blob redundancy

Rebuilds can otherwise silently wipe the `https://…blob…` URLs off manifest items, 404-ing them in production. `manifest.archive.json` is the safety net the rehydrate stage reads from — keep it around.

## `npm run build-data` — the lower-level subset

```
npm run build-data
```

Runs four scripts: `build-projects.mjs` → `mine-dates.mjs` → `build-manifest.mjs` → `sync-vimeo-posters.mjs --apply`. Useful when you only touched `_project.md` or the catalogue and don't need the blob/reconcile stages. Run it after adding/moving images, editing `_project.md`, or updating the catalogue.

Note: there is no `npm run refresh-images` script (older docs referenced one). For the heavier reconcile cycle, run `npm run ingest`, or the scripts directly: `reconcile-catalogue-paths.mjs --apply` → `sync-image-tags.mjs` → `npm run build-data`.

## Adding new images

1. Add files under `public/images/<tier>/<client>/<folder>/`.
2. Ensure the project is wired (a `_project.md` whose folder includes these images).
3. `npm run ingest` — stubs the new files, rebuilds, and (with a blob token) uploads in one pass.
4. Optional: tag/title in `/admin/images`, then `npm run ingest` again to publish (remember the curation gate).

Skipping the stub step is the classic "I added images but `upload-blob` only pushed some" symptom — un-ingested files never enter the manifest. `npm run ingest -- --dry-run` lists every on-disk image missing from the catalogue.

## Removing deleted images (the `--drop` step)

Deleting an image file from disk does not remove it from the site — reconcile quarantines (keeps) a captioned entry, the curation gate publishes anything with a description, and Blob still serves the old upload. `npm run ingest` ignores `--drop`.

To purge captioned-but-missing entries:

```
node scripts/reconcile-catalogue-paths.mjs            # dry-run — lists what would drop
node scripts/reconcile-catalogue-paths.mjs --apply --drop   # remove them
npm run ingest                                        # rebuild + restore blob URLs
```

Caveats:

- It's global — `--drop` removes every quarantined entry, not one folder. Eyeball the dry-run list; anything merely unsynced on this machine (lives on Blob, not local disk) would lose its caption.
- The catalogue is gitignored, so this isn't git-reversible. Back it up first (`cp public/images/image_catalogue.json public/images/image_catalogue.backup.json`).
- Blob isn't pruned — the orphaned file stays (harmless, unreferenced).
- Watch for a now-empty project. If the dropped images were the only curated ones, its `/projects/<slug>` goes empty; tag the remaining stubs, then re-ingest.
