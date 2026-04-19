#!/usr/bin/env node
// One-time migration: reads projects.json aliases, matches each bullet's
// `company` field, and adds `project_key` to frontmatter if not already present.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const projectsPath = path.join(root, "src/data/projects.json");
const bulletsDir = path.join(root, "src/content/bullets");

const registry = JSON.parse(fs.readFileSync(projectsPath, "utf8"));

// Build alias → slug lookup (case-insensitive).
const aliasToSlug = new Map();
for (const [slug, proj] of Object.entries(registry)) {
  for (const alias of proj.aliases || []) {
    aliasToSlug.set(alias.toLowerCase(), slug);
  }
  aliasToSlug.set(proj.name.toLowerCase(), slug);
  aliasToSlug.set(proj.client.toLowerCase(), slug);
}

let stamped = 0;
let skipped = 0;
let noMatch = 0;

for (const file of fs.readdirSync(bulletsDir)) {
  if (!file.endsWith(".md") || file.startsWith("_")) continue;

  const filePath = path.join(bulletsDir, file);
  const text = fs.readFileSync(filePath, "utf8");

  // Already has project_key
  if (/^project_key:/m.test(text)) {
    skipped++;
    continue;
  }

  // Extract company from frontmatter
  const companyMatch = text.match(/^company:\s*['"]?(.+?)['"]?\s*$/m);
  if (!companyMatch) {
    noMatch++;
    continue;
  }

  const company = companyMatch[1].trim();
  const slug = aliasToSlug.get(company.toLowerCase());

  if (!slug) {
    console.warn("no match:", company, "→", file);
    noMatch++;
    continue;
  }

  // Insert project_key after company line
  const updated = text.replace(
    companyMatch[0],
    companyMatch[0] + "\nproject_key: " + slug,
  );
  fs.writeFileSync(filePath, updated);
  stamped++;
}

console.log(`stamped: ${stamped}, skipped: ${skipped}, no match: ${noMatch}`);
