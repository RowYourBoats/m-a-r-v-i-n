export const prerender = false;

import type { APIRoute } from "astro";
import manifest from "@/data/manifest.json";

export const GET: APIRoute = async ({ url }) => {
  const tag = url.searchParams.get("tag");
  const client = url.searchParams.get("client");
  const medium = url.searchParams.get("medium");
  const project = url.searchParams.get("project");
  const year = url.searchParams.get("year");

  let results = manifest.items;

  if (tag) {
    results = results.filter((i) => i.tags?.includes(tag));
  }
  if (project) {
    results = results.filter((i) => i.project === project);
  }
  if (medium) {
    results = results.filter((i) => i.medium === medium);
  }
  if (year) {
    results = results.filter((i) => {
      const itemYear = i.project && manifest.projects[i.project]
        ? manifest.projects[i.project].year
        : null;
      return String(itemYear) === year;
    });
  }
  if (client) {
    results = results.filter((i) => {
      const itemClient = i.project && manifest.projects[i.project]
        ? manifest.projects[i.project].client
        : null;
      return itemClient?.toLowerCase() === client.toLowerCase();
    });
  }

  return new Response(JSON.stringify({ items: results }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
