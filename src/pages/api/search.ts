export const prerender = false;

import type { APIRoute } from "astro";
import { ChromaClient } from "chromadb";

const CHROMA_URL = import.meta.env.CHROMA_URL || "http://localhost:8000";
const COLLECTION = "portfolio";

export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams.get("q")?.trim();
  if (!q) {
    return new Response(JSON.stringify({ ids: [], error: "missing q" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const client = new ChromaClient({ path: CHROMA_URL });
    const collection = await client.getCollection({ name: COLLECTION });

    // Query using ChromaDB's built-in embedding
    const results = await collection.query({
      queryTexts: [q],
      nResults: 20,
    });

    return new Response(
      JSON.stringify({
        ids: results.ids?.[0] || [],
        distances: results.distances?.[0] || [],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (e: any) {
    // Fallback: return empty results if ChromaDB is unavailable
    return new Response(
      JSON.stringify({ ids: [], error: "chromadb unavailable" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
