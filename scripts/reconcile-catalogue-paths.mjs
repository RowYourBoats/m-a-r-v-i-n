#!/usr/bin/env node
// Reconcile image_catalogue.json against public/images/ on disk.
//  - Catalogue entry's file_path missing: try basename remap (heals renames,
//    preserving tags/description) → else QUARANTINE (report, but keep).
//  - On-disk file with no catalogue entry: report (needs ingest/describe).
//
// Missing entries are kept by default so a rename that changed the basename
// (which looks like a delete) can't silently discard hand-entered tags. Pass
// --drop to actually remove quarantined entries (deliberate cleanup only).
// Pass --apply to write the changes back; dry-run by default.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const catalogPath = path.join(root, "public/images/image_catalogue.json");
const imagesDir = path.join(root, "public/images");
const apply = process.argv.includes("--apply");
const drop = process.argv.includes("--drop");

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
const autoDropped = []; // file missing + no caption → dead ref, removed automatically
const quarantined = []; // file missing + has a caption → kept + warned (--drop to force)

// A hand-written description is the curation worth protecting; tags are often
// auto-applied and cheap to redo. So a missing file with no description is a
// throwaway working file we can safely forget, while one with a description is
// kept (it may just be an unsynced OneDrive file on the other machine).
const hasCaption = (e) => !!(e.description && String(e.description).trim());

// Normalized basename = basename with any leading numeric prefix removed
// ("05-", "11_", "00 "). Used to spot renumber-renames where the basename
// changed but it's the same file, just reordered.
const norm = (fp) => path.posix.basename(fp).toLowerCase().replace(/^\d+[-_\s]*/, "");

// Entries whose file is present on disk, indexed by normalized basename — so a
// missing entry can find the renumbered copy that replaced it.
const onDiskByNorm = new Map();
for (const e of catalogue) {
  const efp = (e.file_path || "").replace(/\\/g, "/");
  if (efp && fs.existsSync(path.join(imagesDir, efp))) {
    const n = norm(efp);
    if (!onDiskByNorm.has(n)) onDiskByNorm.set(n, []);
    onDiskByNorm.get(n).push(e);
  }
}

const migrated = []; // dead ref whose file was renamed/renumbered to an on-disk copy
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
    autoDropped.push({ from: fp, entry, reason: "listed in dropPaths" });
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
    // Rename/renumber healing: a copy with the same normalized name (ignoring a
    // leading number like "05-") may exist on disk — the file was renamed, not
    // deleted. Drop the dead reference and carry its caption/tags to the new
    // file if that one isn't curated yet, so a renumber never loses curation.
    const targets = (onDiskByNorm.get(norm(fp)) || []).filter((e2) => e2 !== entry);
    if (targets.length === 1) {
      migrated.push({ from: fp, to: targets[0].file_path.replace(/\\/g, "/"), entry, target: targets[0] });
    } else if (hasCaption(entry)) {
      // No rename match. Keep + warn so an unsynced file can't wipe a caption.
      quarantined.push({ from: fp, entry, reason: "file missing — has caption, kept" });
    } else {
      autoDropped.push({ from: fp, entry, reason: "file missing — no caption" });
    }
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

if (migrated.length) {
  console.log(`\nrenamed/renumbered (dead ref dropped, file lives on under a new name): ${migrated.length}`);
  for (const m of migrated) {
    const moves = hasCaption(m.entry) && !hasCaption(m.target);
    console.log(`  ${m.from}\n    → ${m.to}${moves ? "   (caption carried over)" : ""}`);
  }
}

if (ambiguous.length) {
  console.log(`\nambiguous (skipped): ${ambiguous.length}`);
  for (const a of ambiguous) {
    console.log(`  ${a.from}`);
    for (const c of a.candidates) console.log(`    ? ${c}`);
  }
}

console.log(`\ndead references removed (missing file, no caption): ${autoDropped.length}`);
for (const q of autoDropped) console.log(`  − ${q.from}  (${q.reason})`);

const quarantineVerb = drop ? "to drop (forced by --drop)" : "kept (missing file, has caption)";
console.log(`\nentries ${quarantineVerb}: ${quarantined.length}`);
for (const q of quarantined) console.log(`  ${q.from}  (${q.reason})`);
if (quarantined.length && !drop) {
  console.log(`  → kept so an unsynced file can't silently lose a caption. Pass --drop to remove these too.`);
}

if (unregistered.length) {
  console.log(`\non-disk but not in catalogue: ${unregistered.length}`);
  for (const u of unregistered) console.log(`  ${u}`);
  console.log(`  → these need an ingest/describe pass before they show up.`);
}

// Machine-readable line for the ingest orchestrator (`npm run ingest`).
console.log(
  `##SUMMARY ${JSON.stringify({
    step: "reconcile",
    apply,
    remaps: remaps.map((r) => ({ from: r.from, to: r.to })),
    renamed: migrated.map((m) => ({ from: m.from, to: m.to })),
    quarantined: quarantined.map((q) => ({ from: q.from, reason: q.reason })),
    dropped: autoDropped.length + migrated.length + (drop ? quarantined.length : 0),
    autoDropped: autoDropped.length,
    ambiguous: ambiguous.length,
    unregistered: unregistered.length,
  })}`,
);

if (apply) {
  for (const r of remaps) r.entry.file_path = r.to;
  // Carry caption/tags onto the renamed file when it isn't curated yet.
  for (const m of migrated) {
    if (hasCaption(m.entry) && !hasCaption(m.target)) {
      m.target.description = m.entry.description;
      for (const k of ["format", "characteristics", "content", "tags"]) {
        if ((!m.target[k] || !m.target[k].length) && Array.isArray(m.entry[k]) && m.entry[k].length) {
          m.target[k] = m.entry[k];
        }
      }
    }
  }
  const dropSet = new Set([...autoDropped, ...migrated].map((q) => q.entry));
  if (drop) for (const q of quarantined) dropSet.add(q.entry);
  const filtered = dropSet.size ? catalogue.filter((e) => !dropSet.has(e)) : catalogue;
  fs.writeFileSync(catalogPath, JSON.stringify(filtered, null, 2) + "\n");
  console.log(
    `\napplied ${remaps.length} remaps, removed ${dropSet.size} dead reference(s)` +
      (drop || !quarantined.length ? "" : ` (kept ${quarantined.length} captioned-but-missing — pass --drop to remove)`),
  );
} else {
  console.log(`\n(dry run — re-run with --apply to write changes)`);
}
