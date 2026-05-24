#!/usr/bin/env node

/**
 * Syncs manifest.json → ChromaDB collection.
 * Generates text documents from each item's metadata for embedding.
 *
 * Usage: node scripts/sync-chroma.mjs
 *
 * Requires a running ChromaDB server. Set CHROMA_URL env var (default: http://localhost:8000).
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { ChromaClient } from "chromadb";

const CHROMA_URL = process.env.CHROMA_URL || "http://localhost:8000";
const COLLECTION = "portfolio";

const manifestPath = resolve("src/data/manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

async function main() {
  const client = new ChromaClient({ path: CHROMA_URL });

  // Delete and recreate collection
  try {
    await client.deleteCollection({ name: COLLECTION });
  } catch {}

  const collection = await client.createCollection({ name: COLLECTION });

  const ids = [];
  const documents = [];
  const metadatas = [];

  for (const item of manifest.items) {
    // Build a text document from all metadata for embedding
    const parts = [item.title || ""];
    if (item.description) parts.push(item.description);
    if (item.tags) parts.push(item.tags.join(", "));
    if (item.medium) parts.push(item.medium);
    if (item.project) {
      parts.push(item.project);
      const proj = manifest.projects[item.project];
      if (proj) {
        if (proj.title) parts.push(proj.title);
        if (proj.client) parts.push(proj.client);
        if (proj.description) parts.push(proj.description);
      }
    }

    ids.push(item.id);
    documents.push(parts.join(". "));
    metadatas.push({
      type: item.type || "image",
      project: item.project || "",
      medium: item.medium || "",
      tags: (item.tags || []).join(","),
    });
  }

  await collection.add({ ids, documents, metadatas });

  console.log(`Synced ${ids.length} items to ChromaDB collection "${COLLECTION}"`);
  console.log(`ChromaDB URL: ${CHROMA_URL}`);
}

main().catch((err) => {
  console.error("Failed to sync:", err.message);
  console.error("Make sure ChromaDB is running at", CHROMA_URL);
  process.exit(1);
});
