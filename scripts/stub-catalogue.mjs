#!/usr/bin/env node
// Register images in a folder into image_catalogue.json as STUB entries
// (empty tag axes, filename-derived title). A lightweight stand-in for the
// Ollama miner (public/images/miner.cjs): it gets newly-added images into the
// catalogue so they flow through `build-data` → `upload-blob` and show up in
// the /admin/images portal for hand-tagging. Run the real miner later if you
// want auto-generated descriptions/tags — it skips anything already present.
//
// Only adds images not already in the catalogue (matched by file_path), so
// it's safe to re-run. Dry-run by default; pass --apply to write.
//
// Usage:   node scripts/stub-catalogue.mjs <folder-under-public/images> [--apply]
//          node scripts/stub-catalogue.mjs --all [--apply]   (whole tree; used by `npm run ingest`)
// Example: node scripts/stub-catalogue.mjs work/studio/marin-montessori --apply

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const catalogPath = path.join(root, "public/images/image_catalogue.json");
const imagesDir = path.join(root, "public/images");

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const all = args.includes("--all");
const target = args.find((a) => !a.startsWith("--"));

if (!all && !target) {
  console.error("usage: node scripts/stub-catalogue.mjs <folder-under-public/images> [--apply]");
  console.error("       node scripts/stub-catalogue.mjs --all [--apply]");
  process.exit(1);
}

// --all scans the whole tree; otherwise resolve target relative to public/images
// and guard the boundary.
let rel, absDir;
if (all) {
  rel = ".";
  absDir = imagesDir;
} else {
  rel = path.relative(imagesDir, path.resolve(imagesDir, target)).replace(/\\/g, "/");
  absDir = path.join(imagesDir, rel);
  if (!rel || rel.startsWith("..") || !fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) {
    console.error(`not a folder under public/images: ${target}`);
    process.exit(1);
  }
}
const scope = all ? "the whole tree" : rel;

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)$/i;

const catalogue = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const have = new Set(catalogue.map((e) => (e.file_path || "").replace(/\\/g, "/")));

// Filename → title: drop extension, collapse separators to spaces.
const titleFromFile = (file) =>
  file.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();

const found = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name.startsWith("_")) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs);
    else if (IMAGE_EXT.test(entry.name)) {
      const fp = path.relative(imagesDir, abs).replace(/\\/g, "/");
      if (!have.has(fp)) found.push(fp);
    }
  }
})(absDir);

found.sort();

// Machine-readable line for the ingest orchestrator (`npm run ingest`).
const summary = (added) =>
  console.log(`##SUMMARY ${JSON.stringify({ step: "stub", apply, added })}`);

if (found.length === 0) {
  console.log(`no new images under ${scope} — everything there is already catalogued.`);
  summary([]);
  process.exit(0);
}

const stubs = found.map((fp) => ({
  title: titleFromFile(path.posix.basename(fp)),
  description: "",
  medium: "",
  client: "",
  style: "",
  file_path: fp,
  format: [],
  characteristics: [],
  subject: [],
}));

console.log(`${found.length} new image(s) under ${scope}:`);
for (const s of stubs) console.log(`  + ${s.file_path}  ("${s.title}")`);

if (apply) {
  catalogue.push(...stubs);
  fs.writeFileSync(catalogPath, JSON.stringify(catalogue, null, 2) + "\n");
  console.log(`\nappended ${stubs.length} stub entr${stubs.length === 1 ? "y" : "ies"} → public/images/image_catalogue.json`);
  console.log("next: `npm run build-data`, then upload-blob. Tag them later in /admin/images.");
} else {
  console.log("\n(dry run — re-run with --apply to write)");
}
summary(found);
