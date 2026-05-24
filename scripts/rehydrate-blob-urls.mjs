#!/usr/bin/env node
// Restore Vercel Blob URLs on manifest items by matching id against
// manifest.archive.json. The archive was taken before a rebuild wiped
// the https URLs; the blob files themselves never moved, so their URLs
// are still valid. We only re-associate.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "src/data/manifest.json");
const archivePath = path.join(root, "src/data/manifest.archive.json");

const current = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const archive = JSON.parse(fs.readFileSync(archivePath, "utf8"));

const byId = new Map();
for (const it of archive.items || []) {
  if (it.src?.startsWith("https://")) byId.set(it.id, it.src);
}

let matched = 0;
let unmatched = 0;
for (const it of current.items || []) {
  if (it.type === "video") continue;
  if (!it.src?.startsWith("/images/")) continue;
  const url = byId.get(it.id);
  if (url) {
    it.src = url;
    matched++;
  } else {
    unmatched++;
  }
}

fs.writeFileSync(manifestPath, JSON.stringify(current, null, 2));
console.log(`matched: ${matched}, unmatched (no blob upload yet): ${unmatched}`);
