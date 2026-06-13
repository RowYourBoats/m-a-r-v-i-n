// Markdown-authored project pages.
//
// A project can author its detail page as the markdown *body* of its own
// `_project.md` (the frontmatter still feeds projects.json via
// build-projects.mjs). This renders that markdown body to HTML — including
// inline animated diagrams (```diagram fences, see remark-diagram.mjs) — for the
// project route to inject with `set:html`.
//
// Why not a content collection? Astro's content-layer `glob` loader ignores
// `_`-prefixed files, so it can't see `_project.md`. Vite's import.meta.glob
// (used below) has no such rule.
import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import remarkDiagram from "./remark-diagram.mjs";

type MarkdownProcessor = Awaited<ReturnType<typeof createMarkdownProcessor>>;

export interface ProjectDocResult {
  /** Rendered body HTML, ready for `<Fragment set:html>`. */
  html: string;
}

// Raw markdown for every _project.md, inlined into the build (server-side only;
// not shipped to the client). Vite picomatch — no underscore special-casing.
const RAW = import.meta.glob("/public/images/**/_project.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** "/public/images/tools/jullie-app/_project.md" -> "tools/jullie-app" */
function dirKey(globKey: string): string {
  const rel = globKey.replace(/^\/public\/images\//, "");
  const i = rel.lastIndexOf("/");
  return i === -1 ? "" : rel.slice(0, i);
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
function splitFrontmatter(raw: string): { fm: string; body: string } {
  const m = raw.match(FRONTMATTER);
  return m ? { fm: m[1], body: raw.slice(m[0].length) } : { fm: "", body: raw };
}

// Opt-in: only `_project.md` files declaring `layout: doc` render as a markdown
// page. Everything else keeps the normal media-grid behavior. A
// regex (not a YAML parse) keeps this dependency-free — it's the only field we
// branch on here.
const isDocLayout = (fm: string) => /^layout:\s*["']?doc["']?\s*$/m.test(fm);

let _processor: MarkdownProcessor | null = null;
async function processor(): Promise<MarkdownProcessor> {
  if (!_processor) {
    _processor = await createMarkdownProcessor({
      // Plain <pre><code> (no shiki) — reskinned by .projectdoc code; keeps the
      // minimal palette and lets remarkDiagram intercept the ```diagram fence.
      syntaxHighlight: false,
      remarkPlugins: [remarkDiagram],
    });
  }
  return _processor;
}

/**
 * Render a project's markdown doc, or null when the project's folder has no
 * `layout: doc` `_project.md` (i.e. it's a normal media project).
 * `imageFolders` comes from projects.json (e.g. ["tools/jullie-app"]).
 */
export async function getProjectDoc(
  imageFolders: string[] | undefined,
): Promise<ProjectDocResult | null> {
  if (!imageFolders || !imageFolders.length) return null;
  const folders = new Set(imageFolders.map((f) => f.replace(/\\/g, "/")));

  const hit = Object.entries(RAW).find(([key]) => folders.has(dirKey(key)));
  if (!hit) return null;

  const { fm, body } = splitFrontmatter(hit[1]);
  if (!isDocLayout(fm)) return null;

  const proc = await processor();
  const res = await proc.render(body);
  return { html: res.code };
}
