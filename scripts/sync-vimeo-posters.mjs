#!/usr/bin/env node
// Walk every page in src/content/pages, find Vimeo URLs used as filmstrip
// asset src, and resolve their canonical poster image via Vimeo oEmbed.
// Writes a git-tracked cache at src/data/vimeo-posters.json so the
// Filmstrip component can look up posters at build time without per-build
// network calls. Re-running is idempotent — only unknown IDs are fetched.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const pagesDir = path.join(root, "src/content/pages");
const cachePath = path.join(root, "src/data/vimeo-posters.json");

const APPLY = process.argv.includes("--apply");

// Lazy YAML loader — match the build-projects.mjs pattern.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const yaml = require("js-yaml");

const parseFrontmatter = (text) => {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  try { return yaml.load(m[1]) || {}; } catch { return null; }
};

const vimeoIdFrom = (url) => {
  if (!url) return null;
  const clean = url.replace(/&amp;/g, "&");
  const m = clean.match(/player\.vimeo\.com\/video\/(\d+)/);
  return m ? m[1] : null;
};

// Walk pages, collect every unique Vimeo ID referenced in filmstrip assets.
const ids = new Set();
for (const f of fs.readdirSync(pagesDir)) {
  if (!f.endsWith(".md")) continue;
  const data = parseFrontmatter(fs.readFileSync(path.join(pagesDir, f), "utf8"));
  if (!data || !Array.isArray(data.sections)) continue;
  for (const s of data.sections) {
    if (s.kind !== "filmstrip" || !Array.isArray(s.assets)) continue;
    for (const a of s.assets) {
      const id = vimeoIdFrom(a.src);
      if (id) ids.add(id);
    }
  }
}

const existing = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, "utf8")) : {};
const missing = [...ids].filter((id) => !existing[id]);

console.log(`vimeo IDs referenced: ${ids.size}, cached: ${ids.size - missing.length}, to fetch: ${missing.length}`);
if (missing.length === 0) {
  if (!fs.existsSync(cachePath)) {
    if (APPLY) fs.writeFileSync(cachePath, JSON.stringify(existing, null, 2) + "\n");
    console.log(APPLY ? `wrote empty cache → ${path.relative(root, cachePath)}` : "(dry-run) would write empty cache");
  }
  process.exit(0);
}

if (!APPLY) {
  console.log("dry-run; pass --apply to fetch + write cache. Would fetch:");
  for (const id of missing) console.log(`  ${id}`);
  process.exit(0);
}

const out = { ...existing };
for (const id of missing) {
  const url = `https://vimeo.com/api/oembed.json?url=https%3A//vimeo.com/${id}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  ${id}: ${res.status} ${res.statusText}`);
      continue;
    }
    const json = await res.json();
    const poster = json.thumbnail_url;
    if (poster) {
      out[id] = poster;
      console.log(`  ${id}: ${poster}`);
    } else {
      console.warn(`  ${id}: no thumbnail_url in oEmbed response`);
    }
  } catch (err) {
    console.warn(`  ${id}: ${err.message}`);
  }
}

fs.writeFileSync(cachePath, JSON.stringify(out, null, 2) + "\n");
console.log(`wrote ${Object.keys(out).length} entries → ${path.relative(root, cachePath)}`);
