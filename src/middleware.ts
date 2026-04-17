import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async ({ request, redirect }, next) => {
  if (import.meta.env.SITE_LIVE === "true") return next();

  const password = import.meta.env.SITE_PASSWORD;
  if (!password) return next();

  const url = new URL(request.url);
  const path = url.pathname;

  if (
    path.startsWith("/under-construction") ||
    path.startsWith("/api/auth") ||
    path.startsWith("/fonts/") ||
    path.startsWith("/_astro/") ||
    path === "/favicon.svg"
  ) {
    return next();
  }

  const cookies = request.headers.get("cookie") ?? "";
  const match = cookies.match(/(?:^|;\s*)site_access=([^;]+)/);
  const token = match?.[1];

  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(password));
  const expected = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (token === expected) return next();

  return redirect("/under-construction", 302);
});
