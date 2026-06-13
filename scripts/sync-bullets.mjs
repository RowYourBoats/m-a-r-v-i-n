#!/usr/bin/env node
// Mirror resume bullets from the Jullie-Resume gdrive editing source into the
// repo's content collection (src/content/bullets). gdrive is the source of
// truth; this copies real files in so the site builds anywhere (Vercel, Mac,
// Windows) without depending on a junction/symlink.
//
// Mirror semantics: adds new bullets, overwrites changed ones, and deletes
// repo bullets that no longer exist in the source (so renames propagate). Only
// touches *.md; .gitkeep is preserved. _template.md is copied through (the
// collection loader already excludes it).
//
// Dry-run by default — prints the plan and writes nothing. Pass --apply to
// commit the changes to disk.
//
// Source resolution (first match wins):
//   --src=<path>           CLI flag
//   $BULLETS_SRC           environment variable
//   default                G:\My Drive\Claude Coding\Jullie-Resume-data\input\bullets  (Windows)
//                          ~/Google Drive/.../input/bullets is the Mac equivalent — pass --src there.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dest = path.join(root, "src", "content", "bullets");

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const srcFlag = args.find((a) => a.startsWith("--src="))?.slice("--src=".length);
const DEFAULT_SRC = "G:\\My Drive\\Claude Coding\\Jullie-Resume-data\\input\\bullets";
const src = srcFlag || process.env.BULLETS_SRC || DEFAULT_SRC;

if (!fs.existsSync(src)) {
  console.error(`Source folder not found: ${src}`);
  console.error("Pass --src=<path> or set BULLETS_SRC (Mac uses a different gdrive path).");
  process.exit(1);
}
if (!fs.existsSync(dest)) {
  fs.mkdirSync(dest, { recursive: true });
}

const mdFiles = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => e.name);

const srcFiles = new Set(mdFiles(src));
const destFiles = new Set(mdFiles(dest));

const adds = [];
const updates = [];
const deletes = [];

for (const name of srcFiles) {
  const from = fs.readFileSync(path.join(src, name), "utf8");
  if (!destFiles.has(name)) {
    adds.push({ name, from });
  } else {
    const cur = fs.readFileSync(path.join(dest, name), "utf8");
    if (cur !== from) updates.push({ name, from });
  }
}
for (const name of destFiles) {
  if (!srcFiles.has(name)) deletes.push(name);
}

const plan = (label, items) => {
  if (!items.length) return;
  console.log(`\n${label} (${items.length}):`);
  for (const it of items) console.log(`  ${typeof it === "string" ? it : it.name}`);
};

console.log(`Source: ${src}`);
console.log(`Dest:   ${dest}`);
plan("ADD", adds);
plan("UPDATE", updates);
plan("DELETE", deletes);

if (!adds.length && !updates.length && !deletes.length) {
  console.log("\nUp to date — nothing to do.");
  process.exit(0);
}

if (!apply) {
  console.log(`\nDry run. Re-run with --apply to write ${adds.length + updates.length} file(s) and remove ${deletes.length}.`);
  process.exit(0);
}

for (const { name, from } of [...adds, ...updates]) {
  fs.writeFileSync(path.join(dest, name), from);
}
for (const name of deletes) {
  fs.unlinkSync(path.join(dest, name));
}
console.log(`\nApplied: +${adds.length} ~${updates.length} -${deletes.length}.`);
