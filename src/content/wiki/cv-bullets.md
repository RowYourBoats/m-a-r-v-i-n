---
title: CV bullets
section: Content
order: 3
summary: The bullets collection, sync, sizes, id linking, /resume rendering.
---

Bullets are real committed files in `src/content/bullets/*.md` (the old directory junction to Jullie-Resume is retired — it broke builds on machines without the junction). The gdrive editing source is still the source of truth; `npm run sync-bullets` mirrors it into the repo.

Each bullet is one file; the filename pattern is `{slug}-{id}.md` where `{id}` is a 6-char hex.

```yaml
---
category: experience       # experience | teaching | exhibition | education | award | skill | writing
company: Herman Miller
role: Global Brand Designer
project: Picnic — the Herman Miller Design System (brand pillar)
date: May 2017 – June 2019
id: d91fb7                  # 6-char hex — matches filename suffix
order: 1                    # optional — lifts this bullet within a same-date group
tags:
  - brand-standards
  - ~cross-functional-collaboration   # ~prefix = secondary tag
---

## Small

- One-line version, for tight resume layouts.

## Medium

- First list item, used in a standard resume.
- Second list item.

## Large

Prose narrative. May be multiple paragraphs. Long-form resume / portfolio detail.
```

## Updating bullets

```
npm run sync-bullets            # dry-run — prints the plan
npm run sync-bullets -- --apply # mirror into src/content/bullets
```

Mirror semantics: adds new bullets, overwrites changed ones, deletes repo bullets no longer in the source (so renames propagate). Source resolves from `--src=<path>`, then `$BULLETS_SRC`, then the default `G:\My Drive\Claude Coding\Jullie-Resume-data\input\bullets` (Windows). On Mac, pass `--src`. No junction or symlink needed.

## `/resume` rendering

Section classification:

- `experience`/`teaching` with a Large body and no `project` → Roles.
- `experience` (any other shape) → Projects (grouped by `company|project`).
- `teaching` (non-role) → Teaching.
- `exhibition`/`writing`/`publication`/`talks` → Exhibitions & Publications.
- `education`/`skill` → their own sections.
- `award` → currently hidden.

Size slider: for the Projects section, rows are grouped by `company|project`; the slider picks one size to show per group (large > medium > small), falling back to the nearest available. Only appears if any bullet has a `size`.

Sort within a section: `whenSort` desc (newest first) → `order` ascending among same-date bullets → unranked bullets in stable filename-alphabetical order.

A render-time strip in `src/pages/resume.astro` removes a legacy `**Role scope** —` inline prefix and strips `**` markers from cells (the site never bolds).

## Bullet ↔ image-folder linking (deferred)

The 6-char `id` is the stable handle; every `/resume` row carries `data-bullet-id="<id>"`. The intended pattern (not yet wired) is to add `bullet_ids: [...]` to each `projects.json` entry so project pages can resolve bullets → images and the resume can reverse-index rows → project images. See [Open flags](/wiki/open-flags).
