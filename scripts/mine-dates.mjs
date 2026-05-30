#!/usr/bin/env node
// Walks public/images/ and stamps each image_catalogue entry with the file's
// birthtime (ISO string). Falls back to mtime if birthtime is epoch-0.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const imagesDir = path.join(root, "public/images");
const catalogPath = path.join(imagesDir, "image_catalogue.json");

const catalogue = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

let stamped = 0;
let missing = 0;
for (const entry of catalogue) {
  if (!entry.file_path) continue;
  const abs = path.join(imagesDir, entry.file_path);
  try {
    const st = fs.statSync(abs);
    const birth = st.birthtime && st.birthtime.getTime() > 0 ? st.birthtime : st.mtime;
    entry.created = birth.toISOString();
    stamped++;
  } catch {
    missing++;
  }
}

fs.writeFileSync(catalogPath, JSON.stringify(catalogue, null, 2) + "\n");
console.log(`stamped ${stamped}, missing ${missing} → ${path.relative(root, catalogPath)}`);
console.log(`##SUMMARY ${JSON.stringify({ step: "mine-dates", stamped, missing })}`);
