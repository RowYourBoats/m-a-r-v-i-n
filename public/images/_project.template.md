# _project.md template

Reference for structuring `_project.md` files. The data pipeline reads one
file per project folder under `work/`, `practice/`, or `teaching/`. Two
shapes cover the whole corpus; everything else is a boolean modifier.
Canonical docs: `/wiki/content-model` (dev only).

Field notes:
- `slug` is the canonical project key (URLs, manifest). It may differ from
  the folder name — slugs are canonical, folders are storage.
- `market` / `project_type` / `sector` / `characteristic` are the four
  project-level facets used for filtering. Sub-projects inherit from the
  umbrella unless they explicitly override. See `src/data/schema.json` for
  the canonical vocabularies.
- `image_tags:` is **auto-generated** by `scripts/sync-image-tags.mjs` from
  `image_catalogue.json` — don't hand-edit.
- Sub-project slugs default to `{client-slug}-{key}`. Override with
  `slug:` on the sub-project entry.
- Always quote `date_range`, even single years: `date_range: "2026"`.
- Omit empty boilerplate rows (`roles: []`, `videos: []`, `personal: false`) —
  they add nothing.
- `lead_images:` (list of filenames to flag `featured` in the manifest) still
  works but has no current users; omit unless you need it.

Modifier flags (booleans; umbrella-level flags are inherited by sub-projects):
- `snapshot_only: true` — exists in data (filterable, searchable) but has no
  dedicated page; its URL redirects to the feed. Per-entry, not inherited.
- `chronological: true` — order items by per-item date instead of
  cluster-by-project (first user: `practice/snapshots/`).
- `unlisted: true` — items hidden from feeds, project URL gated.
- `pinned: true` — float the project's card to the top of its feed.

Mind the underscore in `snapshot_only` — unknown keys are silently ignored,
so `snapshot-only:` fails without an error.

---

## Template 1 — work umbrella with sub-projects

File: `work/example-agency/_project.md`

```yaml
---
slug: example-agency
name: Example Agency
client: Example Agency
aliases:
  - ExampleCo
date_range: 2020-2023
roles:
  - Senior Designer
market: b2b
project_type:
  - identity-system
  - retail
sector: fashion
characteristic: []
description: "Three-year run covering rebrand and retail rollout."
credits:
  - role: Design
    name: Marvin de Jong
projects:
  rebrand-2021:
    name: 2021 Rebrand
    description: >-
      Sub-project prose rendered on its page.
    project_type:
      - identity-system
    image_tags: []
    credits:
      - role: Design
        name: Marvin de Jong
    videos:
      - title: Launch Film
        url: https://player.vimeo.com/video/111111111
        video_mode: background
        featured: true
        content:
          - motion-graphics
        characteristics:
          - 3d
  milan-exhibition:
    name: Milan Exhibition
    snapshot_only: true
---
```

---

## Template 2 — flat practice piece

File: `practice/example-solo/_project.md`

```yaml
---
slug: example-solo
name: Example Solo Project
client: personal
aliases: []
date_range: "2024"
market: personal
project_type: []
sector: personal
characteristic:
  - generative
personal: true
description: "Self-initiated exploration in generative typography."
credits:
  - role: Design
    name: Marvin de Jong
image_tags: []
videos: []
---
```

---

## Placeholder (no images yet)

Either shape works with an empty folder: the project lands in
`projects.json` but has no items in `manifest.json`, so no page renders.
Add images, run the pipeline, and it comes online automatically.
