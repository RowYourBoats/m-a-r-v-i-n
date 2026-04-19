#!/usr/bin/env node
// Reads _project.md from each folder in public/images/,
// generates src/data/projects.json and src/data/schema.json.

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

const projects = {};
const folders = fs.readdirSync(imagesDir, { withFileTypes: true });

for (const entry of folders) {
  if (!entry.isDirectory()) continue;
  const projectFile = path.join(imagesDir, entry.name, "_project.md");
  if (!fs.existsSync(projectFile)) continue;

  const { data, body } = parseFrontmatter(
    fs.readFileSync(projectFile, "utf8"),
  );
  const slug = data.slug;
  if (!slug) {
    console.warn(`skipping ${entry.name}/_project.md — no slug`);
    continue;
  }

  if (projects[slug]) {
    // Merge: same project, multiple folders
    projects[slug].image_folders.push(entry.name);
    // Merge aliases
    for (const a of data.aliases || []) {
      if (!projects[slug].aliases.includes(a)) projects[slug].aliases.push(a);
    }
    // Merge portfolio_tags
    for (const t of data.portfolio_tags || []) {
      if (!projects[slug].portfolio_tags.includes(t))
        projects[slug].portfolio_tags.push(t);
    }
    // Merge videos
    for (const v of data.videos || []) {
      projects[slug].videos.push(v);
    }
  } else {
    projects[slug] = {
      name: data.name || slug,
      slug,
      client: data.client || data.name || slug,
      aliases: data.aliases || [],
      date_range: data.date_range || "",
      roles: data.roles || [],
      category: data.category || "experience",
      image_folders: [entry.name],
      portfolio_tags: data.portfolio_tags || [],
      personal: data.personal || false,
      description: data.description || body || "",
      credits: data.credits || [],
      videos: data.videos || [],
    };
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

const existingSchema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
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
