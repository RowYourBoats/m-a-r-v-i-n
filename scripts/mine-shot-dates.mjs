#!/usr/bin/env node
// Mine real capture dates for catalogue entries in one folder.
//
// Reads EXIF DateTimeOriginal (via the `exifr` package) when present, then
// falls back to filename date patterns (Screenshot YYYY-MM-DD…, IMG_YYYYMMDD,
// bare YYYY-MM-DD prefix). On a hit, writes:
//   date_source: "exif" | "filename"
//   created_date: <ISO timestamp>
// to the catalogue entry.
//
// `build-manifest.mjs` honors these dates ONLY when the item's project is
// flagged `chronological: true` in its _project.md. Most projects are coherent
// collections (decks, books, campaigns) where the project's date_range is
// authoritative — per-item dates would scramble project clusters in the grid.
// Opt in for snapshot folders and timeline-like collections. Typical workflow:
//
//   1. Create _project.md in the folder with `chronological: true` (and a
//      date_range / personal flag as needed).
//   2. node scripts/mine-shot-dates.mjs <folder> --apply
//   3. npm run build-data
//
// Idempotent — skips entries that already carry `date_source`. Dry-run by
// default; pass `--apply` to write.
//
// Usage:   node scripts/mine-shot-dates.mjs <folder-under-public/images> [--apply]
// Example: node scripts/mine-shot-dates.mjs practice/snapshots --apply

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import exifr from "exifr";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const catalogPath = path.join(root, "public/images/image_catalogue.json");
const imagesDir = path.join(root, "public/images");
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const target = args.find((a) => !a.startsWith("--"));

if (!target) {
  console.error("usage: node scripts/mine-shot-dates.mjs <folder-under-public/images> [--apply]");
  process.exit(1);
}

const rel = path.relative(imagesDir, path.resolve(imagesDir, target)).replace(/\\/g, "/");
const absDir = path.join(imagesDir, rel);
if (!rel || rel.startsWith("..") || !fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) {
  console.error(`not a folder under public/images: ${target}`);
  process.exit(1);
}

const catalogue = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

// Filename → ISO. First match wins. Time portion preserved when present.
function dateFromFilename(filename) {
  let m = filename.match(/Screenshot[ _-]?(\d{4})-(\d{2})-(\d{2})(?:[ _-]?(\d{2})(\d{2})(\d{2}))?/i);
  if (m) {
    const [, y, mo, d, hh, mm, ss] = m;
    return `${y}-${mo}-${d}T${hh || "00"}:${mm || "00"}:${ss || "00"}Z`;
  }
  m = filename.match(/^IMG[_-]?(\d{4})(\d{2})(\d{2})(?:[_-]?(\d{2})(\d{2})(\d{2}))?/i);
  if (m) {
    const [, y, mo, d, hh, mm, ss] = m;
    return `${y}-${mo}-${d}T${hh || "00"}:${mm || "00"}:${ss || "00"}Z`;
  }
  m = filename.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const [, y, mo, d] = m;
    return `${y}-${mo}-${d}T00:00:00Z`;
  }
  return null;
}

let scanned = 0;
let skipped = 0;
let triedExif = 0;
let gotExif = 0;
let gotFilename = 0;
const updates = [];

for (const entry of catalogue) {
  if (!entry.file_path) continue;
  const fp = entry.file_path.replace(/\\/g, "/");
  if (!fp.startsWith(rel + "/") && fp !== rel) continue;
  scanned++;
  if (entry.date_source) { skipped++; continue; }

  const abs = path.join(imagesDir, fp);
  if (!fs.existsSync(abs)) continue;

  const filename = path.basename(fp);
  let date = null;
  let source = null;

  if (/\.(jpe?g|heic|heif|tiff?)$/i.test(filename)) {
    triedExif++;
    try {
      const result = await exifr.parse(abs, { pick: ["DateTimeOriginal", "CreateDate"] });
      const dt = result?.DateTimeOriginal || result?.CreateDate;
      if (dt instanceof Date && !Number.isNaN(dt.getTime())) {
        date = dt.toISOString();
        source = "exif";
        gotExif++;
      }
    } catch (e) {
      // Treat parse errors as "no EXIF" and fall through to filename.
    }
  }

  if (!date) {
    const fd = dateFromFilename(filename);
    if (fd) {
      date = fd;
      source = "filename";
      gotFilename++;
    }
  }

  if (date && source) {
    updates.push({ entry, date, source });
  }
}

console.log(`Folder: ${rel}`);
console.log(`Catalogue entries under folder: ${scanned}`);
console.log(`Skipped (already populated):    ${skipped}`);
console.log(`EXIF tried: ${triedExif} → hits: ${gotExif}`);
console.log(`Filename hits: ${gotFilename}`);
console.log(`Total updates queued: ${updates.length}`);

if (updates.length > 0) {
  console.log("\nUpdates:");
  for (const u of updates) {
    console.log(`  ${u.source.padEnd(8)} ${u.date.slice(0, 10)}  ${u.entry.file_path}`);
  }
}

if (apply) {
  for (const u of updates) {
    u.entry.date_source = u.source;
    u.entry.created_date = u.date;
  }
  fs.writeFileSync(catalogPath, JSON.stringify(catalogue, null, 2) + "\n");
  console.log(`\nWrote ${updates.length} updates → public/images/image_catalogue.json`);
  console.log("Next: npm run build-data (then upload-blob if any are new images).");
} else {
  console.log("\n(dry run — re-run with --apply to write)");
}
