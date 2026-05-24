# _project.md template

Reference for structuring client `_project.md` files. The data pipeline reads
one file per client folder under `work/`, `practice/`, or `teaching/`.

Field notes:
- `market` / `project_type` / `sector` / `characteristic` are the four
  project-level facets used for filtering. Sub-projects inherit from the
  umbrella unless they explicitly override. See `src/data/schema.json` for
  the canonical vocabularies.
- `image_tags:` is **auto-generated** by `scripts/sync-image-tags.mjs` from
  `image_catalogue.json` — don't hand-edit.
- `lead_images:` is **hand-curated** — list basenames of images in that folder
  that should appear as covers. Omit / leave empty to show all.
- `snapshot_only: true` means the sub-project exists in data (filterable,
  searchable) but has no dedicated page — visiting its URL redirects home.
- Sub-project slugs default to `{client-slug}-{key}`. Override with
  `slug:` on the sub-project entry.

---

## Example 1 — client with sub-projects

File: `work/example-agency/_project.md`

```yaml
---
slug: example-agency
name: Example Agency
client: Example Agency
aliases:
  - Example Agency
  - ExampleCo
date_range: 2020-2023
roles:
  - Senior Designer
category: experience
market: b2c
project_type:
  - identity-system
  - retail
  - exhibition
sector: fashion
characteristic: []
personal: false
description: "Three-year run covering rebrand, retail rollout, and exhibition work."
credits:
  - role: Design
    name: Marvin de Jong
videos: []
projects:
  rebrand-2021:
    name: 2021 Rebrand
    project_type:
      - identity-system
    lead_images:
      - Rebrand_Cover.jpg
      - Rebrand_Logo.png
      - Rebrand_Wordmark.png
    videos:
      - title: "Rebrand Launch Film"
        url: "https://player.vimeo.com/video/111111111"
      - title: "Rebrand Behind the Scenes"
        url: "https://player.vimeo.com/video/222222222"
      - title: "Rebrand TVC 30s"
        url: "https://player.vimeo.com/video/333333333"
  retail-rollout:
    name: Retail Rollout
    project_type:
      - retail
    lead_images:
      - Retail_Storefront.jpg
      - Retail_Interior.jpg
      - Retail_Signage.jpg
    videos:
      - title: "Flagship Store Walkthrough"
        url: "https://player.vimeo.com/video/444444444"
      - title: "Signage System Animation"
        url: "https://player.vimeo.com/video/555555555"
      - title: "Opening Night Reel"
        url: "https://player.vimeo.com/video/666666666"
  milan-exhibition:
    name: Milan Exhibition
    snapshot_only: true
    lead_images:
      - Milan_Hero.jpg
      - Milan_Floorplan.png
      - Milan_Detail.jpg
    videos:
      - title: "Exhibition Walkthrough"
        url: "https://player.vimeo.com/video/777777777"
      - title: "Installation Timelapse"
        url: "https://player.vimeo.com/video/888888888"
      - title: "Curator Interview"
        url: "https://player.vimeo.com/video/999999999"
---
```

---

## Example 2 — simple client (one project, no sub-projects)

File: `practice/example-solo/_project.md`

```yaml
---
slug: example-solo
name: Example Solo Project
client: personal
aliases: []
date_range: "2024"
roles: []
category: experience
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
lead_images:
  - Solo_Process_01.jpg
  - Solo_Final.jpg
  - Solo_Detail.jpg
videos:
  - title: "Process Reel"
    url: "https://player.vimeo.com/video/101010101"
  - title: "Generative Output"
    url: "https://player.vimeo.com/video/202020202"
  - title: "Final Animation"
    url: "https://player.vimeo.com/video/303030303"
---
```

---

## Example 3 — placeholder client (no images yet)

File: `work/example-upcoming/_project.md`

```yaml
---
slug: example-upcoming
name: Example Upcoming
client: Example Upcoming
aliases: []
date_range: "2026"
roles:
  - Creative Director
category: experience
market: b2b
project_type: []
sector: tech
characteristic: []
personal: false
description: "Placeholder — project kicking off Q3 2026."
credits:
  - role: Creative Direction
    name: Marvin de Jong
videos: []
---
```

Until images land in this folder, the project is defined in `projects.json`
but has no items in `manifest.json`, so no page renders. Add images, run the
pipeline, and it comes online automatically.
