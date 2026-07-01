---
title: Page elements
section: Authoring
order: 0
summary: Cookbook — inline images, diagrams, filmstrips, video. What to write and where it works.
---

How to build the pieces that go on a page: the markdown or YAML to write, and — the part that trips people up — which authoring context each one works in. Most "why won't my image show up" problems are a recipe used in the wrong context.

## The three authoring contexts

Almost everything you author lands in one of three places, and they don't share the same superpowers:

| Context | What it is | Where |
|---|---|---|
| Essay body | A `writing` entry — markdown in an image folder | `public/images/**/<name>.md` (no leading `_`) |
| Project doc | A project page authored as markdown | `_project.md` body with `layout: doc` |
| Home sections | The editorial home modules | `src/content/pages/marvin.md` frontmatter |

The two markdown contexts now run through the **same** global markdown pipeline (essays and `layout: doc` project bodies both render as content-collection entries), so inline images and diagram fences work in both. Only the home sections differ — they're authored as YAML modules, not markdown:

| Element | Essay body | Project doc | Home sections |
|---|---|---|---|
| Inline image (bare filename) | yes | yes | — |
| Diagram / flowchart fence | yes | yes | — |
| Video (`videos:` frontmatter) | yes | yes | — |
| Credits / publication (`credits:`, `client:`) | yes | yes | — |
| Filmstrip | — | — | yes |
| Text / link module | — | — | yes |
| Standard markdown (headings, lists, tables, links) | yes | yes | — |

Standalone diagram pages (`/diagrams/[slug]`) are a separate thing.

## Inline image (essay or project doc)

Reference a companion image by its bare filename — no path, no URL:

```md
Here's the garden from the street.

![A wide view of the planted verge](garden-wide.jpg)
```

The image must be a file in the same essay folder, already in the catalogue and uploaded (run `npm run ingest` after dropping it in — see [Images & catalogue](/wiki/images-and-catalogue)). At render time `remark-essay-images.mjs` rewrites the bare filename to its Blob URL and stamps width/height (no layout shift) plus lazy loading. The alt text is the caption. An image referenced inline is pulled out of the essay's side-rail figures so it isn't shown twice.

- Bare filename only. Anything with a `/`, or an `http(s):` / root-anchored URL, passes through untouched.
- A filename that doesn't resolve in the manifest passes through too — and then 404s. If an inline image is missing, it's almost always not yet catalogued/uploaded.
- Works in essay bodies and `layout: doc` project bodies alike — the plugin is in the global markdown config, and both render through it. The filename resolves against the document's own folder.

## Diagram / flowchart (essay or project doc)

Drop a fenced block whose language is `diagram` and whose first word is a registered diagram slug:

````md
Connectivity is the through-line of the work:

```diagram connectivity
```
````

`remark-diagram.mjs` replaces the fence with a mount point; `/projects/[slug].astro` hydrates every placeholder from the client diagram registry on load. The animation respects the viewport and `prefers-reduced-motion`.

- Works in project docs, essay bodies, and standalone `/diagrams/[slug]` pages — the fence is in the global markdown config, so any content-collection render picks it up. (Essay pages mount placeholders too; `/writing/[...slug]` shares the same client registry.)
- The slug must already exist in `src/components/diagrams/registry.ts`. Building a *new* diagram type (writing the SVG + mount function) is an engineering task — see [Diagrams](/wiki/diagrams).

## Filmstrip (home sections)

The home page is built from the `sections` array in `src/content/pages/marvin.md` — the markdown body is the lead bio, then each section renders below it. A filmstrip holds up to 5 assets (a 6th fails the build):

```yaml
sections:
  - kind: filmstrip
    assets:
      - src: /images/aws-keynote.jpg
        type: image
        project_url: /projects/aws
        project_label: AWS Re:Invent
      - src: https://player.vimeo.com/video/123456
        type: video
        project_url: /projects/verizon-chicago
        project_label: Verizon Chicago
```

Thumbnails sit above a full-width primary; click a thumb to swap it in, click the stage to advance. Images, Vimeo/YouTube embeds, and HTML5 video files each get the right treatment automatically, and Vimeo posters resolve at build time. The full behavior, video poster cache, and the `&` / `&amp;` gotcha are in [Editorial home & filmstrip](/wiki/editorial-home-and-filmstrip).

## Text and link modules (home sections)

The other two section kinds, for the flow between media blocks:

```yaml
sections:
  - kind: text
    body: "Brand and identity work."
  - kind: link
    href: /resume
    label: Résumé
```

