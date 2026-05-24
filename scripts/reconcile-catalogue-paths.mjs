#!/usr/bin/env node
// Reconcile image_catalogue.json against public/images/ on disk.
//  - Catalogue entry's file_path missing: try basename remap → else drop.
//  - On-disk file with no catalogue entry: report (needs ingest/describe).
// Pass --apply to write the changes back; dry-run by default.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const catalogPath = path.join(root, "public/images/image_catalogue.json");
const imagesDir = path.join(root, "public/images");
const apply = process.argv.includes("--apply");

// Manual disambiguation for cases where basename matches multiple files.
// Preferred location wins; the others are ignored.
const disambiguate = {
  "work/verizon/selection/Frame 7.png": "work/verizon/future-of-retail/Frame 7.png",
};

// Catalogue entries to drop entirely (file no longer exists on disk).
const dropPaths = new Set([
  "work/herman-miller/brand-system/Image_.jpg",
  "work/herman-miller/brand-system/Image_4.jpg",
  "practice/controlled-instability/explorations/Pratt Class Crit.jpeg",
  "practice/controlled-instability/explorations/Pratt Class Crit2.jpeg",
]);

const catalogue = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

// Build basename → [relPath, ...] index of every file under public/images/
const index = new Map();
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else {
      const rel = path.relative(imagesDir, full).replace(/\\/g, "/");
      const list = index.get(entry.name) || [];
      list.push(rel);
      index.set(entry.name, list);
    }
  }
})(imagesDir);

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|tiff?|bmp|svg)$/i;

const ambiguous = [];
const remaps = [];
const drops = [];

const catalogued = new Set();

for (const entry of catalogue) {
  if (!entry.file_path) continue;
  const fp = entry.file_path.replace(/\\/g, "/");
  const onDisk = path.join(imagesDir, fp);
  if (fs.existsSync(onDisk)) {
    catalogued.add(fp);
    continue;
  }

  if (dropPaths.has(fp)) {
    drops.push({ from: fp, entry, reason: "listed in dropPaths" });
    continue;
  }
  if (disambiguate[fp]) {
    remaps.push({ from: fp, to: disambiguate[fp], entry });
    catalogued.add(disambiguate[fp]);
    continue;
  }

  const base = path.posix.basename(fp);
  const matches = index.get(base) || [];
  if (matches.length === 0) {
    // No trace of this file anywhere on disk — drop it.
    drops.push({ from: fp, entry, reason: "file not on disk anywhere" });
  } else if (matches.length > 1) {
    ambiguous.push({ from: fp, candidates: matches });
  } else {
    remaps.push({ from: fp, to: matches[0], entry });
    catalogued.add(matches[0]);
  }
}

// On-disk files with no catalogue entry (excluding _project.md, json, etc.)
const unregistered = [];
for (const [base, paths] of index.entries()) {
  if (!IMAGE_EXT.test(base)) continue;
  for (const p of paths) {
    if (!catalogued.has(p)) unregistered.push(p);
  }
}
unregistered.sort();

console.log(`unique remaps: ${remaps.length}`);
for (const r of remaps) console.log(`  ${r.from}\n    → ${r.to}`);

if (ambiguous.length) {
  console.log(`\nambiguous (skipped): ${ambiguous.length}`);
  for (const a of ambiguous) {
    console.log(`  ${a.from}`);
    for (const c of a.candidates) console.log(`    ? ${c}`);
  }
}

console.log(`\nentries to drop: ${drops.length}`);
for (const d of drops) console.log(`  ${d.from}  (${d.reason})`);

if (unregistered.length) {
  console.log(`\non-disk but not in catalogue: ${unregistered.length}`);
  for (const u of unregistered) console.log(`  ${u}`);
  console.log(`  → these need an ingest/describe pass before they show up.`);
}

if (apply) {
  const dropSet = new Set(drops.map((d) => d.entry));
  for (const r of remaps) r.entry.file_path = r.to;
  const filtered = catalogue.filter((e) => !dropSet.has(e));
  fs.writeFileSync(catalogPath, JSON.stringify(filtered, null, 2) + "\n");
  console.log(`\napplied ${remaps.length} remaps and dropped ${drops.length} entries`);
} else {
  console.log(`\n(dry run — re-run with --apply to write changes)`);
}
