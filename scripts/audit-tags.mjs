#!/usr/bin/env node
// Tag audit. Read-only. Counts every tag value across:
//   - image-level axes in public/images/image_catalogue.json
//     (format, characteristics, content, medium)
//   - project-level axes in every public/images/{tier}/{client}/_project.md
//     (project_type, characteristic, sector, market, image_tags)
//
// Outputs:
//   - console summary with totals + flags (cross-axis duplicates, singletons)
//   - docs/tag-audit.json — machine-readable counts (regenerated each run)
//
// Run: node scripts/audit-tags.mjs

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
const outPath = path.join(root, "docs/tag-audit.json");

const TIERS = ["work", "practice", "tools", "teaching"];
const IMAGE_AXES = ["format", "characteristics", "content", "medium"];
const PROJECT_AXES = ["project_type", "characteristic", "sector", "market", "image_tags"];

const catalogue = JSON.parse(fs.readFileSync(cataloguePath, "utf8"));

// ---- image-level counts ----
const imageCounts = Object.fromEntries(IMAGE_AXES.map((a) => [a, new Map()]));
for (const entry of catalogue) {
  for (const axis of IMAGE_AXES) {
    const raw = entry[axis];
    const vals = Array.isArray(raw) ? raw : raw ? [raw] : [];
    for (const v of vals) {
      if (!v) continue;
      imageCounts[axis].set(v, (imageCounts[axis].get(v) || 0) + 1);
    }
  }
}

// ---- project-level counts ----
const projectCounts = Object.fromEntries(PROJECT_AXES.map((a) => [a, new Map()]));
const projectFiles = [];
for (const tier of TIERS) {
  const tierDir = path.join(imagesDir, tier);
  if (!fs.existsSync(tierDir)) continue;
  for (const client of fs.readdirSync(tierDir)) {
    const f = path.join(tierDir, client, "_project.md");
    if (!fs.existsSync(f)) continue;
    projectFiles.push(f);
  }
}
for (const f of projectFiles) {
  const raw = fs.readFileSync(f, "utf8");
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) continue;
  const data = yaml.load(m[1]) || {};
  const entries = [data, ...Object.values(data.projects || {})];
  for (const e of entries) {
    if (!e || typeof e !== "object") continue;
    for (const axis of PROJECT_AXES) {
      const raw = e[axis];
      const vals = Array.isArray(raw) ? raw : raw ? [raw] : [];
      for (const v of vals) {
        if (!v) continue;
        projectCounts[axis].set(v, (projectCounts[axis].get(v) || 0) + 1);
      }
    }
  }
}

// ---- flags ----
// (1) Same value used across multiple axes (potential double duty).
const allByValue = new Map(); // value → [{ axis, scope, count }]
const record = (value, axis, scope, count) => {
  if (!allByValue.has(value)) allByValue.set(value, []);
  allByValue.get(value).push({ axis, scope, count });
};
for (const [axis, map] of Object.entries(imageCounts)) {
  for (const [v, n] of map) record(v, axis, "image", n);
}
for (const [axis, map] of Object.entries(projectCounts)) {
  for (const [v, n] of map) record(v, axis, "project", n);
}
const crossAxis = [...allByValue.entries()]
  .filter(([, hits]) => new Set(hits.map((h) => `${h.scope}:${h.axis}`)).size > 1)
  .map(([v, hits]) => ({ value: v, hits }));

// (2) Singletons (count = 1) — either noise or seeds.
const singletons = [];
for (const scope of ["image", "project"]) {
  const src = scope === "image" ? imageCounts : projectCounts;
  for (const [axis, map] of Object.entries(src)) {
    for (const [v, n] of map) {
      if (n === 1) singletons.push({ scope, axis, value: v });
    }
  }
}

// (3) Coverage: % of catalogue with at least one tag in each axis.
const total = catalogue.length;
const coverage = {};
for (const axis of IMAGE_AXES) {
  let withVal = 0;
  for (const e of catalogue) {
    const v = e[axis];
    if (Array.isArray(v) ? v.length > 0 : !!v) withVal++;
  }
  coverage[axis] = { with: withVal, without: total - withVal, total };
}

// (3b) Content is the required floor. The worklist that matters is *published*
// images lacking one — mirrors the curation gate in build-manifest.mjs
// (description OR any tag publishes). Stubs without content are hidden anyway.
const isCurated = (e) =>
  !!(e.description && String(e.description).trim()) ||
  (e.format || []).length + (e.characteristics || []).length + (e.content || []).length + (e.tags || []).length > 0;
const contentBacklog = catalogue.filter((e) => isCurated(e) && !(e.content && e.content.length)).map((e) => e.file_path);

// ---- output ----
const toObj = (m) =>
  Object.fromEntries([...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
const report = {
  generated: new Date().toISOString(),
  catalogue_total: total,
  image_axes: Object.fromEntries(IMAGE_AXES.map((a) => [a, toObj(imageCounts[a])])),
  project_axes: Object.fromEntries(PROJECT_AXES.map((a) => [a, toObj(projectCounts[a])])),
  flags: {
    cross_axis_values: crossAxis,
    singletons,
  },
  coverage,
  content_backlog: contentBacklog,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");

// Console summary.
const pad = (s, n) => String(s).padEnd(n);
function printAxis(name, map, scopeLabel) {
  if (map.size === 0) {
    console.log(`\n${scopeLabel}.${name}: (empty)`);
    return;
  }
  console.log(`\n${scopeLabel}.${name}  (${map.size} distinct)`);
  const rows = [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  for (const [v, n] of rows) console.log(`  ${pad(n, 5)} ${v}`);
}

console.log(`catalogue: ${total} entries`);
console.log("\ncoverage (image axes):");
for (const [a, c] of Object.entries(coverage)) {
  const pct = ((c.with / c.total) * 100).toFixed(1);
  console.log(`  ${pad(a, 16)} ${c.with}/${c.total}  (${pct}%)`);
}
console.log(`\ncontent backlog (published images with no content tag — the required floor): ${contentBacklog.length}`);

console.log("\n=== image-level ===");
for (const a of IMAGE_AXES) printAxis(a, imageCounts[a], "image");

console.log("\n=== project-level ===");
for (const a of PROJECT_AXES) printAxis(a, projectCounts[a], "project");

if (crossAxis.length) {
  console.log(`\n=== cross-axis values (${crossAxis.length}) ===`);
  console.log("(same value used in 2+ axes — review for double duty / overlap)\n");
  for (const { value, hits } of crossAxis.sort((a, b) => a.value.localeCompare(b.value))) {
    console.log(`  ${value}`);
    for (const h of hits) console.log(`     ${pad(h.scope + "." + h.axis, 28)} ${h.count}`);
  }
}

if (singletons.length) {
  console.log(`\n=== singletons (${singletons.length}) ===`);
  console.log("(count=1 — either noise or seeds of a new bucket)\n");
  for (const s of singletons.sort((a, b) =>
    a.scope.localeCompare(b.scope) ||
    a.axis.localeCompare(b.axis) ||
    a.value.localeCompare(b.value)
  )) {
    console.log(`  ${pad(s.scope + "." + s.axis, 28)} ${s.value}`);
  }
}

console.log(`\nwrote ${path.relative(root, outPath)}`);
