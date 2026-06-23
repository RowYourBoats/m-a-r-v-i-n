---
title: Editorial home & filmstrip
section: Frontend
order: 4
summary: The marvin.md sections array, filmstrip module, video modes.
---

The home page (`/`) is content-driven, not layout-driven. It reads `src/content/pages/marvin.md`: the markdown body renders as the lead bio; the frontmatter `sections` array is iterated below it.

```yaml
---
title: Marvin
sections:
  - kind: text
    body: "Brand and identity work."
  - kind: filmstrip
    assets:
      - src: /images/aws-keynote.jpg
        type: image
        project_url: /projects/aws
        project_label: AWS Re:Invent
      - src: https://player.vimeo.com/video/123
        type: video
        project_url: /projects/verizon-chicago
        project_label: Verizon Chicago
  - kind: link
    href: /resume
    label: Résumé
---
Lead bio paragraph(s) here.
```

Section kinds (schema enforced by Zod in `src/content.config.ts`):

- `kind: text` — one `<p class="prose-line">` at body size; a flow marker between media blocks. No headers — sections are stacked, not hierarchical.
- `kind: filmstrip` — the Filmstrip module, up to 5 assets (a 6th fails the build: `assets: Too big: expected array to have <=5 items`).
- `kind: link` — an outbound/in-site link rendered as a prose line, so it's authored in markdown rather than hardcoded.

## Filmstrip behavior

`src/components/Filmstrip.astro`:

- Thumbnails row sits above the primary (a contents bar). Click a thumb to swap which asset is primary, in place — no modal, no carousel (vanilla JS scoped to `[data-filmstrip]`). Clicking the stage advances to the next asset.
- Primary is full content-column width; height follows the asset's natural aspect ratio (no max-height cap).
- Caption sits under the primary as a small link to `project_url`; `project_label` + target update on swap. `project_url` is per-asset.
- Mobile: primary stays full-width; thumbs scroll horizontally.

Three rendering paths, auto-picked per asset:

- `type: image` → `<img>`; clicking navigates to `project_url`.
- `type: video` with a Vimeo/YouTube URL → `<iframe>` (auto-detected). An invisible `<a>` overlay catches clicks and navigates; the iframe still plays, but its own play/pause chrome is unreachable in the strip (play the full video on the project page).
- `type: video` with an HTML5 file (.mp4 etc.) → `<video muted autoplay loop>` with a sound toggle when primary.

Video posters:

- Vimeo assets auto-resolve their poster via oEmbed at build time (cache: `src/data/vimeo-posters.json`, populated by `sync-vimeo-posters.mjs --apply`, the last step of `build-data`; only unknown IDs are fetched).
- An explicit `poster:` in YAML always wins.
- HTML5 video without a poster shows a neutral placeholder behind the play glyph.

Authoring gotcha: write plain `&` in YAML, not the HTML entity `&amp;` — YAML stores it literally and Vimeo would read `amp;autoplay` as a parameter. The component auto-decodes `&amp;` → `&` for forgiveness, but author it plain.

To add a section, edit `marvin.md`'s `sections` array (hot-reloads in dev). If you added new Vimeo URLs, run `node scripts/sync-vimeo-posters.mjs --apply` (or `npm run build-data`) so their posters land in the cache.

## Video modes (`_project.md` videos)

Per-entry on a project's `videos:`:

- `video_mode: background` (default) — autoplay, muted, looped, no controls. Ambient motion. URL params `?background=1`.
- `video_mode: ui` — autoplay muted looped with visible controls. URL params `?autoplay=1&muted=1&loop=1`.

The flag is consumed at build time: URL params are stripped from `vid.url` and rebuilt from the flag, so the flag is the single source of truth on every rebuild.
