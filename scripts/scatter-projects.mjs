#!/usr/bin/env node
// Reads src/data/projects.json and writes/updates _project.md in each
// image folder. Inverse of build-projects.mjs — edit JSON, scatter to md.

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

const registry = JSON.parse(fs.readFileSync(projectsPath, "utf8"));

let written = 0;
for (const [slug, proj] of Object.entries(registry)) {
  for (const folder of proj.image_folders || []) {
    const dir = path.join(imagesDir, folder);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const data = {
      slug,
      name: proj.name,
      client: proj.client,
      aliases: proj.aliases || [],
      date_range: proj.date_range || "",
      roles: proj.roles || [],
      category: proj.category || "experience",
      market: proj.market || null,
      project_type: proj.project_type || [],
      sector: proj.sector || null,
      characteristic: proj.characteristic || [],
      role: proj.role || null,
      scale: proj.scale || null,
      personal: proj.personal || false,
      description: proj.description || "",
      credits: proj.credits || [],
      videos: proj.videos || [],
    };

    const content =
      "---\n" + yaml.dump(data, { lineWidth: -1 }) + "---\n";
    fs.writeFileSync(path.join(dir, "_project.md"), content);
    written++;
  }
}

console.log(`scattered ${written} _project.md files from ${Object.keys(registry).length} projects`);
