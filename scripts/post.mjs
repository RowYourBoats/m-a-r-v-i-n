#!/usr/bin/env node

/**
 * CLI posting script — appends entries to manifest.json
 * and copies images into public/images/.
 *
 * Usage:
 *   npm run post -- image --title "Store facade" --tags retail,spatial --medium "built environment" --project verizon-5g --image ./photo.jpg
 *   npm run post -- image --title "Morning sketch" --tags sketch --personal --image ./photo.jpg
 *   npm run post -- video --title "Walkthrough" --video "https://player.vimeo.com/video/123" --tags retail --project verizon-5g
 *   npm run post -- writing --title "On Form" --tags essay --personal
 */

import { copyFileSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { basename, extname, resolve, join } from "path";

const args = process.argv.slice(2);
const type = args[0]; // image | video | writing

function flag(name) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : undefined;
}

function hasFlag(name) {
  return args.includes(`--${name}`);
}

if (!["image", "video", "writing"].includes(type)) {
  console.error("Usage: npm run post -- <image|video|writing> [flags]");
  console.error("  --title     Title");
  console.error("  --tags      Comma-separated tags");
  console.error("  --medium    Medium (e.g., 'built environment', 'print')");
  console.error("  --project   Project slug");
  console.error("  --image     Path to image file (image type)");
  console.error("  --video     Vimeo embed URL (video type)");
  console.error("  --personal  Mark as personal/practice work");
  console.error("  --featured  Mark as featured (full-width)");
  process.exit(1);
}

const manifestPath = resolve("src/data/manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

const title = flag("title") || "Untitled";
const tags = (flag("tags") || "")
  .split(",")
  .map((t) => t.trim())
  .filter(Boolean);
const medium = flag("medium") || "";
const project = flag("project") || "";
const personal = hasFlag("personal");
const featured = hasFlag("featured");

// Generate ID from title
const id = title
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/(^-|-$)/g, "");

const entry = {
  id,
  type,
  title,
};

if (tags.length) entry.tags = tags;
if (medium) entry.medium = medium;
if (project) entry.project = project;
if (personal) entry.personal = true;
if (featured) entry.featured = true;

if (type === "image") {
  const imagePath = flag("image");
  if (imagePath) {
    const ext = extname(imagePath);
    const dest = `${id}${ext}`;
    mkdirSync(resolve("public/images"), { recursive: true });
    copyFileSync(imagePath, join(resolve("public/images"), dest));
    entry.src = `/images/${dest}`;
    console.log(`Copied image → public/images/${dest}`);
  } else {
    console.warn("No --image provided.");
  }
}

if (type === "video") {
  const videoUrl = flag("video");
  if (videoUrl) {
    entry.video = videoUrl;
  } else {
    console.warn("No --video provided.");
  }
}

if (type === "writing") {
  const today = new Date().toISOString().slice(0, 10);
  entry.date = today;
  entry.body = `${id}.md`;

  // Create empty markdown file
  const writingDir = resolve("src/data/writing");
  mkdirSync(writingDir, { recursive: true });
  writeFileSync(join(writingDir, entry.body), `Start writing here.\n`);
  console.log(`Created src/data/writing/${entry.body}`);
}

manifest.items.push(entry);
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`Added "${title}" to manifest.json`);
