#!/usr/bin/env node
// Migration 2026-06-17b: rename the image axis `subject` → `content`.
// The axis answers "what is it about / what does it depict" — "content" reads
// more naturally than "subject". Pure key rename, no value changes.
//
// Touches the two places per-item axis data lives:
//   - public/images/image_catalogue.json   (per-image `subject` key)
//   - public/images/**/_project.md videos[] (per-video `subject` key)
//
// Code, docs, and the admin portal are renamed separately. Dry-run by default;
// pass --apply to write.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const yaml = require("js-yaml");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const cataloguePath = path.join(root, "public/images/image_catalogue.json");
const imagesDir = path.join(root, "public/images");
const APPLY = process.argv.includes("--apply");

// --- catalogue: rename the `subject` key in place (preserve key order) ---
const catalogue = JSON.parse(fs.readFileSync(cataloguePath, "utf8"));
let catEntries = 0;
const migrated = catalogue.map((e) => {
  if (!("subject" in e)) return e;
  catEntries++;
  const out = {};
  for (const [k, v] of Object.entries(e)) out[k === "subject" ? "content" : k] = v;
  return out;
});
console.log(`catalogue: ${catEntries} entries with a \`subject\` key → \`content\``);

// --- _project.md: rename per-video `subject` → `content` ---
const TIERS = ["work", "practice", "tools", "teaching"];
const renameVideos = (block) => {
  let n = 0;
  if (!block || !Array.isArray(block.videos)) return 0;
  for (const v of block.videos) {
    if ("subject" in v) {
      const out = {};
      for (const [k, val] of Object.entries(v)) out[k === "subject" ? "content" : k] = val;
      // mutate in place: clear + reassign keys in new order
      for (const k of Object.keys(v)) delete v[k];
      Object.assign(v, out);
      n++;
    }
  }
  return n;
};

const fileWrites = [];
for (const tier of TIERS) {
  const tierDir = path.join(imagesDir, tier);
  if (!fs.existsSync(tierDir)) continue;
  for (const client of fs.readdirSync(tierDir)) {
    const f = path.join(tierDir, client, "_project.md");
    if (!fs.existsSync(f)) continue;
    const raw = fs.readFileSync(f, "utf8");
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!m) continue;
    const data = yaml.load(m[1]) || {};
    let c = renameVideos(data);
    for (const sub of Object.values(data.projects || {})) c += renameVideos(sub);
    if (c === 0) continue;
    const next = `---\n${yaml.dump(data, { lineWidth: 120, noRefs: true, quotingType: '"' })}---\n${m[2]}`;
    fileWrites.push({ f, c, next });
    console.log(`  ${path.relative(root, f)}: ${c} video(s)`);
  }
}
console.log(`_project.md: ${fileWrites.reduce((a, b) => a + b.c, 0)} per-video subject keys across ${fileWrites.length} file(s)`);

if (!APPLY) {
  console.log("\ndry-run; pass --apply to write changes.");
  process.exit(0);
}

fs.writeFileSync(cataloguePath, JSON.stringify(migrated, null, 2) + "\n");
for (const w of fileWrites) fs.writeFileSync(w.f, w.next);
console.log(`\nwrote catalogue + ${fileWrites.length} _project.md file(s).`);
