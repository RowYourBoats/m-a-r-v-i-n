#!/usr/bin/env node
// Migration 2026-06-17: sharpen the four image axes (see docs/tag-taxonomy.md).
//
// Pass A — medium value transforms:
//   digital      → ""            (screen/digital work carries no medium)
//   environments → spatial
//   product      → physical
//   video        → motion
//   event        → ""  + add `event` to `format`  (event leaves medium, re-enters format)
//
// Pass B — cross-axis moves (remove from characteristics, write the real axis;
// runs after Pass A so it reads post-rename mediums):
//   characteristic motion     → medium: motion   (if medium empty)
//   characteristic print      → medium: print    (if medium empty)
//   characteristic stationery → format += stationery
//
// Conflict safety: in Pass B, never overwrite a *different real* medium
// (print/spatial/physical/motion). Drop the characteristic but log the entry
// for manual review instead of silently destroying a medium.
//
// Catalogue-only — no _project.md videos carry an explicit `medium: video`
// override (admin deletes defaults), so the build-manifest default flip
// video→motion covers video items. Dry-run by default; pass --apply to write.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const cataloguePath = path.join(root, "public/images/image_catalogue.json");

const APPLY = process.argv.includes("--apply");
const catalogue = JSON.parse(fs.readFileSync(cataloguePath, "utf8"));

const REAL_MEDIA = new Set(["print", "spatial", "physical", "motion"]);
const arr = (v) => (Array.isArray(v) ? v : []);
const addTo = (list, v) => (list.includes(v) ? list : [...list, v]);

const counts = {
  "medium digital→cleared": 0,
  "medium environments→spatial": 0,
  "medium product→physical": 0,
  "medium video→motion": 0,
  "medium event→cleared + format event": 0,
  "char motion→medium motion": 0,
  "char print→medium print": 0,
  "char stationery→format stationery": 0,
};
const conflicts = []; // characteristic moved off, but medium was already a different real medium

// ---- Pass A: medium value transforms ----
for (const e of catalogue) {
  switch (e.medium) {
    case "digital":
      e.medium = "";
      counts["medium digital→cleared"]++;
      break;
    case "environments":
      e.medium = "spatial";
      counts["medium environments→spatial"]++;
      break;
    case "product":
      e.medium = "physical";
      counts["medium product→physical"]++;
      break;
    case "video":
      e.medium = "motion";
      counts["medium video→motion"]++;
      break;
    case "event":
      e.medium = "";
      e.format = addTo(arr(e.format), "event");
      counts["medium event→cleared + format event"]++;
      break;
  }
}

// ---- Pass B: cross-axis moves out of characteristics ----
// value → how to re-home it. `toMedium` set means "claim the medium axis";
// `toFormat` means "append to format".
const move = (e, value, { toMedium, toFormat, label }) => {
  const chr = arr(e.characteristics);
  if (!chr.includes(value)) return;
  e.characteristics = chr.filter((v) => v !== value);
  if (toFormat) {
    e.format = addTo(arr(e.format), value);
    counts[label]++;
    return;
  }
  // toMedium: only claim an empty medium; never clobber a different real one.
  const cur = e.medium || "";
  if (!cur) {
    e.medium = toMedium;
    counts[label]++;
  } else if (cur === toMedium) {
    counts[label]++; // already correct (e.g. video→motion + char motion)
  } else if (REAL_MEDIA.has(cur)) {
    conflicts.push({ file: e.file_path, value, keptMedium: cur, wouldSet: toMedium });
  } else {
    e.medium = toMedium; // empty-ish / unexpected → claim it
    counts[label]++;
  }
};

for (const e of catalogue) {
  move(e, "motion", { toMedium: "motion", label: "char motion→medium motion" });
  move(e, "print", { toMedium: "print", label: "char print→medium print" });
  move(e, "stationery", { toFormat: true, label: "char stationery→format stationery" });
}

// ---- report ----
const totalChanged = Object.values(counts).reduce((a, b) => a + b, 0);
console.log("taxonomy migration 2026-06-17\n");
for (const [k, n] of Object.entries(counts)) console.log(`  ${String(n).padStart(4)}  ${k}`);
console.log(`\n  ${String(totalChanged).padStart(4)}  total field changes`);

if (conflicts.length) {
  console.log(`\nconflicts — characteristic removed but medium left intact (review by hand): ${conflicts.length}`);
  for (const c of conflicts) {
    console.log(`  ${c.file}`);
    console.log(`    kept medium "${c.keptMedium}"; did NOT overwrite with "${c.wouldSet}" (was characteristic "${c.value}")`);
  }
} else {
  console.log("\nno medium conflicts.");
}

console.log(
  `\n##SUMMARY ${JSON.stringify({ step: "migrate-taxonomy-2026-06-17", apply: APPLY, changes: counts, totalChanged, conflicts: conflicts.length })}`,
);

if (!APPLY) {
  console.log("\ndry-run; pass --apply to write changes.");
  process.exit(0);
}

fs.writeFileSync(cataloguePath, JSON.stringify(catalogue, null, 2) + "\n");
console.log(`\nwrote ${totalChanged} field changes → ${path.relative(root, cataloguePath)}`);
