#!/usr/bin/env node
// Reads one _project.md per client folder under work/, practice/, tools/, teaching/.
// Each file may have a `projects:` map of sub-projects; each map entry
// becomes a project in projects.json, inheriting unspecified fields from the
// client umbrella.
//
// Structure:
//   public/images/{tier}/{client}/_project.md       ← umbrella
//     market: b2b | b2c | b2b2c | internal | personal
//     project_type: [retail, exhibition, event, ...]
//     sector: tech | telecom | furniture | ...
//     characteristic: [interactive, real-time, ...]
//     projects:
//       {sub-folder}:
//         name: ...
//         snapshot_only: false
//         image_tags: [...]         (auto-written by sync-image-tags.mjs)
//         lead_images: [...]        (hand-curated)
//
// A client with no `projects:` map is treated as a single project at the
// client folder level. The four facet fields above replace the old
// `portfolio_tags:` and split the namespace into project-context vs the
// per-image tags that live in image_catalogue.json.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const yaml = require("js-yaml");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const imagesDir = path.join(root, "public/images");
const projectsPath = path.join(root, "src/data/projects.json");
const schemaPath = path.join(root, "src/data/schema.json");
const cataloguePath = path.join(root, "public/images/image_catalogue.json");

const FACETS = ["market", "project_type", "sector", "characteristic"];
const asArray = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { data: {}, body: "" };
  const data = yaml.load(match[1]) || {};
  const body = text.slice(match[0].length).trim();
  return { data, body };
}

const TIERS = ["work", "practice", "tools", "teaching"];
const projects = {};

for (const tier of TIERS) {
  const tierDir = path.join(imagesDir, tier);
  if (!fs.existsSync(tierDir)) continue;

  for (const clientEntry of fs.readdirSync(tierDir, { withFileTypes: true })) {
    if (!clientEntry.isDirectory()) continue;
    const clientDir = path.join(tierDir, clientEntry.name);
    const clientFile = path.join(clientDir, "_project.md");
    if (!fs.existsSync(clientFile)) continue;

    const { data: umbrella, body } = parseFrontmatter(fs.readFileSync(clientFile, "utf8"));
    const umbrellaSlug = umbrella.slug || clientEntry.name;
    const umbrellaFolder = `${tier}/${clientEntry.name}`;
    const personalDefault = tier === "practice";

    const inherit = (entry, field, fallback) =>
      entry[field] !== undefined ? entry[field] : umbrella[field] !== undefined ? umbrella[field] : fallback;

    // Inherit project-level facets from umbrella onto sub-projects.
    // Singular fields (market, sector, role, scale) take the sub's value if
    // set, else umbrella's. Multi-value fields (project_type, characteristic)
    // likewise. role/scale plumbed for the future art-direction cross-logic
    // and recruiter-mode filtering (per the filter architecture directive).
    const facets = (entry) => ({
      market: entry.market || umbrella.market || null,
      project_type: asArray(entry.project_type ?? umbrella.project_type),
      sector: entry.sector || umbrella.sector || null,
      characteristic: asArray(entry.characteristic ?? umbrella.characteristic),
      role: entry.role || umbrella.role || null,
      scale: entry.scale || umbrella.scale || null,
    });

    if (umbrella.projects && Object.keys(umbrella.projects).length > 0) {
      // Umbrella + sub-projects: each sub becomes its own project record.
      // Umbrella itself is not a navigable project (no image folder of its own).
      for (const [subKey, subEntry] of Object.entries(umbrella.projects)) {
        const slug = subEntry.slug
          || (subKey === umbrellaSlug || subKey.startsWith(`${umbrellaSlug}-`)
                ? subKey
                : `${umbrellaSlug}-${subKey}`);
        projects[slug] = {
          name: subEntry.name || subKey,
          slug,
          client: inherit(subEntry, "client", clientEntry.name),
          aliases: inherit(subEntry, "aliases", []),
          date_range: inherit(subEntry, "date_range", ""),
          roles: inherit(subEntry, "roles", []),
          category: inherit(subEntry, "category", "experience"),
          image_folders: [`${umbrellaFolder}/${subKey}`],
          ...facets(subEntry),
          image_tags: subEntry.image_tags || [],
          lead_images: subEntry.lead_images || [],
          order: subEntry.order || [],
          personal: subEntry.personal ?? umbrella.personal ?? personalDefault,
          snapshot_only: subEntry.snapshot_only === true,
          chronological: subEntry.chronological === true || umbrella.chronological === true,
          unlisted: subEntry.unlisted === true || umbrella.unlisted === true,
          pinned: subEntry.pinned === true || umbrella.pinned === true,
          description: subEntry.description || "",
          credits: subEntry.credits || umbrella.credits || [],
          videos: subEntry.videos || [],
          umbrella: umbrellaSlug,
        };
      }
    } else {
      // Simple project: the client folder is the project.
      projects[umbrellaSlug] = {
        name: umbrella.name || clientEntry.name,
        slug: umbrellaSlug,
        client: umbrella.client || clientEntry.name,
        aliases: umbrella.aliases || [],
        date_range: umbrella.date_range || "",
        roles: umbrella.roles || [],
        category: umbrella.category || "experience",
        image_folders: [umbrellaFolder],
        ...facets(umbrella),
        image_tags: umbrella.image_tags || [],
        lead_images: umbrella.lead_images || [],
        order: umbrella.order || [],
        personal: umbrella.personal ?? personalDefault,
        snapshot_only: umbrella.snapshot_only === true,
        chronological: umbrella.chronological === true,
        unlisted: umbrella.unlisted === true,
        pinned: umbrella.pinned === true,
        description: umbrella.description || body || "",
        credits: umbrella.credits || [],
        videos: umbrella.videos || [],
      };
    }
  }
}

