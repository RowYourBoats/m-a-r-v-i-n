# Tag taxonomy

Canonical reference for tags on images (`public/images/image_catalogue.json`) and projects (`public/images/{tier}/{client}/_project.md`). Update as decisions are made.

Last reviewed: 2026-06-17.

## How this doc works

- Run `node scripts/audit-tags.mjs` to regenerate `docs/tag-audit.json` (per-value counts, cross-axis flags, singletons).
- Compare the audit output to this doc. Anything in the audit not listed here is unrecognized: either fold in (and add a row), or kick out (and add a migration entry).
- This doc records *decisions*, not snapshots. When a tag changes status (added / dropped / consolidated), note it in the migration log.
- The four image-level axes are orthogonal — values do not move across them. If a value seems to belong in two axes, one of them is wrong.
- `medium` and `format` are independent. `medium` is the dimension the work is *encountered* in — print / motion / spatial / physical (screen/digital work has none); `format` is the artifact / output type (deck, poster, keynote, …). The same piece can carry both, in any combination. Don't infer one from the other.

---

## Image-level axes

Per-image tags. Four axes, each answering one question. Counts go stale fast — run `audit-tags.mjs` for live numbers; this doc records meanings and decisions.

### Cardinality

| axis | count | rule |
| --- | --- | --- |
| `subject` | 1+ | **required — the floor.** Guarantees findability. Soft-enforced: the admin flags a missing subject and the audit lists them, but the publish gate stays `description-or-any-tag`, so a subjectless image isn't dropped — just nagged. |
| `format` | 0+ | usually present; empty for process / detail / exploration shots |
| `medium` | 0–1 | single-select; **empty is the default**. Folded into the filterable tag union (build-manifest) so it behaves like a filter chip. |
| `characteristics` | 0+ | empty is the default; flags only what's remarkable |

### `medium` — in what dimension is this encountered?

Single per image, **may be empty**. The physical/temporal dimension the work lives in. Distinct from *file type* (image / video). **Screen / web / digital work carries no medium** — it's identified by format + characteristics instead.

| value | meaning |
| --- | --- |
| `print` | a flat printed surface: books, posters, packaging graphics |
| `motion` | time-based moving image (video assets default here; also former motion stills) |
| `spatial` | encountered in an environment: installation, retail interior, booth, wayfinding |
| `physical` | a designed object / material: merch, packaging-as-object, product graphics |

### `format` — what kind of deliverable is it?

What the asset *is* as an output. Multi-value. Applies to images **and** videos (build-manifest threads per-video `format` into video item tags).

`booth` · `campaign` · `deck` · `editorial` · `exhibition` · `installation` · `keynote` · `merch` · `poster` · `product-marking` · `publication-design` · `retail` · `web` · `stationery` · `event`

- `stationery` lives **only** here (letterhead, cards, invites) — removed from characteristics.
- `event`, if you want to tag the occasion, lives here — not on medium. A poster *for* an event is `format: [poster, event]`.

### `characteristics` — how it was made / how it behaves

Multi-value. **Applies to images that EMBODY the quality, not images that document it.** A still photo of a real-time installation is NOT `real-time` — the project is.

| value | meaning |
| --- | --- |
| `interactive` | the image itself is interactive (UI screenshots, demos, prototypes) |
| `real-time` | the image is captured from / depicts a real-time system |
| `generative` | made by a generative / algorithmic process |
| `3d` | the image is rendered |
| `making` | documents process / craft / fabrication |
| `storytelling` | narrative-driven sequence / treatment |
| `essay` | written-essay companion image |
| `reference` | reference / mood / research material |

- `print` and `motion` left this axis (both are now mediums); `stationery` moved to format.
- Optional future: `material` (foil / emboss / vinyl / fold) if `making` proves too broad.

### `subject` — what is it about / what does it depict?

Multi-value, **required (1+)**.

`data-visualization` · `diagram` · `iconography` · `identity` · `illustration` · `letter-design` · `lifestyle` · `logo` · `photography` · `product-render` · `proposal` · `study` · `typography`

- `logo` / `letter-design` / `typography` / `identity` overlap, but subject is multi-select and fuzzy by design — overlap is cheap here.

---

## Project-level axes

Live in each `_project.md` frontmatter. Describe the *project*, not its individual images.

