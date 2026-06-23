---
title: Content model
section: Content
order: 0
summary: The project registry, generated files, and bidirectional sync.
---

Four sources of content (see [Overview](/wiki/overview)), unified by the project registry.

## Project registry (`_project.md`)

Each image folder has a `_project.md` defining the project — the source of truth for project identity.

```yaml
---
slug: herman-miller
name: Herman Miller
client: Herman Miller
aliases:
  - Herman Miller
  - HermanMiller
date_range: 2017-2019
roles:
  - Global Brand Designer
category: experience
market: b2b2c              # b2b, b2c, b2b2c, internal, personal
project_type:             # zero or more — what kind of work it is
  - retail                # retail, exhibition, event, campaign, internal-tools,
  - exhibition            # editorial, keynote, installation, publication-design, teaching, writing
sector: furniture         # tech, telecom, furniture, fashion, cultural-institution,
                          # education, architecture, design-studio, quantum-computing, personal
characteristic: []        # interactive, real-time, generative
role: Lead                # optional
scale: enterprise         # optional — enterprise, sme, individual
personal: false
description: ""
credits:
  - role: Design
    name: Marvin de Jong
videos:
  - title: Walkthrough
    url: https://player.vimeo.com/video/...
    video_mode: background   # "background" (default) or "ui" — see Video modes
    featured: true           # optional — surface on homepage hero feed
lead_images:
  - hero-shot.jpg            # filenames here get featured: true in the manifest
---

Optional prose description (rendered on the project page).
```

Key fields:

- `slug` — canonical project key, used in URLs and manifest.
- `aliases` — name variants, to resolve naming mismatches between systems.
- `image_folders` — derived from where the `_project.md` lives.
- `market` / `project_type` / `sector` / `characteristic` — the four project-level facets for filtering and recruiter context. See [Tag taxonomy](/wiki/tag-taxonomy) for vocabularies.
- `role` / `scale` — optional, plumbed for future art-direction cross-logic.
- `videos` — Vimeo embeds, generated as video items; each can set `video_mode` + `featured`. See [Editorial home & filmstrip](/wiki/editorial-home-and-filmstrip).
- `lead_images` — filenames flagged `featured` in the manifest.
- `personal` — `true` shows on Practice, `false` on Work.

Sub-projects (a `projects:` map nested in an umbrella `_project.md`) inherit the four facets from the umbrella unless they override.

A project can render its detail page from the markdown body instead of a media grid via `layout: doc` — see [Essays & tools](/wiki/essays-and-tools).

## Adding a new project

Create a folder in `public/images/`, add a `_project.md`, drop images in, then run `npm run ingest` (or `npm run build-data` if no new images to upload).

## Bidirectional sync

- Edit `_project.md` → `node scripts/build-projects.mjs` → regenerates `projects.json`.
- Edit `projects.json` → `node scripts/scatter-projects.mjs` → writes back to `_project.md` files.

## Frontmatter gotcha

Quote any title/description containing `:` `#` `[` `]` `{` `}`:

```yaml
title: "Perdido Street Station: Architectural Crevices"
```

Always quote `date_range`, even a single year — `date_range: "2026"`. Unquoted, YAML parses a bare year as a number and the build needs a string (it splits on `-` for ranges). `build-projects.mjs` validates this and fails loudly with the offending project named.
