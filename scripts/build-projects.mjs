#!/usr/bin/env node
// Reads _project.md from each project folder under work/ and practice/,
// generates src/data/projects.json and src/data/schema.json.
// Structure: public/images/{work|practice}/{client}/{project}/_project.md

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

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { data: {}, body: "" };
  const data = yaml.load(match[1]) || {};
  const body = text.slice(match[0].length).trim();
  return { data, body };
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const projects = {};
const tiers = ["work", "practice"];

for (const tier of tiers) {
  const tierDir = path.join(imagesDir, tier);
  if (!fs.existsSync(tierDir)) continue;

  for (const clientEntry of fs.readdirSync(tierDir, { withFileTypes: true })) {
    if (!clientEntry.isDirectory()) continue;
    const clientDir = path.join(tierDir, clientEntry.name);

    for (const projectEntry of fs.readdirSync(clientDir, { withFileTypes: true })) {
      if (!projectEntry.isDirectory()) continue;
      const projectDir = path.join(clientDir, projectEntry.name);
      const projectFile = path.join(projectDir, "_project.md");
      const folderPath = `${tier}/${clientEntry.name}/${projectEntry.name}`;

      let data = {};
      let body = "";

      if (fs.existsSync(projectFile)) {
        ({ data, body } = parseFrontmatter(
          fs.readFileSync(projectFile, "utf8"),
        ));
      }

      // Auto-generate slug if missing
      const slug = data.slug || `${clientEntry.name}-${projectEntry.name}`;
      const personal = tier === "practice";

      if (projects[slug]) {
        // Merge: same slug across multiple folders
        projects[slug].image_folders.push(folderPath);
        for (const a of data.aliases || []) {
          if (!projects[slug].aliases.includes(a)) projects[slug].aliases.push(a);
        }
        for (const t of data.portfolio_tags || []) {
          if (!projects[slug].portfolio_tags.includes(t))
            projects[slug].portfolio_tags.push(t);
        }
        for (const v of data.videos || []) {
          projects[slug].videos.push(v);
        }
      } else {
        projects[slug] = {
          name: data.name || projectEntry.name.replace(/-/g, " "),
          slug,
          client: data.client || clientEntry.name.replace(/-/g, " "),
          aliases: data.aliases || [],
          date_range: data.date_range || "",
          roles: data.roles || [],
          category: data.category || "experience",
          image_folders: [folderPath],
          portfolio_tags: data.portfolio_tags || [],
          personal,
          description: data.description || body || "",
          credits: data.credits || [],
          videos: data.videos || [],
        };
      }
    }
  }
}

fs.writeFileSync(projectsPath, JSON.stringify(projects, null, 2) + "\n");
console.log(
  `projects.json: ${Object.keys(projects).length} projects →`,
  path.relative(root, projectsPath),
);

// Generate schema.json from projects
const allTags = new Set();
const allClients = new Set();
for (const p of Object.values(projects)) {
  for (const t of p.portfolio_tags) allTags.add(t);
  if (p.client && p.client !== "personal") allClients.add(p.client);
}

let existingSchema = { pinned: [], mediums: [] };
if (fs.existsSync(schemaPath)) {
  try {
    existingSchema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  } catch {}
}

const schema = {
  pinned: existingSchema.pinned || [],
  tags: [...allTags].sort(),
  mediums: existingSchema.mediums || [],
  clients: [...allClients].sort(),
};

fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2) + "\n");
console.log(
  `schema.json: ${schema.tags.length} tags, ${schema.clients.length} clients →`,
  path.relative(root, schemaPath),
);
