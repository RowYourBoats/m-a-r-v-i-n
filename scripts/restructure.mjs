#!/usr/bin/env node
// One-time migration: reorganizes public/images/ from flat folders into
// work/client/project and practice/client/project structure.
// Updates image_catalogue.json with new file_path values and stores
// old_file_path for Blob URL continuity.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const imagesDir = path.join(root, "public/images");
const catalogPath = path.join(imagesDir, "image_catalogue.json");
const writingDir = path.join(root, "src/content/writing");

// --- Migration mapping ---
// old folder → { tier, client, project }
// For Verizon Decks-JPG, subfolders become individual projects.
const FOLDER_MAP = {
  "HermanMiller": { tier: "work", client: "herman-miller", project: "brand-system" },
  "IonQ": { tier: "work", client: "ionq", project: "brand" },
  "Verizon_Selection": { tier: "work", client: "verizon", project: "selection" },
  "DS+R": { tier: "work", client: "dsr", project: "competition-materials" },
  "DFFPM": { tier: "work", client: "dffpm", project: "identity" },
  "Gahi": { tier: "work", client: "gahi", project: "identity" },
  "MoMA": { tier: "work", client: "moma", project: "teens-program" },
  "Pratt": { tier: "work", client: "pratt", project: "design-system" },
  "NYU": { tier: "work", client: "nyu", project: "typography-course" },
  "Parsons": { tier: "work", client: "parsons", project: "interaction-studio" },
  "MillerAtre": { tier: "work", client: "miller-atre", project: "identity" },
  "Paprika": { tier: "work", client: "paprika", project: "identity" },
  "Yale": { tier: "practice", client: "yale", project: "thesis" },
  "IndependentProjects": { tier: "practice", client: "controlled-instability", project: "explorations" },
  "Studio": { tier: "practice", client: "snapshots", project: "studio" },
};

// Verizon Decks-JPG subfolders → individual projects under work/verizon/
const VERIZON_DECK_SUBS = {
  "Digital_3.0": "digital-3",
  "Future_of_Retail": "future-of-retail",
  "Retail_3.0_SEM_2022_03_15": "retail-3-sem",
  "Retail_Walkthrough_2022_03_22": "retail-walkthrough",
};

