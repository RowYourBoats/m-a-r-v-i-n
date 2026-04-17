#!/usr/bin/env node
// Rebuild src/data/manifest.json from public/images/image_catalogue.json.
// Groups items by their top-level folder (source of truth), not by the
// catalogue's messy `client` field. Archives the previous manifest.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const catalogPath = path.join(root, "public/images/image_catalogue.json");
const manifestPath = path.join(root, "src/data/manifest.json");
const archivePath = path.join(root, "src/data/manifest.archive.json");

// Folder (first path segment) → { key, title, client, personal }
const FOLDER_MAP = {
  "DFFPM": { key: "dffpm", title: "DFFPM", client: "DFFPM" },
  "DS+R": { key: "dsr", title: "DS+R", client: "DS+R" },
  "Gahi": { key: "gahi", title: "Gahi", client: "Gahi" },
  "HermanMiller": { key: "herman-miller", title: "Herman Miller", client: "Herman Miller" },
  "IonQ": { key: "ionq", title: "IonQ", client: "IonQ" },
  "Verizon Decks-JPG": { key: "verizon", title: "Verizon", client: "Verizon" },
  "Verizon_Selection": { key: "verizon", title: "Verizon", client: "Verizon" },
  "Yale": { key: "yale", title: "Yale", client: "Yale", personal: true },
  "IndependentProjects": { key: "snapshot", title: "Snapshots", client: "personal", personal: true },
};
const FALLBACK = { key: "snapshot", title: "Snapshots", client: "personal", personal: true };

const catalogue = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

if (fs.existsSync(manifestPath)) {
  fs.copyFileSync(manifestPath, archivePath);
  console.log("archived →", path.relative(root, archivePath));
}

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

const projectFromFile = (file_path) => {
  const top = (file_path || "").split("/")[0];
  return FOLDER_MAP[top] || FALLBACK;
};

// Build projects: only include keys actually used by items.
const projectYears = new Map(); // key -> max year seen
const projects = {};

const usedIds = new Set();
const mkId = (base) => {
  let id = base || "item";
  let n = 1;
  let final = id;
  while (usedIds.has(final)) final = `${id}-${++n}`;
  usedIds.add(final);
  return final;
};

const items = catalogue.map((raw) => {
  const proj = projectFromFile(raw.file_path);
  const id = mkId(slugify(raw.file_path || raw.title || "item"));
  const src = "/images/" + (raw.file_path || "").replace(/^\/+/, "");

  // Derive year and best date.
  // Priority: exif > filesystem-within-range > project_date_range > filesystem fallback.
  let year = null;
  let bestDate = null;
  const createdDate = raw.created_date || null;
  const fsDate = raw.created || null;
  const isExif = raw.date_source === "exif";
  const fsYear = fsDate ? new Date(fsDate).getUTCFullYear() : null;

  if (isExif && createdDate) {
    // EXIF dates survive cloud sync — always trustworthy.
    year = new Date(createdDate).getUTCFullYear();
    bestDate = createdDate;
  } else if (raw.project_date_range && fsYear) {
    const [rangeStart, rangeEnd] = raw.project_date_range.split("-").map(Number);
    if (fsYear >= rangeStart && fsYear <= rangeEnd) {
      // Filesystem date falls within project range — it's real, keep full precision.
      year = fsYear;
      bestDate = fsDate;
    } else {
      // Filesystem date was scrubbed by cloud sync — fall back to range start.
      year = rangeStart > 2000 ? rangeStart : null;
      bestDate = raw.project_date_range;
    }
  } else if (raw.project_date_range) {
    const rangeStart = parseInt(raw.project_date_range.split("-")[0], 10);
    year = rangeStart > 2000 ? rangeStart : null;
    bestDate = raw.project_date_range;
  } else if (fsDate) {
    // No range (e.g. IndependentProjects) — trust filesystem as-is.
    year = fsYear;
    bestDate = fsDate;
  }
  if (year) {
    projectYears.set(proj.key, Math.max(projectYears.get(proj.key) || 0, year));
  }
  if (year) {
    projectYears.set(proj.key, Math.max(projectYears.get(proj.key) || 0, year));
  }

  const item = {
    id,
    src,
    type: "image",
    title: raw.title || "",
    tags: Array.isArray(raw.tags) ? [...raw.tags] : [],
    medium: raw.medium || "",
    project: proj.key,
    description: raw.description || "",
  };
  if (raw.style) item.style = raw.style;
  if (bestDate) item.created = bestDate;
  if (raw.project_date_range) item.date_range = raw.project_date_range;
  if (year) item.year = year;
  if (proj.personal) {
    item.personal = true;
    if (proj.key === "snapshot" && !item.tags.includes("snapshot")) {
      item.tags.push("snapshot");
    }
  }
  return item;
});

// Instantiate project records for keys that items actually use
for (const item of items) {
  const key = item.project;
  if (projects[key]) continue;
  const meta = Object.values(FOLDER_MAP).find((m) => m.key === key) || FALLBACK;
  projects[key] = {
    title: meta.title,
    description: "",
    client: meta.client,
    year: projectYears.get(key) || null,
    credits: [{ role: "Design", name: "Marvin de Jong" }],
  };
}

const manifest = { projects, items };
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(
  `wrote ${items.length} items across ${Object.keys(projects).length} projects →`,
  path.relative(root, manifestPath),
);
console.log("projects:", Object.keys(projects));
