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

// Flatten the four project-level facets into a single array of values for
// archive grid filtering. Empty/null values are dropped. See plan: tag
// namespace split.
const FACETS = ["market", "project_type", "sector", "characteristic"];
const projectTagsFor = (proj) => {
  if (!proj) return [];
  const out = [];
  for (const f of FACETS) {
    const v = proj[f];
    if (!v) continue;
    if (Array.isArray(v)) for (const x of v) { if (x) out.push(x); }
    else out.push(v);
  }
  return out;
};

// Preserve existing Blob URLs + dimensions from the current manifest so
// rebuilds don't revert CDN links or re-probe every image on disk.
// Key blob URLs by BOTH localPath (fast path) and item.id so folder renames
// don't silently wipe them — path-based lookups fail across restructures
// but the id (slugified path) is stable.
const blobUrls = new Map();
const blobById = new Map();
const prevDims = new Map();
const prevVideoDims = new Map();
if (fs.existsSync(manifestPath)) {
  const prev = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  for (const item of prev.items || []) {
    if (item.src && item.src.startsWith("https://")) {
      const localPath = "/images/" + (item.src.split("/images/")[1] || "");
      blobUrls.set(decodeURIComponent(localPath), item.src);
      if (item.id) blobById.set(item.id, item.src);
    }
    if (item.width && item.height) {
      if (item.type === "video" && item.video) {
        // Cache key on the bare URL so dim probing survives video_mode flips
        // (which rewrite the query string on every build).
        prevVideoDims.set(item.video.split("?")[0], { width: item.width, height: item.height });
      } else {
        const localPath = item.src?.startsWith("https://")
          ? "/images/" + decodeURIComponent(item.src.split("/images/")[1] || "")
          : item.src;
        if (localPath) prevDims.set(localPath, { width: item.width, height: item.height });
      }
    }
  }
  fs.copyFileSync(manifestPath, archivePath);
  console.log("archived →", path.relative(root, archivePath));
  console.log(`preserved ${blobUrls.size} blob URLs by path, ${blobById.size} by id, ${prevDims.size} image dims, ${prevVideoDims.size} video dims`);
}

