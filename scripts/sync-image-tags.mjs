#!/usr/bin/env node
// Aggregate per-image tags from image_catalogue.json into each client
// _project.md file. For client umbrellas with a `projects:` map, writes tags
// into the matching sub-project entry's `image_tags:`. For simple client
// projects (no projects map), writes at the root frontmatter level.
// Non-destructive: preserves everything else.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const yaml = require("js-yaml");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const catalogPath = path.join(root, "public/images/image_catalogue.json");
const imagesDir = path.join(root, "public/images");

const catalogue = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

// Group catalogue tags by {clientPath, subKey}. Sub-key is null for simple
// practice projects (one folder deep under tier). Post-restructure, per-image
// tags live in three arrays (format/characteristics/subject); union them for
// the human-readable cache. Legacy `tags` still honored.
const collectTags = (entry) => [
  ...(entry.format || []),
  ...(entry.characteristics || []),
  ...(entry.subject || []),
  ...(entry.tags || []),
];

const byClient = new Map();
for (const entry of catalogue) {
  if (!entry.file_path) continue;
  const tags = collectTags(entry);
  if (tags.length === 0) continue;
  const parts = entry.file_path.replace(/\\/g, "/").split("/");
  if (parts.length < 2) continue;
  const tier = parts[0];
  if (!["work", "practice", "tools", "teaching"].includes(tier)) continue;
  const client = parts[1];
  const clientDir = path.join(imagesDir, tier, client);
  const clientFile = path.join(clientDir, "_project.md");
  if (!fs.existsSync(clientFile)) continue;

  // If deeper than 2 levels, the next segment is the sub-project key.
  // (A file directly in the client folder has no sub-key.)
  const subKey = parts.length > 3 ? parts[2] : null;

  const groupKey = `${clientFile}::${subKey || ""}`;
  if (!byClient.has(groupKey)) byClient.set(groupKey, { clientFile, subKey, tags: new Set() });
  for (const t of tags) byClient.get(groupKey).tags.add(t);
}

// Group by clientFile to do one write per file.
const byFile = new Map();
for (const { clientFile, subKey, tags } of byClient.values()) {
  if (!byFile.has(clientFile)) byFile.set(clientFile, []);
  byFile.get(clientFile).push({ subKey, tags: [...tags].sort() });
}

let updated = 0;
for (const [clientFile, groups] of byFile) {
  const raw = fs.readFileSync(clientFile, "utf8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) continue;
  const data = yaml.load(match[1]) || {};
  const body = match[2];

  for (const { subKey, tags } of groups) {
    if (subKey && data.projects && data.projects[subKey]) {
      data.projects[subKey].image_tags = tags;
    } else if (!subKey) {
      data.image_tags = tags;
    } else if (subKey && !data.projects?.[subKey]) {
      console.log(`  warn: no projects.${subKey} in`, path.relative(root, clientFile));
    }
  }

  const next = `---\n${yaml.dump(data, { lineWidth: 120, noRefs: true, quotingType: '"' })}---\n${body}`;
  if (next !== raw) {
    fs.writeFileSync(clientFile, next);
    updated++;
  }
}

console.log(`updated ${updated} client _project.md files`);
console.log(`##SUMMARY ${JSON.stringify({ step: "sync-image-tags", updated })}`);