### `project_type`

Categories. A project can carry multiple.

`internal-tools`, `teaching`, `retail`, `exhibition`, `event`, `keynote`, `editorial`, `installation`, `publication-design`, `writing`, `campaign`.

**Not in this list:** `identity-system` and `design-system` — these are claimed in the bio ("...has developed identities..." / "...spans nationwide roll-outs and for-your-eyes-only proposals for design systems..."), so they don't double as project categories.

Example: IonQ is `keynote + event` (the identity-system aspect lives in the bio, not as a filter).

### `characteristic`

Same vocabulary as image characteristics. Applies when the project *as a whole* is real-time / interactive / generative, even if individual images aren't.

### `sector`, `market`, `role`, `scale`

Descriptive frontmatter. Not policed by this doc.

### `image_tags`

Auto-aggregated union of per-image tags across the project's folder. Written by `scripts/sync-image-tags.mjs` and by the admin portal on every save. **Don't hand-edit.**

---

## Migration log

Decisions and the data work that follows. Pending rows are open until the data reflects the decision.

| date | decision | status |
| --- | --- | --- |
| 2026-05-13 | Removed filter chip `art-direction` from `src/data/schema.json`. Replaced with standalone `illustration` and `photography` chips. | done |
| 2026-05-13 | Drop `medium: identity` (13 entries) — value moves to `subject: identity`; medium becomes `digital` or `print` depending on substrate. | done |
| 2026-05-13 | Drop `medium: photography` (5 entries) — value moves to `subject: photography`; medium becomes `digital`. | done |
| 2026-05-13 | Drop `medium: illustration` (2 entries) — value moves to `subject: illustration`; medium becomes `digital` or `print`. | done |
| 2026-05-13 | Drop `subject: product` (12 entries) — overlaps with `product-render` (rendered) and `photography` (photographed). `medium: product` (substrate axis) stays. | done |
| 2026-05-13 | Drop `format: retail` (195 entries) — context, not artifact shape. Ensure relevant projects carry `project_type: retail`. | done |
| 2026-05-13 | Drop `format: signage` (38 entries) entirely. Possibly revisit later as a split (signage / wayfinding) or fold under `subject: identity`. | done |
| 2026-05-13 | Drop `format: teaching` (1). Move to `project_type: teaching` at project level. | done |
| 2026-05-13 | Drop `format: identity-system` (10) and `format: design-system` (3) from images. Also strip both values from every `_project.md` `project_type` (existing 5 + 2 = 7 instances). These categories now live in the bio, not as project types. | done |
| 2026-05-13 | Removed `design-system` filter chip from `src/data/schema.json`. | done |
| 2026-05-13 | Drop `format: 3d-illustration` (6). Add `characteristic: 3d` to those images. | done |
| 2026-05-13 | Drop `characteristic: generative` (1 entry) — no real volume yet. Reinstate when warranted. | done |
| 2026-05-13 | Consolidate `format: publication` (24) into `format: publication-design` (37). publication-design is the more accurate term — the design of a publication, not the publication itself. | done |
| 2026-05-13 | Drop `format: video` (8). Set `medium: video` on those entries. Video belongs on the substrate axis, not the artifact-shape axis. | done |
| 2026-05-13 | Reworked `work_filters` in `src/data/schema.json`. Pinned: `spatial` (exhibition+installation+retail), `identity`, `keynote`, `interactive`, `editorial` (editorial+publication-design). Expanded: poster, event, web, campaign, deck, merch, motion, video, data-visualization, photography, illustration, 3d. Fixed the `identity` chip (`matches` was the now-removed `identity-system`; now `identity`). Reconciled `schema.mediums` to the canonical 5. | done |
| 2026-05-25 | Add `event` to `medium` vocabulary, drop `event` from `format`. 23 catalogue entries migrated by `scripts/migrate-event-medium-2026-05-25.mjs`: format `event` removed, medium set to `event` (overwriting prior digital/print/environments classification). Reframes the axes: `medium` = practice/discipline, `format` = artifact/output type, orthogonal. | done |
| 2026-05-25 | Add `keynote` to `format` vocabulary. Was previously only in `project_type`; the `/work` keynote chip had nothing to match per-item. Now applies to any keynote slide / deck / animation / video. AWS videos seeded with `format: [keynote]` in `_project.md`. Tag images via the admin portal as they're added. | done |
| 2026-05-25 | Extend videos to carry `format` (and override `medium`) in their per-video `_project.md` entry. Previously only `characteristics` + `subject` threaded into the video item's tags; `format` is now in the union too. Enables `format: keynote` on AWS videos and any other per-video artifact tagging. | done |
| 2026-06-17 | **Reframe `medium`** from practice/discipline to *dimension encountered*. Renames via `scripts/migrate-taxonomy-2026-06-17.mjs`: `environments`→`spatial` (30), `product`→`physical` (10), `video`→`motion` (8). `digital` (499) **cleared** — screen/digital work carries no medium. New vocab: `print`, `motion`, `spatial`, `physical`. `schema.mediums` reconciled to these 4. | done |
| 2026-06-17 | **Reverse the 2026-05-25 `event` decision.** `medium: event` (22) cleared and `event` added back to `format`. Event is the occasion (an artifact shape/context), not a dimension; a poster for an event is `format: [poster, event]`. | done |
| 2026-06-17 | **Dissolve cross-axis duplicates.** `characteristic: motion` (41) → `medium: motion` (28 moved; 13 kept their existing `spatial`/`print` medium, characteristic dropped, logged by the migration's conflict guard). `characteristic: print` (16) → `medium: print`. `characteristic: stationery` (5) → `format: stationery`. The characteristics axis no longer contains `print` / `motion` / `stationery`. | done |
| 2026-06-17 | **`subject` is now the required floor (1+).** Soft-enforced: `/admin/images` shows a required marker, the "missing tags" filter keys on missing subject, and the audit lists the gap (109 published images lacked one at migration time). The build curation gate is unchanged, so nothing is unpublished — backfill via the admin portal over time. | done |
| 2026-06-17 | **Fold `medium` into the filterable tag union** (`build-manifest.mjs`) so medium values (print/motion/spatial/physical) work as filter chips like the other axes. Video assets now default to `medium: motion` (was `video`) in `build-manifest.mjs` + `image-tags.ts`. `schema.json` chips: `motion` now matched by the folded medium; the redundant `video` chip merged into `motion`; `spatial` chips extended to match the `spatial` medium; `print` chip added. | done |

## Working notes / open questions

- ~~**15 entries flagged for medium review** (defaulted to `digital`)~~ — moot as of 2026-06-17: `digital` is no longer a medium, so all were cleared. If any were genuinely printed, set `medium: print` when they next pass through `/admin/images`.
- **`subject` backfill:** 109 published images had no subject at the 2026-06-17 migration. Work through them in `/admin/images` (toggle "missing tags" — now keyed on subject).
- `project.characteristic: generative` (1 instance) still exists at project level. Image-level was dropped during migration; project-level was not touched. Decide later whether to also strip.
- `characteristic: making` (1 instance) — **kept**, watching for volume.
- `format: web` (4 instances) — **kept**, watching for volume.
- `format: campaign` (32 instances) — **kept for now**. Original refactor plan called for drop, but volume is real; revisit if it doesn't accumulate further use or if better-fitting tags exist (`poster`, `deck`).
- `format: product-marking` (2 instances) — **kept for now**. Revisit at next audit.
- `subject: logo` (16) vs `subject: identity` (21) — currently separate. Fold `logo` into `identity` if logo-only images stop accumulating.
- Project-level stale `image_tags` singletons (`art-direction`, `brand`, `customer-experience`, `user interface`, `user-experience`, `process`) — leftover from old vocab. Will clear next time the admin portal re-aggregates or `sync-image-tags.mjs` runs against the updated catalogue.

## Recurring process

1. Tag images via `/admin/images` (writes to catalogue + `_project.md` in real time).
2. `node scripts/audit-tags.mjs` → fresh `docs/tag-audit.json`.
3. Compare audit against this doc:
   - **New values?** Decide: adopt (add to canonical list above) or drop (add a migration row).
   - **Singletons?** Decide: noise (drop) or seed (keep, log under "working notes").
   - **Cross-axis values?** Decide: which axis owns it, drop from the others.
4. Update this doc with the decisions.
5. Run any migration script(s) for `pending` rows; flip them to `done`.
6. `npm run build-data` to propagate to `projects.json`, `manifest.json`, `schema.json`.