// Probe Vimeo video dimensions via oEmbed. Cached via prevVideoDims so we
// only hit the network for new videos. Used to set the iframe's aspect-ratio
// so a square or vertical source doesn't get pillarboxed/letterboxed inside
// a hardcoded 16:9 wrapper. Fallback (no probe, fetch fails) is handled
// downstream — render sites use 16:9 when width/height are missing.
const probeVideoDims = async (url) => {
  const key = url.split("?")[0];
  if (prevVideoDims.has(key)) return prevVideoDims.get(key);
  if (!/vimeo\.com/.test(url)) return null;
  // player.vimeo.com/video/<id> or vimeo.com/<id>; oEmbed accepts either.
  try {
    const res = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(key)}&maxwidth=1920`);
    if (!res.ok) return null;
    const j = await res.json();
    if (j.width && j.height) {
      const dims = { width: j.width, height: j.height };
      prevVideoDims.set(key, dims);
      return dims;
    }
  } catch {}
  return null;
};

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

// `snapshot` is a real, curated project (the chronological practice/snapshot
// folder) — NOT a catch-all. Images whose folder matches no registered project
// are "unrouted": parked under this sentinel slug (which has no project record,
// so no page) and flagged staging so they stay catalogued but surface on
// neither Work nor Practice until their folder is given a real home. This is
// the deliberate move away from snapshot-as-dumping-ground.
const UNROUTED_SLUG = "__unrouted";

// Essay-companion folders: any folder containing a non-underscore .md file
// is treated as an essay's image set. Images in that folder are flagged
// `hidden_from_feed` (so they don't clutter Work/Practice) and `essay_of`
// points to the writing-collection id (path relative to public/images, no ext).
// Convention matches content.config.ts writing loader: `**/[!_]*.md`.
const essayByFolder = new Map();
const walkForEssays = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name.startsWith("_")) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkForEssays(abs);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      const folderRel = path
        .relative(imagesDir, dir)
        .split(path.sep)
        .join("/");
      const essayId = path
        .relative(imagesDir, abs)
        .split(path.sep)
        .join("/")
        .replace(/\.md$/, "");
      essayByFolder.set(folderRel, essayId);
    }
  }
};
walkForEssays(imagesDir);

// NB: do NOT truncate. The id is a slugified file_path used as the stable key
// for preserving blob URLs across builds. Deeply-nested long filenames share a
// long common prefix, so a length cap made distinct files collide on the same
// id — which then handed them each other's blob URLs (wrong image under the
// right caption). file_paths are unique, so the full slug is unique.
const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const projectFromFile = (file_path) => {
  // 3-level structure: tier/client/project/file
  const parts = (file_path || "").split("/");
  // Try 3 segments (work/verizon/selection), then 2, then 1
  for (let n = 3; n >= 1; n--) {
    const key = parts.slice(0, n).join("/");
    if (folderToSlug[key]) return folderToSlug[key];
  }
  // No registered folder matched — caller treats this as unrouted (hidden).
  return null;
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

// Curation gate: public/images is the source of truth for what *exists*, but
// the catalogue also holds uncurated stubs (auto-added by `stub-catalogue` for
// every file on disk — raw deck slides, camera-roll, screenshots — with a
// filename title and no description/tags). Only publish images a human has
// actually curated: ones carrying a description and/or any tag. Untagged stubs
// stay in the catalogue (and in /admin/images, which reads the catalogue
// directly and has a "missing tags" filter) so they can be gardened later, but
// they never surface on the site until then.
const isCurated = (raw) => {
  const hasDesc = !!(raw.description && String(raw.description).trim());
  const tagCount =
    (raw.format || []).length +
    (raw.characteristics || []).length +
    (raw.content || []).length +
    (raw.tags || []).length;
  return hasDesc || tagCount > 0;
};
// Archive-only: a deliberate per-image flag (set via the /admin/images toggle)
// that keeps the image in the catalogue + Blob + local drives for archival but
// NEVER publishes it to the site, no matter how it's tagged. Distinct from the
// curation gate (which auto-hides untagged stubs); this is a manual "keep but
// never show" decision. Filtered out first so it's a hard exclusion. The image
// stays fully visible in /admin/images so it can be found and un-archived.
const liveCatalogue = catalogue.filter((e) => e.archived !== true);
const archivedCount = catalogue.length - liveCatalogue.length;
const curatedCatalogue = liveCatalogue.filter(isCurated);
const hiddenStubCount = liveCatalogue.length - curatedCatalogue.length;
console.log(
  `curation gate: publishing ${curatedCatalogue.length} curated image(s), ` +
    `hiding ${hiddenStubCount} uncurated stub(s) + ${archivedCount} archive-only image(s)`,
);

// Build image items from catalogue (curated entries only).
const items = curatedCatalogue.map((raw) => {
  const filePath = (raw.file_path || "").replace(/\\/g, "/");
  const matchedSlug = projectFromFile(filePath);
  const unrouted = !matchedSlug;
  const slug = matchedSlug || UNROUTED_SLUG;
  const proj = registry[slug] || null;
  const id = mkId(slugify(filePath || raw.title || "item"));
  const localSrc = "/images/" + filePath.replace(/^\/+/, "");
  // Check Blob URLs: exact current path first (authoritative), then id (helps
  // a rename where the path changed), then old_file_path. Path-first is
  // essential — id is a slugified path that can still collide for unusual
  // names, and an id-first lookup could hand back another file's blob URL.
  let src = blobUrls.get(localSrc) || blobById.get(id);
  if (!src && raw.old_file_path) {
    const oldFilePath = raw.old_file_path.replace(/\\/g, "/");
    const oldSrc = "/images/" + oldFilePath.replace(/^\/+/, "");
    src = blobUrls.get(decodeURIComponent(oldSrc)) || blobUrls.get(oldSrc);
  }
  src = src || localSrc;

  // Derive year: exif > filesystem-within-range > project_date_range > filesystem.
  // project_date_range is read from the live project registry (authored in
  // _project.md) so a date_range edit flows through on the next build without
  // needing to re-stamp the catalogue.
  const projectRange = proj?.date_range || raw.project_date_range || null;
  let year = null;
  let bestDate = null;
  const createdDate = raw.created_date || null;
  const fsDate = raw.created || null;
  // Per-item dates (set by `mine-shot-dates.mjs` from EXIF or filename
  // patterns) only override the project's `date_range` when the project is
  // flagged `chronological: true` in its _project.md. Most projects are
  // coherent collections (decks, books, campaigns) where the project's date
  // is the right truth and per-item capture timestamps are noise. Opt in for
  // snapshot folders and similar timeline-like collections.
  const hasRealDate = proj?.chronological === true && !!raw.date_source;
  const fsYear = fsDate ? new Date(fsDate).getUTCFullYear() : null;

  if (hasRealDate && createdDate) {
    year = new Date(createdDate).getUTCFullYear();
    bestDate = createdDate;
  } else if (projectRange && fsYear) {
    const [rangeStart, rangeEnd] = projectRange.split("-").map(Number);
    if (fsYear >= rangeStart && fsYear <= rangeEnd) {
      year = fsYear;
      bestDate = fsDate;
    } else {
      year = rangeStart > 2000 ? rangeStart : null;
      bestDate = projectRange;
    }
  } else if (projectRange) {
    const rangeStart = parseInt(projectRange.split("-")[0], 10);
    year = rangeStart > 2000 ? rangeStart : null;
    bestDate = projectRange;
  } else if (fsDate) {
    year = fsYear;
    bestDate = fsDate;
  }
  if (year) {
    projectYears.set(slug, Math.max(projectYears.get(slug) || 0, year));
  }

  // Per-image tags are now stratified into format/characteristics/content in
  // the catalogue (see _DEPRECATED/scripts/restructure-catalogue-tags.mjs). Manifest items
  // expose both: the raw three-axis arrays (for future facet-aware consumers)
  // and a flat `tags` union (for the existing data-tags filter UI).
  const fmt = Array.isArray(raw.format) ? raw.format : [];
  const chr = Array.isArray(raw.characteristics) ? raw.characteristics : [];
  const con = Array.isArray(raw.content) ? raw.content : [];
  // Back-compat: very old catalogues may still carry a flat `tags` field if
  // the restructure script hasn't been run on them. Honor it.
  const legacyTags = Array.isArray(raw.tags) ? raw.tags : [];
  // `medium` is folded into the flat `tags` union so it's filterable like the
  // other axes (the data-tags filter UI matches against `tags`). It's still
  // exposed as its own field below for facet-aware consumers.
  const med = raw.medium ? [raw.medium] : [];
  const item = {
    id,
    src,
    type: "image",
    title: raw.title || "",
    tags: [...new Set([...fmt, ...chr, ...con, ...med, ...legacyTags])],
    format: fmt,
    characteristics: chr,
    content: con,
    project_tags: projectTagsFor(proj),
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
  if (projectRange) item.date_range = projectRange;
  if (year) item.year = year;
  // Tier-based routing:
  //   work/     → Work page (item.personal unset)
  //   practice/ → Practice page (item.personal = true)
  //   else      → staging: shown on neither page (personal + staging = true)
  // A project's explicit `personal` flag still overrides the tier default,
  // so a practice/ project can opt into Work with `personal: false`.
  const tier = filePath.split("/")[0];
  const isStaging = tier !== "work" && tier !== "practice";
  const personal = proj?.personal ?? tier !== "work";
  if (personal) {
    item.personal = true;
    if (slug === "snapshot" && !item.tags.includes("snapshot")) {
      item.tags.push("snapshot");
    }
  }
  if (isStaging) item.staging = true;
  // Unrouted: folder matches no registered project. Keep it catalogued but
  // hidden everywhere (staging) — never dumped into a navigable page — until
  // its folder is registered. Reported in the build summary below.
  if (unrouted) item.staging = true;
  // Essay companion: mark + hide from feed if this image lives in a folder
  // that also holds an essay .md.
  const folderRel = filePath.split("/").slice(0, -1).join("/");
  const essayId = essayByFolder.get(folderRel);
  if (essayId) {
    item.essay_of = essayId;
    item.hidden_from_feed = true;
  }
  // Project-level unlisted: hide all items from the Work/Practice index but
  // keep /projects/[slug] reachable (e.g. for share links).
  if (proj?.unlisted) item.hidden_from_feed = true;
  // Featured: surfaces this item on the homepage hero feed. Authored as
  // `lead_images: [filename, ...]` on the project's _project.md (already
  // plumbed through projects.json by build-projects.mjs).
  const leads = proj?.lead_images || [];
  if (leads.some((f) => filePath.endsWith("/" + f) || filePath.endsWith(f))) {
    item.featured = true;
  }
  return item;
});

// Generate video items from projects that have videos defined.
// Year priority: vid.year > vid.date's 4-digit year > project-derived year > date_range start.
const videoBuilders = [];
for (const [slug, proj] of Object.entries(registry)) {
  for (const vid of proj.videos || []) {
    if (!vid.url) continue;
    if (vid.archived === true) continue; // archive-only (see image gate above)
    const id = mkId(slugify(vid.title || `${slug}-video`));

    let vidYear = vid.year ? parseInt(String(vid.year), 10) : null;
    if (!vidYear && vid.date) {
      const m = String(vid.date).match(/\d{4}/);
      if (m) vidYear = parseInt(m[0], 10);
    }
    if (!vidYear) vidYear = projectYears.get(slug) || null;
    if (!vidYear && proj.date_range) {
      const m = String(proj.date_range).match(/\d{4}/);
      if (m) vidYear = parseInt(m[0], 10);
    }
    if (vidYear) {
      projectYears.set(slug, Math.max(projectYears.get(slug) || 0, vidYear));
    }

    videoBuilders.push((async () => {
      // video_mode: "background" (default) → no controls, autoplay-muted-loop.
      // video_mode: "ui" → controls visible, autoplay muted, looped.
      // URL params are rebuilt from the flag, not authored, so flipping the
      // flag in _project.md is the single source of truth on rebuild.
      // background=1 alone sometimes fails to autoplay when there are several
      // iframes on a page (browser throttling); pair it with explicit
      // autoplay/muted/loop/playsinline for reliability across browsers.
      const baseUrl = vid.url.split("?")[0];
      const params = vid.video_mode === "ui"
        ? "autoplay=1&muted=1&loop=1&playsinline=1"
        : "background=1&autoplay=1&muted=1&loop=1&playsinline=1";
      const item = {
        id,
        type: "video",
        video: `${baseUrl}?${params}`,
        video_mode: vid.video_mode || "background",
        title: vid.title || "",
        // Mirror image items: fold the video entry's medium + format +
        // characteristics + content into the flat `tags` union so the data-tags
        // filter UI can match them (e.g. `keynote` on an AWS video → the keynote
        // chip; `moving-image` medium → the moving-image chip). The literal
        // `video` stays so the file-type stays distinct from the medium.
        tags: [...new Set([
          "video",
          vid.medium || "moving-image",
          ...(Array.isArray(vid.format) ? vid.format : []),
          ...(Array.isArray(vid.characteristics) ? vid.characteristics : []),
          ...(Array.isArray(vid.content) ? vid.content : []),
        ])],
        project_tags: projectTagsFor(proj),
        // Per-video `medium:` override. Default is `moving-image` (a video is
        // time-based moving image); a video documenting spatial/event work etc.
        // can still declare another medium explicitly.
        medium: vid.medium || "moving-image",
        project: slug,
      };
      const dims = await probeVideoDims(baseUrl);
      if (dims) {
        item.width = dims.width;
        item.height = dims.height;
      }
      if (vid.date) item.created = vid.date;
      if (vidYear) item.year = vidYear;
      if (proj.personal) item.personal = true;
      if (proj.unlisted) item.hidden_from_feed = true;
      if (vid.featured) item.featured = true;
      return item;
    })());
  }
}
const cachedBefore = prevVideoDims.size;
const videoItems = await Promise.all(videoBuilders);
for (const v of videoItems) items.push(v);
if (videoBuilders.length) {
  const probed = prevVideoDims.size - cachedBefore;
  const withDims = videoItems.filter(v => v.width && v.height).length;
  console.log(`videos: ${videoItems.length} total, ${withDims} with dims (${probed} freshly probed)`);
}

// Report unrouted images grouped by folder so a misfiled or unregistered
// folder is loud, not silently swallowed. These are curated but hidden until
// their folder is registered in a project's image_folders.
const unroutedByFolder = new Map();
for (const i of items) {
  if (i.project !== UNROUTED_SLUG) continue;
  const rel = decodeURIComponent((i.src || "").split("/images/")[1] || i.id || "");
  const folder = rel.split("/").slice(0, -1).join("/") || "(root)";
  unroutedByFolder.set(folder, (unroutedByFolder.get(folder) || 0) + 1);
}
if (unroutedByFolder.size) {
  const total = [...unroutedByFolder.values()].reduce((a, b) => a + b, 0);
  console.log(`\nunrouted (hidden — folder matches no registered project): ${total} image(s) across ${unroutedByFolder.size} folder(s):`);
  for (const [folder, n] of [...unroutedByFolder].sort()) console.log(`  ${folder}  (${n})`);
  console.log(`  → register each folder in a project's image_folders (via _project.md) to surface them.`);
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
    order: proj.order || [],
    snapshot_only: proj.snapshot_only === true,
  };
}

const manifest = { projects, items };
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(
  `wrote ${items.length} items across ${Object.keys(projects).length} projects →`,
  path.relative(root, manifestPath),
);
console.log("projects:", Object.keys(projects));
console.log(`##SUMMARY ${JSON.stringify({ step: "build-manifest", items: items.length, projects: Object.keys(projects).length })}`);
