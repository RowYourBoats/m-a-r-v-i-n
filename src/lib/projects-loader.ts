// Custom content-collection loader for project docs.
//
// Project metadata lives in `_project.md` files, which Astro's glob() loader
// can't see (it ignores `_`-prefixed files) — that underscore is also the
// discriminator that keeps these files out of the `writing` (essay) collection
// and out of build-manifest's essay-folder detection, so we deliberately keep
// it. A custom loader has no such restriction: it reads the files directly,
// validates them against the shared schema (so `render()` works and the data is
// type-checked the same way essays are), and renders the body through Astro's
// configured markdown pipeline (remark-essay-images + remark-diagram).
//
// This replaces the bespoke raw-glob + hand-rolled markdown processor in
// project-doc.ts. The umbrella → sub-project fan-out still lives in
// build-projects.mjs (the one genuinely relational thing the framework can't do);
// this loader is only the document/render half.
//
// File discovery mirrors build-projects.mjs exactly: one `_project.md` per
// `{tier}/{client}` folder. Entry id is that folder (e.g. "work/pratt"), so the
// project route can resolve a slug → entry via projects.json's image_folders.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Loader } from "astro/loaders";
// @ts-ignore — js-yaml ships no bundled types; only used at build time.
import yaml from "js-yaml";

const TIERS = ["work", "practice", "tools", "teaching"];
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const toPosix = (p: string) => p.split(path.sep).join("/");

export function projectsLoader(opts: { baseDir?: string } = {}): Loader {
  const baseDir = opts.baseDir ?? "public/images";
  return {
    name: "projects-loader",
    load: async ({ store, parseData, renderMarkdown, generateDigest, config, logger }) => {
      store.clear();
      const root = fileURLToPath(config.root);
      const imagesDir = path.join(root, baseDir);

      for (const tier of TIERS) {
        const tierDir = path.join(imagesDir, tier);
        if (!fs.existsSync(tierDir)) continue;
        for (const client of fs.readdirSync(tierDir, { withFileTypes: true })) {
          if (!client.isDirectory()) continue;
          const abs = path.join(tierDir, client.name, "_project.md");
          if (!fs.existsSync(abs)) continue;

          const raw = fs.readFileSync(abs, "utf8");
          const m = raw.match(FRONTMATTER);
          const fm = (m ? yaml.load(m[1]) : {}) || {};
          const body = m ? raw.slice(m[0].length) : raw;

          const id = toPosix(path.relative(imagesDir, path.dirname(abs))); // e.g. work/pratt
          const filePath = toPosix(path.relative(root, abs));

          let data;
          try {
            // Applies the collection schema (projectFrontmatterSchema). Throws on
            // a violation, naming the file — same class of failure build-projects
            // surfaces first in `build-data`.
            data = await parseData({ id, data: fm as Record<string, unknown>, filePath });
          } catch (err: any) {
            logger.error(`Invalid project frontmatter in ${filePath}: ${err?.message ?? err}`);
            throw err;
          }

          const digest = generateDigest(raw);
          // fileURL lets remark-essay-images resolve bare-filename images against
          // this file's own folder (it keys off the .md path).
          const rendered = await renderMarkdown(body, { fileURL: pathToFileURL(abs) });

          store.set({
            id,
            data,
            body,
            filePath,
            digest,
            rendered,
            assetImports: rendered?.metadata?.imagePaths,
          });
        }
      }
    },
  };
}
