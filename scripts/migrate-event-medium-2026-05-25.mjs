#!/usr/bin/env node
// Migration 2026-05-25: `event` moves from `format` (artifact-shape axis) to
// `medium` (practice/discipline axis). For each catalogue entry that carries
// `format: event`, set `medium: event` (overwriting whatever was there) and
// drop `event` from format. Per the new framing in docs/tag-taxonomy.md:
// medium = practice/discipline, format = output type, orthogonal.
//
// Dry-run by default. Pass --apply to write.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const cataloguePath = path.join(root, "public/images/image_catalogue.json");

const APPLY = process.argv.includes("--apply");

const catalogue = JSON.parse(fs.readFileSync(cataloguePath, "utf8"));

let changed = 0;
const changes = [];
for (const entry of catalogue) {
  const format = Array.isArray(entry.format) ? entry.format : [];
  if (!format.includes("event")) continue;
  const prevMedium = entry.medium || "";
  const newFormat = format.filter((v) => v !== "event");
  entry.format = newFormat;
  entry.medium = "event";
  changes.push({ file: entry.file_path, prevMedium, newFormat });
  changed++;
}

console.log(`${changed} entries to migrate`);
for (const c of changes) {
  console.log(`  ${c.file}`);
  console.log(`    medium: ${c.prevMedium || "(empty)"} → event`);
  console.log(`    format: removed "event" (now: ${JSON.stringify(c.newFormat)})`);
}

if (!APPLY) {
  console.log("\ndry-run; pass --apply to write changes.");
  process.exit(0);
}

fs.writeFileSync(cataloguePath, JSON.stringify(catalogue, null, 2) + "\n");
console.log(`\nwrote ${changed} updates → ${path.relative(root, cataloguePath)}`);
