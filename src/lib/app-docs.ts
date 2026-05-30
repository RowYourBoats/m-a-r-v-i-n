// App documentation auto-wrap.
//
// Some practice/work projects are app developments that ship standalone HTML
// documentation (e.g. public/images/practice/jullie-app/{index,workflows,
// vector-database}.html). The build pipeline ignores .html, so these never
// reach manifest.json/projects.json. This module reads them directly at build
// time and reshapes them so the project page can render the *content* inside
// the portfolio's own chrome (Base nav, synced theme, --color-* tokens).
//
// The transform strips each doc's self-contained shell (its <head>/<style>,
// <header> + theme toggle, and <script>), assigns anchor ids so the three docs
// can live on one long page with a Wikipedia-style table of contents, and
// rewrites the docs' filename cross-links (href="workflows.html") into in-page
// anchors (#workflows). The doc class vocabulary (.section, .flow, .callout,
// .axis, code, …) is re-skinned by the `.appdoc`-scoped rules in global.css.
//
// Contract: docs must follow the shared template — see docs/app-docs.md.

// Raw HTML for every doc under public/images, inlined into the bundle at build
// time (works under the server adapter and on Vercel; same import.meta.glob
// pattern src/pages/diagrams/[slug].astro uses for diagram components).
const RAW_DOCS = import.meta.glob("/public/images/**/[!_]*.html", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export interface DocSection {
  id: string;
  label: string;
}
export interface ProjectDoc {
  /** Filename stem — the anchor target for cross-links (e.g. "workflows"). */
  id: string;
  /** Display label from the doc's <h1>. */
  label: string;
  /** Section headings within this doc, for the nested TOC. */
  sections: DocSection[];
  /** Transformed, shell-stripped body HTML ready for <Fragment set:html>. */
  html: string;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&[a-z]+;/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const stripTags = (s: string) => s.replace(/<[^>]+>/g, "");

const decodeBasicEntities = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim()
    .replace(/\s+/g, " ");

/** "/public/images/practice/jullie-app/index.html" -> "practice/jullie-app" */
function dirKey(globKey: string): string {
  const rel = globKey.replace(/^\/public\/images\//, "");
  const lastSlash = rel.lastIndexOf("/");
  return lastSlash === -1 ? "" : rel.slice(0, lastSlash);
}

/** "/public/images/.../vector-database.html" -> "vector-database" */
function stem(globKey: string): string {
  const file = globKey.slice(globKey.lastIndexOf("/") + 1);
  return file.replace(/\.html$/i, "");
}

function extractBody(html: string): string {
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return m ? m[1] : html;
}

function firstH1(html: string): string {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return m ? decodeBasicEntities(stripTags(m[1])) : "";
}

/** Cross-link order declared by index.html's nav-links, e.g. [workflows, …]. */
function navOrder(indexHtml: string): string[] {
  const order: string[] = [];
  const re = /href\s*=\s*"([\w-]+)\.html"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(indexHtml))) {
    if (!order.includes(m[1])) order.push(m[1]);
  }
  return order;
}

/**
 * Transform one doc body: drop header/scripts, id each <section> from its
 * .section-title (prefixed by the doc stem to stay unique across docs), and
 * rewrite filename cross-links to in-page anchors. Returns the cleaned HTML
 * plus the collected section headings.
 */
function transform(body: string, docId: string): { html: string; sections: DocSection[] } {
  // Strip the doc's own chrome.
  let out = body
    .replace(/<header[\s\S]*?<\/header>/i, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "");

  const sections: DocSection[] = [];

  // Sections never nest, so a non-greedy match to the next </section> is safe.
  out = out.replace(
    /<section\b([^>]*)>([\s\S]*?)<\/section>/gi,
    (_full, attrs: string, inner: string) => {
      const titleMatch = inner.match(/<div class="section-title">([\s\S]*?)<\/div>/i);
      const label = titleMatch ? decodeBasicEntities(stripTags(titleMatch[1])) : "";
      const id = `${docId}--${slugify(label) || sections.length + 1}`;
      if (label) sections.push({ id, label });
      // Preserve the original class attribute; add our anchor id.
      return `<section${attrs} id="${id}">${inner}</section>`;
    }
  );

  // Cross-doc links: href="workflows.html" / "workflows.html#x" -> "#workflows".
  out = out.replace(/href\s*=\s*"([\w-]+)\.html(#[\w-]*)?"/gi, 'href="#$1"');

  return { html: out, sections };
}

/**
 * Returns the ordered docs for a project, or [] when the project's folders hold
 * no HTML docs (i.e. it's a normal media project). `imageFolders` comes from
 * projects.json (e.g. ["practice/jullie-app"]).
 */
export function getProjectDocs(imageFolders: string[] | undefined): ProjectDoc[] {
  if (!imageFolders || !imageFolders.length) return [];
  const folders = new Set(imageFolders.map((f) => f.replace(/\\/g, "/")));

  const mine = Object.entries(RAW_DOCS).filter(([key]) => folders.has(dirKey(key)));
  if (!mine.length) return [];

  const byStem = new Map<string, { key: string; raw: string }>();
  for (const [key, raw] of mine) byStem.set(stem(key), { key, raw });

  // An app-docs folder must have an index.html entry doc (see docs/app-docs.md).
  // Guards against a stray .html (e.g. a diagram reference) being mistaken for
  // documentation and replacing a project's normal media grid.
  if (!byStem.has("index")) return [];

  // index first, then index's nav-link order, then any leftovers alphabetically.
  const ordered: string[] = [];
  const push = (s: string) => {
    if (byStem.has(s) && !ordered.includes(s)) ordered.push(s);
  };
  push("index");
  if (byStem.has("index")) navOrder(byStem.get("index")!.raw).forEach(push);
  [...byStem.keys()].sort().forEach(push);

  return ordered.map((s) => {
    const { raw } = byStem.get(s)!;
    const body = extractBody(raw);
    const label = firstH1(body) || s;
    const { html, sections } = transform(body, s);
    return { id: s, label, sections, html };
  });
}
