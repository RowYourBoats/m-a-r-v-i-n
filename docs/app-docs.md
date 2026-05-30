# App documentation pages

Some practice/work projects are **app developments** that ship standalone HTML
documentation (e.g. `public/images/practice/jullie-app/`). The portfolio renders
that documentation's *content* inside its own chrome — real `Base` nav, synced
light/dark theme, `--color-*` / `--font` / `--pad` tokens — instead of the docs'
self-contained styling.

You keep authoring/generating the docs as standalone HTML; the site wraps them
automatically. Nothing in the image-catalogue pipeline touches `.html`.

## How it works

- `src/lib/app-docs.ts` reads every `public/images/**/[!_]*.html` at build time
  (`import.meta.glob(..., { query: "?raw" })`, inlined into the bundle), keeps
  the files whose folder matches a project's `image_folders`, strips each doc's
  own shell, and returns ordered docs + their section headings.
- `src/pages/projects/[slug].astro` detects a doc project (via
  `getProjectDocs`), and if found renders a **single long page**: project header
  → a Wikipedia-style table of contents → each doc stacked → credits. Otherwise
  it renders the normal image/video media grid, unchanged.
- `.appdoc`-scoped rules in `src/styles/global.css` re-skin the docs' class
  vocabulary onto portfolio tokens.

The project itself comes from `projects.json` (built from `_project.md`), so a
doc project needs **no images** to render. To surface it in the Practice/Work
feed, drop one representative cover image into the folder and run
`npm run ingest` — it becomes a normal feed card linking to the project page.

## The template contract

Auto-wrap is a lightweight string transform (no HTML parser), so docs must
follow the conventions the existing Jullie docs already use:

1. **One self-contained HTML file per doc**, with a single `<header>…</header>`
   (containing the title `<h1>` + cross-links + theme toggle) and a trailing
   `<script>` for the toggle. Both the `<header>` and all `<script>` blocks are
   **stripped**; the `<head>`/inline `<style>` is dropped entirely (the
   portfolio supplies styling and theme).
2. **The doc's display label is its first `<h1>`** (e.g. `<h1>workflows</h1>`).
3. **Content is `<section class="section">` blocks**, each opening with a
   `<div class="section-title">…</div>`. Each section is given an anchor id
   derived from that title (prefixed by the file stem, e.g.
   `workflows--gardening`) and listed in the table of contents.
4. **Cross-links use the bare filename**: `href="workflows.html"`. These are
   rewritten to in-page anchors (`#workflows`) since all docs share one page.
   The file stem is the doc's anchor id (`index.html` → `#index`).
5. **Use the established class names** so the re-skin applies:
   - structure: `.section`, `.section-title` (+ `.status`), `.section-desc`,
     `.subsection`, `.subsection-title`, `.command` (+ child `<p>`), `.detail`
   - flow diagrams: `.flow`, `.flow-step`, `.flow-arrow`
   - emphasis: `.callout`, `.axis` (+ `.axis-label`, `.axis-weight`), `.outcome`
     (+ `.outcome-label`)
   - color labels map to the Dick Bruna palette:
     `.kept`/`.tag` → green, `.removed`/`.keyphrase` → accent (red),
     `.reworded`/`.breadth` → yellow, `.added`/`.semantic` → blue,
     `.signature` → orange. Use `code` for inline code (gets `--color-code-bg`).

### Doc order

`index.html` renders first, then the order its nav-links reference the other
docs, then any remaining files alphabetically. Name the entry doc `index.html`.

## Adding a new app's docs

1. Drop the app's HTML docs into `public/images/<tier>/<app-folder>/`.
2. Add a `_project.md` (slug, name, description, credits, …) in that folder.
3. Optionally add a cover image for the feed card.
4. `npm run ingest` (picks up `_project.md` + cover), then the docs appear at
   `/projects/<slug>`.