`text` is a single prose line (no headings — sections stack, they don't nest). `link` is an in-site or outbound link authored in markdown rather than hardcoded. Adding or reordering sections hot-reloads in dev.

## Video (essays & projects)

Videos are declared under `videos:` — in a project's `_project.md`, or in an essay's frontmatter (same shape, same pipeline). A mode controls playback:

```yaml
videos:
  - title: Walkthrough
    url: https://player.vimeo.com/video/123456
    video_mode: background   # default — autoplay, muted, looped, no controls
    featured: true           # optional — see below
```

`video_mode: ui` keeps autoplay/muted/loop but shows controls. The flag is the single source of truth — URL params are stripped and rebuilt from it on every rebuild, so the **bare Vimeo URL is enough** (you don't author the query string).

`build-manifest` turns each entry into a manifest video item: a project video carries `project: <slug>`; an essay video carries `essay_of: <id>` and is hidden from the feed (it shows only on the essay's own page). Placement of `featured: true`:

- **On an essay** — a featured background video renders full-bleed at the top; the rest sit in the figure rail/gallery.
- **On a project** — it surfaces in the home feed.

Dimensions are probed from Vimeo oEmbed at build (16:9 fallback if the probe is skipped), so **run `npm run build-data` after adding a video** to populate width/height and avoid letterboxing. See [Editorial home & filmstrip](/wiki/editorial-home-and-filmstrip) for how project pages expose Vimeo chrome.

## Credits & publication (essays & projects)

Both essays and projects can attribute collaborators and an external source:

```yaml
credits:
  - role: Design
    name: Marvin de Jong
  - role: Photography
    name: A. Collaborator
client: The Politic     # a project's client, or an essay's publication
```

`credits` renders as a small role/name list at the foot of the page. `client` is one field with two labels — the *client* on a project, the *publication* an essay appeared in. Both are optional: pages stay lean by default, carrying these only when a piece needs them.

## A markdown project page (`layout: doc`)

By default a project page is an ordered media grid. To write the page as prose instead, add `layout: doc` to its `_project.md`; the rest of the frontmatter still feeds `projects.json`. The markdown body becomes the page.

```yaml
---
slug: jullie-app
name: Jullie
layout: doc
# …the usual project frontmatter…
---

## How it works

Body prose here. Diagram fences and bare-filename images both render.
```

Supported in the body: standard markdown, diagram fences (above), bare-filename inline images (above), and code fences — rendered as plain `<pre><code>` (no syntax-highlight colors) to stay in the one-font palette. A doc project body runs through the same content-collection pipeline as an essay. Details and the why in [Essays & tools](/wiki/essays-and-tools).

## Ordering & pinning

The index feeds (Work, Practice, Tools) are reverse-chronological — Practice and Tools by date, Work by year then project. To hold a card at the top regardless of date, pin it. The date stays truthful; the pin just lifts it above the feed.

```yaml
# An essay (Practice / Tools) — in its writing frontmatter:
pinned: true
```

```yaml
# A project (Work, or a personal project on Practice) — in its _project.md:
pinned: true     # floats all of that project's images/videos up as one cluster
```

When several cards are pinned, the pinned group keeps the page's own order among themselves (newest first), then the unpinned feed follows. So three pinned essays sit on top in date order, then everything else in date order. One shared rule runs on all three pages (`src/lib/feed-sort.ts`), so pinning behaves identically everywhere.

- Essay pins take effect on the next dev reload (read straight from frontmatter).
- Project pins flow through the data pipeline — run `npm run build-data` (or `npm run ingest`) so `pinned` lands in `projects.json` and the manifest.

## Figure order (within a project or essay)

Pinning orders whole cards in a feed; this orders the *media within* one project page or essay. Both use the same `order:` list of filenames and the same helper (`src/lib/order-items.ts`) so they behave identically:

```yaml
# In a _project.md (media grid) or an essay's frontmatter (side-rail figures):
order:
  - 03-hero.jpg      # these come first, in this order
  - 01-detail.jpg
  # everything unlisted falls through to alphabetical by filename
```

The rule: listed filenames first, in listed order, then everything else alphabetically. Zero-padded numeric prefixes (`00-`, `01-` …) already sort right with no `order:` list at all — reach for the list only when you want a flow the filenames don't give you.

One essay-only distinction: `order:` controls the side-rail figures. Images you place **inline** with `![caption](file.jpg)` are positioned by where they sit in the prose (and pulled out of the rail so they don't repeat), so the list doesn't apply to them. Use `order:` for rail flow; use inline placement for an image that belongs at a specific point in the text.

## Picking the right context

- Image-led narrative, captions in flow → an essay (inline images).
- A project page that needs prose, a diagram, or code → `layout: doc` project doc.
- The curated front door → home `sections` in `marvin.md`.
- Everything else (a normal project) → just drop images in the folder; the media grid builds itself. See [Content model](/wiki/content-model).
