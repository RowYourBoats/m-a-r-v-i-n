---
title: Auth & gating
section: Ops
order: 1
summary: What the password gate actually does today (and what it doesn't).
---

The gate is implemented in `src/middleware.ts` with a login endpoint at `src/pages/api/auth.ts` and a gate page at `src/pages/under-construction.astro`.

## Actual behavior

The middleware gates only individual unlisted project pages — not the whole site:

1. If `SITE_PASSWORD` is unset, nothing is gated (handy for local dev).
2. It only acts on paths matching `/projects/<slug>`. Everything else passes through.
3. For such a path it looks up the project in `projects.json`; if it isn't `unlisted: true`, it passes through.
4. For an unlisted project it checks the `site_access` cookie; on mismatch it redirects to `/under-construction?next=<path>`.

So `unlisted: true` on a `_project.md` is what puts a project behind the gate — the project stays off `/work` and `/practice` indexes and its `/projects/<slug>` page requires the password.

## The cookie

- Name: `site_access`. Value: the hex SHA-256 hash of `SITE_PASSWORD` (not the password itself). Middleware and `/api/auth` compute the same hash.
- `POST /api/auth` with form fields `password` + `next`: on match it sets the cookie (`HttpOnly`, `Secure` in prod, `SameSite=Lax`, `Path=/`, 7-day `Max-Age`) and 302s to `next`; on failure → `/under-construction?error=1`. `next` is validated (must start with `/` but not `//`) to prevent open redirects.

## Corrections to older docs

The previous `USAGE.md` described this section as "under construction" and claimed:

- a whole-site password gate — not implemented; only unlisted project pages are gated.
- a `SITE_LIVE=true` kill switch — not implemented; there is no `SITE_LIVE` reference in the code. The only switch is whether `SITE_PASSWORD` is set at all.

Document the behavior above as the current truth. If a full-site gate or kill switch is wanted, it's a feature to build, not a flag that exists.
