#!/usr/bin/env node
// Uploads all images referenced in manifest.json to Vercel Blob,
// then rewrites manifest src fields with CDN URLs.
// Skips files that are already uploaded (URL starts with https://).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { put, list } from "@vercel/blob";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "src/data/manifest.json");
const imagesDir = path.join(root, "public");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) {
  console.error("BLOB_READ_WRITE_TOKEN not set. Add it to .env or environment.");
  process.exit(1);
}

// Adopt-existing pass: build pathname → url map from the live blob store, so
// items whose manifest src lost its URL (build-data fragility) can re-adopt
// the existing blob instead of re-uploading or failing on "already exists".
const existing = new Map();
let cursor;
do {
  const page = await list({ token, cursor, limit: 1000 });
  for (const b of page.blobs) existing.set(b.pathname, b.url);
  cursor = page.cursor;
} while (cursor);
console.log(`indexed ${existing.size} existing blobs`);

let uploaded = 0;
let adopted = 0;
let skipped = 0;
let failed = 0;

for (const item of manifest.items) {
  if (!item.src || item.src.startsWith("https://")) {
    skipped++;
    continue;
  }

  const blobPath = item.src.replace(/^\/images\//, "images/");

  const existingUrl = existing.get(blobPath);
  if (existingUrl) {
    item.src = existingUrl;
    adopted++;
    continue;
  }

  const localPath = path.join(imagesDir, item.src);
  if (!fs.existsSync(localPath)) {
    console.warn("missing:", item.src);
    failed++;
    continue;
  }

  const file = fs.readFileSync(localPath);

  try {
    const blob = await put(blobPath, file, {
      access: "public",
      token,
      addRandomSuffix: false,
    });
    item.src = blob.url;
    uploaded++;
    if (uploaded % 10 === 0) console.log(`uploaded ${uploaded}...`);
  } catch (err) {
    console.error("failed:", item.src, err.message);
    failed++;
  }
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`done — uploaded: ${uploaded}, adopted: ${adopted}, skipped: ${skipped}, failed: ${failed}`);
