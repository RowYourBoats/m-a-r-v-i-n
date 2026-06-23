---
title: Tag taxonomy
section: Content
order: 2
summary: The four image axes, project facets, and the audit workflow.
---

The canonical reference is `docs/tag-taxonomy.md` — it carries the closed vocabularies, per-tag definitions, and the full migration log, and is edited directly as part of the audit. This page mirrors the shape; consult that file for the authoritative current state.

## Image-level axes

Four orthogonal axes, each answering one question. Values never move across axes.

| Axis | Count | Question |
|---|---|---|
| `content` | 1+ (required floor) | What is it about / what does it depict? |
| `format` | 0+ | What kind of deliverable is it? |
| `medium` | 0–1 | In what dimension is it encountered? |
| `characteristics` | 0+ | How was it made / how does it behave? |

`content` is soft-enforced: the admin flags a missing content tag and the audit lists them, but the publish gate stays description-or-any-tag, so a content-less image is nagged, not dropped.

### `content` (required, 1+)

`data-visualization` · `diagram` · `iconography` · `identity` · `illustration` · `letter-form` · `lifestyle` · `logo` · `photography` · `product-render` · `proposal` · `study` · `typography`

### `format` (0+)

`booth` · `campaign` · `deck` · `editorial` · `exhibition` · `installation` · `keynote` · `merch` · `poster` · `product-marking` · `publication-design` · `retail` · `web` · `stationery` · `event`

Applies to images and videos. `stationery` lives only here; an event poster is `format: [poster, event]`.

### `medium` (0–1, may be empty)

The physical/temporal dimension the work lives in — screen/digital work carries none.

| Value | Meaning |
|---|---|
| `print` | flat printed surface — books, posters, packaging graphics |
| `moving-image` | time-based moving image (broad, literal — not "motion graphics") |
| `spatial` | encountered in an environment — installation, retail interior, booth, wayfinding |
| `physical` | a designed object / material — merch, packaging-as-object, product graphics |

`medium` is folded into the filterable tag union, so it behaves like a filter chip.

### `characteristics` (0+)

Applies to images that embody the quality, not images that document it (a photo of a real-time installation is not `real-time` — the project is).

`interactive` · `real-time` · `generative` · `3d` · `making` · `storytelling` · `essay` · `reference`

## Project-level axes

Live in `_project.md` frontmatter; describe the project, not its images.

- `project_type` — `internal-tools`, `teaching`, `retail`, `exhibition`, `event`, `keynote`, `editorial`, `installation`, `publication-design`, `writing`, `campaign`. (`identity-system` and `design-system` are deliberately not here — claimed in the bio, not as project categories.)
- `characteristic` — same vocabulary as image characteristics, when the project as a whole is real-time / interactive / generative.
- `sector`, `market`, `role`, `scale` — descriptive; not policed.
- `image_tags` — auto-aggregated union of per-image tags; written by `sync-image-tags.mjs` and the admin portal. Don't hand-edit.

Project facets are not image tags — the build joins them onto items as `item.project_tags`, which is intentionally excluded from per-item filters. See [Filters](/wiki/filters).

## The audit workflow

1. Tag via `/admin/images` (writes catalogue + `_project.md` in real time).
2. `node scripts/audit-tags.mjs` → fresh `docs/tag-audit.json` (per-value counts, cross-axis duplicates, singletons).
3. Compare audit against `docs/tag-taxonomy.md`: adopt new values (add a row) or drop them (add a migration entry); decide singletons; resolve cross-axis values.
4. Update the doc with decisions.
5. Run migration script(s) for any pending rows.
6. `npm run build-data` to propagate to `projects.json` / `manifest.json` / `schema.json`.
