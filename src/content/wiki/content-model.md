---
title: Content model
section: Content
order: 0
summary: The project registry, generated files, and bidirectional sync.
---

Four sources of content (see [Overview](/wiki/overview)), unified by the project registry.

## Project registry (`_project.md`)

Each image folder has a `_project.md` defining the project — the source of truth for project identity.

The corpus has two shapes. Everything else is a boolean modifier on one of these
(see [Modifier flags](#modifier-flags)).

### Template 1 — work umbrella with sub-projects

For client work under `work/`: one umbrella file, sub-projects in a `projects:` map.

```yaml
---
slug: example-agency
name: Example Agency
client: Example Agency
aliases:
  - ExampleCo               # name variants, to resolve mismatches between systems
date_range: 2020-2023
roles:
  - Senior Designer
market: b2b                 # b2b, b2c, b2b2c, internal, personal
project_type:               # zero or more — what kind of work it is
  - identity-system
  - retail
sector: fashion
characteristic: []          # interactive, real-time, generative, 3d, print
description: "Three-year run covering rebrand and retail rollout."
credits:
  - role: Design
    name: Marvin de Jong
projects:
  rebrand-2021:
    name: 2021 Rebrand
    description: >-
      Sub-project prose. Slug defaults to {client-slug}-{key}; override
      with slug: on the entry.
    project_type:           # overrides the umbrella facet; omit to inherit
      - identity-system
    image_tags: []          # auto-generated — don't hand-edit
    credits:
      - role: Design
        name: Marvin de Jong
    videos:
      - title: Launch Film
        url: https://player.vimeo.com/video/111111111
        video_mode: background   # "background" (default) or "ui" — see Video modes
        featured: true           # optional — surface on homepage hero feed
        content:                 # optional per-video content tags
          - motion-graphics
        characteristics:         # optional per-video characteristic tags
          - 3d
  milan-exhibition:
    name: Milan Exhibition
    snapshot_only: true     # in data, but no page of its own
---
```

### Template 2 — flat practice piece

For self-initiated work under `practice/`: no `projects:` map, `personal: true`.

```yaml
---
slug: example-solo
name: Example Solo Project
client: personal
aliases: []
date_range: "2024"          # always quoted, even single years — see gotcha below
market: personal
project_type: []
sector: personal
characteristic:
  - generative
personal: true              # routes to Practice
description: "Self-initiated exploration in generative typography."
credits:
  - role: Design
    name: Marvin de Jong
image_tags: []              # auto-generated — don't hand-edit
videos: []                  # same video shape as template 1, when present
---
```

Field notes:

- `slug` — canonical project key, used in URLs and the manifest. It may
  legitimately differ from the folder name (`practice/SNU/` → `snu`,
  `work/article-group/` → `aws`): slugs are canonical, folders are storage.
- `image_folders` — derived from where the `_project.md` lives; never written by hand.
- `market` / `project_type` / `sector` / `characteristic` — the four project-level facets for filtering and recruiter context. See [Tag taxonomy](/wiki/tag-taxonomy) for vocabularies. Sub-projects inherit from the umbrella unless they override.
- `image_tags` — auto-generated union of the folder's image tags; scripts own it.
- `videos` — Vimeo embeds, generated as video items; each can set `video_mode`, `featured`, and per-video `content` / `characteristics` tags. See [Editorial home & filmstrip](/wiki/editorial-home-and-filmstrip).
- `personal` — `true` routes to Practice; omit on work (defaults false).
- `lead_images` — optional list of filenames to flag `featured` in the manifest. Functional but currently unused; omit unless you need it.
- Omit empty boilerplate: `roles: []`, `videos: []`, `personal: false` add nothing.

### Modifier flags

Booleans on the umbrella (inherited by sub-projects) or on a single sub-project entry:

- `snapshot_only: true` — the project exists in data (filterable, searchable) but has no dedicated page; its URL redirects to the feed. Per-entry only, not inherited.
- `chronological: true` — order the folder's items by per-item date (`date_source`) instead of cluster-by-project. First user: `practice/snapshots/`.
- `unlisted: true` — items hidden from the Work/Practice/Tools feeds and `/projects/<slug>` gated by middleware (404 in prod).
- `pinned: true` — float the project's card to the top of its feed (see [feed sorting](/wiki/page-elements)).

Note the underscore in `snapshot_only` — the schema silently ignores unknown keys, so a typo like `snapshot-only:` fails without an error.

A project can render its detail page from the markdown body instead of a media grid via `layout: doc` — see [Essays & tools](/wiki/essays-and-tools).

`_project.md` has two consumers: `build-projects.mjs` reads it for the registry (the umbrella → sub-project fan-out into `projects.json`), and a `projects` content collection (`src/lib/projects-loader.ts`) reads it to render doc bodies through Astro's markdown pipeline. Both validate the frontmatter against one shared schema fragment (`src/lib/content-schema.mjs`) — the same module the essay (`writing`) collection uses, so projects and essays carry the same field shape and can't drift. Essays are the lean end of that shape; projects add the facets/sub-project map above.

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

Always quote `date_range`, even a single year — `date_range: "2026"`. Unquoted, YAML parses a bare year as a number and the build needs a string (it splits on `-` for ranges). The shared schema (`content-schema.mjs`) enforces this: `build-projects.mjs` fails loudly with the offending file and field named.
