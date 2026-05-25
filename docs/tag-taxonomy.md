# Tag taxonomy

Canonical reference for tags on images (`public/images/image_catalogue.json`) and projects (`public/images/{tier}/{client}/_project.md`). Update as decisions are made.

Last reviewed: 2026-05-25.

## How this doc works

- Run `node scripts/audit-tags.mjs` to regenerate `docs/tag-audit.json` (per-value counts, cross-axis flags, singletons).
- Compare the audit output to this doc. Anything in the audit not listed here is unrecognized: either fold in (and add a row), or kick out (and add a migration entry).
- This doc records *decisions*, not snapshots. When a tag changes status (added / dropped / consolidated), note it in the migration log.
- The four image-level axes are orthogonal — values do not move across them. If a value seems to belong in two axes, one of them is wrong.
- `medium` and `format` in particular are independent. `medium` is the practice / discipline (event design, video, print design, digital design, …); `format` is the artifact / output type (deck, poster, keynote, …). The same project can — and usually does — carry both, in any combination. Don't infer one from the other; don't restrict one based on the other.

---

## Image-level axes

Per-image tags. Four axes, each doing distinct work.

### `medium` — practice / discipline

What discipline of design work this is. Singular per image. Distinct from the asset's *file type* (image / video / audio) — `medium` is the conceptual practice, not the codec.

| value | meaning |
| --- | --- |
| `digital` | screen-bound static / interactive design: sites, decks, social, generative output, UI work |
| `print` | print design: books, posters, packaging printed graphics |
| `environments` | spatial / built design: installation, retail interior, wayfinding |
| `product` | product design: merch, packaging-as-object, physical product graphics |
| `video` | motion / video work as its own discipline (production language distinct from static design) |
| `event` | event design: brand expression in the context of a moment / gathering, where the artifact's purpose is to inhabit that moment |

### `format` — artifact / output type

What the asset *is* as an output. Multi-value allowed. Applies to images **and** videos (build-manifest threads per-video `format` into video item tags exactly as it does for images).

| value | n | meaning |
| --- | --- | --- |
| `deck` | 372 | slide from a presentation deck |
| `poster` | 42 | poster artwork |
| `editorial` | 38 | editorial layout (magazine, newspaper) |
| `campaign` | 32 | campaign artwork (under review — see working notes) |
| `publication-design` | 37 | book / publication page or spread (design of a publication) |
| `installation` | 20 | installation photograph |
| `exhibition` | 14 | exhibition view |
| `keynote` | 0 | keynote slide, animation, or full presentation (image or video) — surfaces under the `keynote` chip |
| `stationery` | 9 | letterhead, cards, invites |
| `merch` | 6 | merch object |
| `booth` | 4 | trade-show booth |
| `web` | 4 | website / web artifact |

`event` moved out of `format` on 2026-05-25 — it's a discipline (now `medium: event`), not an artifact shape. A poster *for* an event is `format: poster, medium: event`.

### `characteristics` — qualities

Multi-value. **Applies to images that EMBODY the quality, not images that document it.** A still photo of a real-time installation is NOT `real-time` — the project is.

| value | meaning |
| --- | --- |
| `interactive` | the image itself is interactive (UI screenshots, demos, prototypes) |
| `motion` | the image itself moves (gif, video, motion still frame) |
| `3d` | the image is rendered |
| `real-time` | the image is captured from / depicts a real-time system |
| `making` | the image documents process / craft / fabrication |

### `subject` — what the image is about

Multi-value. What's depicted or treated.

| value | n | meaning |
| --- | --- | --- |
| `proposal` | 353 | speculative / proposal artwork (decks for unbuilt retail concepts etc. — won't typically surface on the front page) |
| `photography` | 42 | photograph as final artwork |
| `illustration` | 39 | illustration as final artwork |
| `typography` | 38 | type IS the subject (not merely present) |
| `data-visualization` | 30 | quantitative data made visible |
| `letter-design` | 30 | individual letterform design |
| `identity` | 21 | identity / brand mark / system documentation |
| `logo` | 16 | logo presentation (kept while volume holds; could fold into `identity`) |
| `study` | 15 | self-contained study / sketch |
| `product-render` | 8 | rendered product imagery |
| `diagram` | 6 | conceptual / structural diagrams (distinct from data-viz) |
| `iconography` | 5 | icon / pictogram libraries |

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

## Working notes / open questions

- **15 entries flagged for medium review** in `docs/migration-2026-05-13-review.json`. Open them in `/admin/images` and change `medium` to `print` where the substrate is actually printed. Migration defaulted these to `digital`.
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
