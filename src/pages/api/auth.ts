export const prerender = false;

import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const password = form.get("password")?.toString() ?? "";
  const nextRaw = form.get("next")?.toString() ?? "";
  const expected = import.meta.env.SITE_PASSWORD;

  // Only honor same-origin paths to avoid open-redirect via crafted `next`.
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";

  if (!expected || password !== expected) {
    const back = `/under-construction?error=1${next !== "/" ? `&next=${encodeURIComponent(next)}` : ""}`;
    return redirect(back, 302);
  }

  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(password));
  const token = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const secure = import.meta.env.PROD ? "; Secure" : "";
  const headers = new Headers();
  headers.set("Location", next);
  headers.set(
    "Set-Cookie",
    `site_access=${token}; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=${7 * 24 * 60 * 60}`,
  );

  return new Response(null, { status: 302, headers });
};