// Validate before writing: date_range must be a string. An unquoted single
// year (`date_range: 2026`) parses as a YAML number, which then crashes
// downstream (`.split("-")` in build-manifest). Fail loudly here — naming the
// project and the one-line fix — instead of a cryptic stack trace later.
const badDateRanges = Object.entries(projects)
  .filter(([, p]) => p.date_range !== "" && typeof p.date_range !== "string")
  .map(([slug, p]) =>
    `  ${slug}: date_range is a ${typeof p.date_range} (${JSON.stringify(p.date_range)}) — quote it in _project.md, e.g. date_range: "${p.date_range}"`);
if (badDateRanges.length) {
  console.error(`\n✖ ${badDateRanges.length} project(s) have a non-string date_range:`);
  console.error(badDateRanges.join("\n"));
  process.exit(1);
}

fs.writeFileSync(projectsPath, JSON.stringify(projects, null, 2) + "\n");
console.log(`projects.json: ${Object.keys(projects).length} projects →`, path.relative(root, projectsPath));

// Schema: filter buttons on /archive draw from one flat list (no grouping
// yet — see plan). Union the per-image catalogue tags with all distinct
// project-facet *values* so a single click can filter by either namespace.
const allTags = new Set();
const allClients = new Set();
for (const p of Object.values(projects)) {
  if (p.snapshot_only) continue; // exclude from primary filter schema
  for (const f of FACETS) {
    for (const v of asArray(p[f])) if (v) allTags.add(v);
  }
  if (p.client && p.client !== "personal") allClients.add(p.client);
}

if (fs.existsSync(cataloguePath)) {
  try {
    const catalogue = JSON.parse(fs.readFileSync(cataloguePath, "utf8"));
    for (const entry of catalogue) {
      // Post-restructure: three orthogonal arrays + the single `medium` (folded
      // into the filterable tag union since 2026-06-17). Legacy `tags` still
      // honored so partially-migrated catalogues build cleanly.
      for (const t of entry.format || []) allTags.add(t);
      for (const t of entry.characteristics || []) allTags.add(t);
      for (const t of entry.content || []) allTags.add(t);
      for (const t of entry.tags || []) allTags.add(t);
      if (entry.medium) allTags.add(entry.medium);
    }
  } catch (err) {
    console.warn("schema: failed to read catalogue for tag union —", err.message);
  }
}

let existingSchema = { pinned: [], mediums: [] };
if (fs.existsSync(schemaPath)) {
  try {
    existingSchema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  } catch {}
}

// `tags` is the auto-derived union (catalogue ∪ facet values) used for tooling
// and any non-curated UIs. `work_filters` / `practice_filters` are
// hand-curated per the filter architecture spec — preserved across rebuilds.
const schema = {
  pinned: existingSchema.pinned || [],
  work_filters: existingSchema.work_filters || { pinned: [], expanded: [] },
  practice_filters: existingSchema.practice_filters || { pinned: [], expanded: [] },
  tags: [...allTags].sort(),
  mediums: existingSchema.mediums || [],
  clients: [...allClients].sort(),
};
fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2) + "\n");
console.log(`schema.json: ${schema.tags.length} tags, ${schema.clients.length} clients →`, path.relative(root, schemaPath));
console.log(`##SUMMARY ${JSON.stringify({ step: "build-projects", projects: Object.keys(projects).length, tags: schema.tags.length, clients: schema.clients.length })}`);