// Essay migration: src/content/writing/ → project folders
const ESSAY_MAP = {
  "on-real-time-form.md": "practice/controlled-instability/explorations",
  "perdido-street-station.md": "practice/yale/thesis",
};

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
const isImage = (f) => IMAGE_EXTS.has(path.extname(f).toLowerCase());
const isMd = (f) => path.extname(f).toLowerCase() === ".md";

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function moveFile(src, dst) {
  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
  fs.unlinkSync(src);
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// --- Phase 1: Create target directories ---
console.log("Creating target directories...");
ensureDir(path.join(imagesDir, "work"));
ensureDir(path.join(imagesDir, "practice"));

// --- Phase 2: Move files ---
let moved = 0;
const pathMap = new Map(); // old relative path → new relative path

// Regular folders
for (const [oldFolder, dest] of Object.entries(FOLDER_MAP)) {
  const srcDir = path.join(imagesDir, oldFolder);
  if (!fs.existsSync(srcDir)) {
    console.log(`  skip ${oldFolder} (not found)`);
    continue;
  }

  const dstDir = path.join(imagesDir, dest.tier, dest.client, dest.project);
  ensureDir(dstDir);

  for (const file of fs.readdirSync(srcDir)) {
    const srcFile = path.join(srcDir, file);
    if (!fs.statSync(srcFile).isFile()) continue;
    if (!isImage(file) && !isMd(file)) continue;

    const dstFile = path.join(dstDir, file);
    moveFile(srcFile, dstFile);
    pathMap.set(
      `${oldFolder}/${file}`,
      `${dest.tier}/${dest.client}/${dest.project}/${file}`,
    );
    moved++;
  }
  console.log(`  ${oldFolder} → ${dest.tier}/${dest.client}/${dest.project}/`);
}

// Verizon Decks-JPG subfolders → individual projects
const vDecksDir = path.join(imagesDir, "Verizon Decks-JPG");
if (fs.existsSync(vDecksDir)) {
  for (const [subFolder, projectSlug] of Object.entries(VERIZON_DECK_SUBS)) {
    const srcDir = path.join(vDecksDir, subFolder);
    if (!fs.existsSync(srcDir)) continue;

    const dstDir = path.join(imagesDir, "work/verizon", projectSlug);
    ensureDir(dstDir);

    for (const file of fs.readdirSync(srcDir)) {
      const srcFile = path.join(srcDir, file);
      if (!fs.statSync(srcFile).isFile()) continue;
      if (!isImage(file)) continue;

      const dstFile = path.join(dstDir, file);
      moveFile(srcFile, dstFile);
      pathMap.set(
        `Verizon Decks-JPG/${subFolder}/${file}`,
        `work/verizon/${projectSlug}/${file}`,
      );
      moved++;
    }
    console.log(`  Verizon Decks-JPG/${subFolder} → work/verizon/${projectSlug}/`);
  }
}

console.log(`Moved ${moved} files`);

// --- Phase 3: Move essays ---
if (fs.existsSync(writingDir)) {
  for (const [essayFile, destPath] of Object.entries(ESSAY_MAP)) {
    const src = path.join(writingDir, essayFile);
    if (!fs.existsSync(src)) continue;
    const dst = path.join(imagesDir, destPath, essayFile);
    ensureDir(path.dirname(dst));
    moveFile(src, dst);
    console.log(`  essay: ${essayFile} → ${destPath}/`);
  }
  // Move any remaining essays to practice/controlled-instability/explorations
  for (const f of fs.readdirSync(writingDir)) {
    if (!isMd(f) || f.startsWith(".")) continue;
    const src = path.join(writingDir, f);
    const dst = path.join(imagesDir, "practice/controlled-instability/explorations", f);
    moveFile(src, dst);
    console.log(`  essay (unmatched): ${f} → practice/controlled-instability/explorations/`);
  }
}

// --- Phase 4: Update image_catalogue.json ---
if (fs.existsSync(catalogPath)) {
  const catalogue = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  let updated = 0;

  for (const entry of catalogue) {
    if (!entry.file_path) continue;
    const newPath = pathMap.get(entry.file_path);
    if (newPath) {
      entry.old_file_path = entry.file_path;
      entry.file_path = newPath;
      updated++;
    }
  }

  fs.writeFileSync(catalogPath, JSON.stringify(catalogue, null, 2) + "\n");
  console.log(`Updated ${updated} catalogue entries (of ${catalogue.length})`);
}

// --- Phase 5: Generate _project.md stubs for new project folders ---
const tiers = ["work", "practice"];
for (const tier of tiers) {
  const tierDir = path.join(imagesDir, tier);
  if (!fs.existsSync(tierDir)) continue;

  for (const client of fs.readdirSync(tierDir)) {
    const clientDir = path.join(tierDir, client);
    if (!fs.statSync(clientDir).isDirectory()) continue;

    for (const project of fs.readdirSync(clientDir)) {
      const projectDir = path.join(clientDir, project);
      if (!fs.statSync(projectDir).isDirectory()) continue;

      const projectMd = path.join(projectDir, "_project.md");
      if (fs.existsSync(projectMd)) continue;

      const slug = `${client}-${project}`;
      const content = `---
slug: ${slug}
name: ${project.replace(/-/g, " ")}
client: ${client.replace(/-/g, " ")}
aliases: []
date_range: ""
roles: []
category: experience
portfolio_tags: []
description: ""
credits:
  - role: Design
    name: Marvin de Jong
videos: []
---
`;
      fs.writeFileSync(projectMd, content);
      console.log(`  stub _project.md: ${tier}/${client}/${project}/`);
    }
  }
}

console.log("Done. Run 'npm run build-data' to rebuild projects.json and manifest.");
