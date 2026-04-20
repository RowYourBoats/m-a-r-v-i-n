#!/usr/bin/env node
// Rebuild src/data/manifest.json from image_catalogue.json + projects.json.
// Archives the previous manifest.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { imageSize } from "image-size";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const catalogPath = path.join(root, "public/images/image_catalogue.json");
const projectsPath = path.join(root, "src/data/projects.json");
const manifestPath = path.join(root, "src/data/manifest.json");
const archivePath = path.join(root, "src/data/manifest.archive.json");
const imagesDir = path.join(root, "public/images");

const catalogue = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const registry = JSON.parse(fs.readFileSync(projectsPath, "utf8"));

// Preserve existing Blob URLs + dimensions from the current manifest so
// rebuilds don't revert CDN links or re-probe every image on disk.
const blobUrls = new Map();
const prevDims = new Map();
if (fs.existsSync(manifestPath)) {
  const prev = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  for (const item of prev.items || []) {
    if (item.src && item.src.startsWith("https://")) {
      const localPath = "/images/" + (item.src.split("/images/")[1] || "");
      blobUrls.set(decodeURIComponent(localPath), item.src);
    }
    if (item.width && item.height) {
      const localPath = item.src?.startsWith("https://")
        ? "/images/" + decodeURIComponent(item.src.split("/images/")[1] || "")
        : item.src;
      if (localPath) prevDims.set(localPath, { width: item.width, height: item.height });
    }
  }
  fs.copyFileSync(manifestPath, archivePath);
  console.log("archived →", path.relative(root, archivePath));
  console.log(`preserved ${blobUrls.size} blob URLs, ${prevDims.size} dims`);
}

// Probe image dimensions from the local file, falling back to previous
// manifest values if the file isn't present (e.g. on CI without images).
const probeDims = (localSrc) => {
  const rel = localSrc.replace(/^\/images\//, "");
  const abs = path.join(imagesDir, decodeURIComponent(rel));
  if (fs.existsSync(abs)) {
    try {
      const { width, height } = imageSize(fs.readFileSync(abs));
      if (width && height) return { width, height };
    } catch {}
  }
  return prevDims.get(localSrc) || null;
};

// Build folder → project slug lookup from registry's image_folders.
const folderToSlug = {};
for (const [slug, proj] of Object.entries(registry)) {
  for (const folder of proj.image_folders || []) {
    folderToSlug[folder] = slug;
  }
}

const FALLBACK_SLUG = "snapshot";

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

const projectFromFile = (file_path) => {
  // 3-level structure: tier/client/project/file
  const parts = (file_path || "").split("/");
  // Try 3 segments (work/verizon/selection), then 2, then 1
  for (let n = 3; n >= 1; n--) {
    const key = parts.slice(0, n).join("/");
    if (folderToSlug[key]) return folderToSlug[key];
  }
  return FALLBACK_SLUG;
};

const projectYears = new Map();
const usedIds = new Set();
const mkId = (base) => {
  let id = base || "item";
  let n = 1;
  let final = id;
  while (usedIds.has(final)) final = `${id}-${++n}`;
  usedIds.add(final);
  return final;
};

// Build image items from catalogue.
const items = catalogue.map((raw) => {
  const slug = projectFromFile(raw.file_path);
  const proj = registry[slug] || registry[FALLBACK_SLUG];
  const id = mkId(slugify(raw.file_path || raw.title || "item"));
  const localSrc = "/images/" + (raw.file_path || "").replace(/^\/+/, "");
  // Check Blob URLs: try new path first, fall back to old_file_path
  let src = blobUrls.get(localSrc);
  if (!src && raw.old_file_path) {
    const oldSrc = "/images/" + raw.old_file_path.replace(/^\/+/, "");
    src = blobUrls.get(decodeURIComponent(oldSrc)) || blobUrls.get(oldSrc);
  }
  src = src || localSrc;

  // Derive year: exif > filesystem-within-range > project_date_range > filesystem.
  let year = null;
  let bestDate = null;
  const createdDate = raw.created_date || null;
  const fsDate = raw.created || null;
  const isExif = raw.date_source === "exif";
  const fsYear = fsDate ? new Date(fsDate).getUTCFullYear() : null;

  if (isExif && createdDate) {
    year = new Date(createdDate).getUTCFullYear();
    bestDate = createdDate;
  } else if (raw.project_date_range && fsYear) {
    const [rangeStart, rangeEnd] = raw.project_date_range.split("-").map(Number);
    if (fsYear >= rangeStart && fsYear <= rangeEnd) {
      year = fsYear;
      bestDate = fsDate;
    } else {
      year = rangeStart > 2000 ? rangeStart : null;
      bestDate = raw.project_date_range;
    }
  } else if (raw.project_date_range) {
    const rangeStart = parseInt(raw.project_date_range.split("-")[0], 10);
    year = rangeStart > 2000 ? rangeStart : null;
    bestDate = raw.project_date_range;
  } else if (fsDate) {
    year = fsYear;
    bestDate = fsDate;
  }
  if (year) {
    projectYears.set(slug, Math.max(projectYears.get(slug) || 0, year));
  }

  const item = {
    id,
    src,
    type: "image",
    title: raw.title || "",
    tags: Array.isArray(raw.tags) ? [...raw.tags] : [],
    medium: raw.medium || "",
    project: slug,
    description: raw.description || "",
  };
  const dims = probeDims(localSrc);
  if (dims) {
    item.width = dims.width;
    item.height = dims.height;
  }
  if (raw.style) item.style = raw.style;
  if (bestDate) item.created = bestDate;
  if (raw.project_date_range) item.date_range = raw.project_date_range;
  if (year) item.year = year;
  if (proj?.personal) {
    item.personal = true;
    if (slug === "snapshot" && !item.tags.includes("snapshot")) {
      item.tags.push("snapshot");
    }
  }
  return item;
});

// Generate video items from projects that have videos defined.
for (const [slug, proj] of Object.entries(registry)) {
  for (const vid of proj.videos || []) {
    if (!vid.url) continue;
    const id = mkId(slugify(vid.title || `${slug}-video`));
    items.push({
      id,
      type: "video",
      video: vid.url,
      title: vid.title || "",
      tags: proj.portfolio_tags || [],
      medium: "video",
      project: slug,
      ...(proj.personal ? { personal: true } : {}),
    });
  }
}

// Build manifest project records from registry.
const projects = {};
for (const [slug, proj] of Object.entries(registry)) {
  const hasItems = items.some((i) => i.project === slug);
  if (!hasItems) continue;
  projects[slug] = {
    title: proj.name,
    description: proj.description || "",
    client: proj.client,
    year: projectYears.get(slug) || null,
    credits: proj.credits || [],
  };
}

const manifest = { projects, items };
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(
  `wrote ${items.length} items across ${Object.keys(projects).length} projects →`,
  path.relative(root, manifestPath),
);
console.log("projects:", Object.keys(projects));
