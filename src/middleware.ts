import { defineMiddleware } from "astro:middleware";
import projects from "@/data/projects.json";

// Gate only /projects/<slug> for projects flagged `unlisted: true` in their
// _project.md. Site is otherwise fully public. If no SITE_PASSWORD is set,
// nothing is gated (useful for local dev without env vars).
export const onRequest = defineMiddleware(async ({ request, redirect }, next) => {
  const password = import.meta.env.SITE_PASSWORD;
  if (!password) return next();

  const url = new URL(request.url);
  const path = url.pathname;

  const projectMatch = path.match(/^\/projects\/([^/]+)\/?$/);
  if (!projectMatch) return next();

  const slug = decodeURIComponent(projectMatch[1]);
  const project = (projects as Record<string, { unlisted?: boolean }>)[slug];
  if (!project?.unlisted) return next();

  const cookies = request.headers.get("cookie") ?? "";
  const match = cookies.match(/(?:^|;\s*)site_access=([^;]+)/);
  const token = match?.[1];

  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(password));
  const expected = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (token === expected) return next();

  return redirect(`/under-construction?next=${encodeURIComponent(path)}`, 302);
});
