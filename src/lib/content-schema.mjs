// Shared field definitions for the unified document model.
//
// Essays (the `writing` collection) and project docs (the `projects` collection)
// are the same underlying thing — a titled document with optional companion media
// — that render in different layouts. This module is the SINGLE source of truth
// for the shape they share, so the two stop drifting.
//
// Written as factories that take a zod instance `z` (rather than importing zod)
// so the SAME field shapes can be built with `astro:content`'s `z` (in
// src/content.config.ts) and with the standalone `zod` package (in the Node build
// scripts, e.g. scripts/build-projects.mjs) without cross-instance issues. It is
// a plain .mjs so both Vite and `node` can import it.
//
// Design rule (see plan + the "essays were too lean" finding): lean by default —
// everything here is optional except `title`. A piece carries more only when it
// needs to (credits for a collaborator, `client` for a publication, videos).

/** A single `videos:` entry — Vimeo background/UI video. Shared by both types. */
export function videoFrontmatter(z) {
  return z.object({
    title: z.string().optional(),
    // Skipped at build time when absent (build-manifest), so optional here.
    url: z.string().optional(),
    featured: z.boolean().optional(),
    // "background" (default) = no chrome, autoplay-muted-loop.
    // "ui" = player controls, autoplay muted looped. The URL query is rebuilt
    // from this flag at build time, so the flag is the single source of truth.
    video_mode: z.enum(["background", "ui"]).optional(),
    archived: z.boolean().optional(),
    year: z.number().optional(),
    date: z.string().optional(),
    medium: z.string().optional(),
    format: z.array(z.string()).optional(),
    characteristics: z.array(z.string()).optional(),
    content: z.array(z.string()).optional(),
  });
}

/**
 * The optional superset shared by essays and project docs. Spread into each
 * collection's schema. `title` is the only required field; collections that need
 * more (e.g. essays require `date`) override on top of the spread.
 */
export function sharedDocFields(z) {
  return {
    title: z.string(),
    date: z.string().optional(),
    tags: z.array(z.string()).optional(),
    excerpt: z.string().optional(),
    cover: z.string().optional(),
    order: z.array(z.string()).optional(),
    pinned: z.boolean().optional(),
    // Render variant. "standard"/"gallery" are essay layouts; "doc" is a
    // markdown-bodied project page. The route picks the renderer; the data is
    // uniform underneath.
    layout: z.enum(["standard", "gallery", "doc"]).optional(),
    // Collaborators / contributors — same {role, name} shape projects already
    // carry. Now available to essays too. role/name are nullable+optional so
    // existing project content with a bare `role:` (null) still validates;
    // the goal of validation here is the date_range-class bug, not credit
    // strictness.
    credits: z
      .array(
        z.object({
          role: z.string().nullable().optional(),
          name: z.string().nullable().optional(),
        }),
      )
      .optional(),
    // External attribution: a project's client, or an essay's publication. One
    // field, two labels.
    client: z.string().optional(),
    // Background / UI videos (Vimeo). See videoFrontmatter.
    videos: z.array(videoFrontmatter(z)).optional(),
  };
}

/**
 * Project-only fields (facets, registry metadata, the sub-project map). Spread
 * alongside sharedDocFields for the `projects` collection and for build-time
 * validation in build-projects.mjs. All optional — umbrella vs simple vs doc
 * projects use different subsets. `title` from sharedDocFields stays optional for
 * projects (they identify by `name`).
 */
export function projectOnlyFields(z) {
  const facetList = z.union([z.string(), z.array(z.string())]).optional();
  return {
    name: z.string().optional(),
    slug: z.string().optional(),
    aliases: z.array(z.string()).optional(),
    // Must be a STRING. An unquoted single year parses as a YAML number and
    // crashes downstream (`.split("-")`); validating here replaces the hand
    // rolled guard that used to live in build-projects.mjs.
    date_range: z.string().optional(),
    roles: z.array(z.string()).optional(),
    category: z.string().optional(),
    market: z.string().optional(),
    project_type: facetList,
    sector: z.string().optional(),
    characteristic: facetList,
    role: z.string().optional(),
    scale: z.string().optional(),
    image_tags: z.array(z.string()).optional(),
    lead_images: z.array(z.string()).optional(),
    personal: z.boolean().optional(),
    snapshot_only: z.boolean().optional(),
    chronological: z.boolean().optional(),
    unlisted: z.boolean().optional(),
    description: z.string().optional(),
    // Umbrella sub-project map. Each value is itself a project-shaped record;
    // validated loosely here (the fan-out in build-projects.mjs owns the detail),
    // with sub-entries validated separately by that script.
    projects: z.record(z.string(), z.any()).optional(),
  };
}

/** Full project-frontmatter schema (shared + project-only). Used to validate. */
export function projectFrontmatterSchema(z) {
  return z.object({
    ...sharedDocFields(z),
    title: z.string().optional(), // projects identify by `name`, not `title`
    ...projectOnlyFields(z),
  });
}
