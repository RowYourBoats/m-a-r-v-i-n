// Inline images for writing essays.
//
// Essay bodies (the `writing` collection, public/images/**/[!_]*.md) ship as
// markdown only — the image *binaries* aren't committed; they live in Vercel
// Blob and reach the page as manifest `src` URLs (see build-manifest + the
// side-rail figures in writing/[...slug].astro). So a plain `![](file.png)`
// in the body would 404 in prod.
//
// This plugin closes that gap: a body image written as a BARE companion
// filename — `![A wide view](garden-wide.png)` — is rewritten to that image's
// blob URL (plus width/height for no layout shift). The filename is matched
// against the essay's own folder, so authors reference uploads by name and
// never paste a fragile blob URL (which a rebuild can churn).
//
// Wired into astro.config.mjs's markdown.remarkPlugins, so it runs for every
// content-collection markdown render. Bare filenames that don't resolve, and
// any absolute/rooted/remote URL, pass through untouched — bullets and pages
// carry no such images, so it no-ops there.
import manifest from "../data/manifest.json" with { type: "json" };

// "<host>/images/tools/kept-app/jullie-resume-app.png" -> keyed by the path
// after "/images/": "tools/kept-app/jullie-resume-app.png".
const byPath = new Map();
for (const item of manifest.items) {
  if (!item.src) continue;
  const m = item.src.match(/\/images\/(.+)$/);
  if (m) byPath.set(m[1], item);
}

// A bare filename: no scheme, not root-anchored, no path separator.
const isBareFilename = (url) => !!url && !/^(?:https?:|\/)/.test(url) && !url.includes("/");

// Walk the mdast for image nodes without pulling in unist-util-visit.
function eachImage(node, fn) {
  if (!node || typeof node !== "object") return;
  if (node.type === "image") fn(node);
  if (Array.isArray(node.children)) for (const c of node.children) eachImage(c, fn);
}

export default function remarkEssayImages() {
  return (tree, file) => {
    const path = (file?.path || file?.history?.[0] || "").replace(/\\/g, "/");
    // Only essays under public/images resolve; derive the essay's folder.
    const fm = path.match(/\/public\/images\/(.+)\/[^/]+\.md$/);
    if (!fm) return;
    const folder = fm[1];

    eachImage(tree, (node) => {
      if (!isBareFilename(node.url)) return;
      const hit = byPath.get(`${folder}/${node.url}`);
      if (!hit) return;
      node.url = hit.src;
      node.data = node.data || {};
      node.data.hProperties = {
        ...(node.data.hProperties || {}),
        ...(hit.width && hit.height ? { width: hit.width, height: hit.height } : {}),
        loading: "lazy",
        decoding: "async",
      };
    });
  };
}
