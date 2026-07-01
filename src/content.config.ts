import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { sharedDocFields, projectFrontmatterSchema } from "./lib/content-schema.mjs";
import { projectsLoader } from "./lib/projects-loader";

// Essays. The shared field fragment (content-schema.mjs) is the single source of
// truth for the shape essays and project docs have in common — title, tags,
// cover, order, pinned, layout, and now `credits` (collaborators), `client`
// (here meaning the publication), and `videos` (background/UI Vimeo). `date` is
// required for essays (they sort chronologically), so it's overridden on top of
// the spread, which leaves it optional.
const writing = defineCollection({
  loader: glob({ pattern: "**/[!_]*.md", base: "./public/images" }),
  schema: z.object({
    ...sharedDocFields(z),
    // Essays must be dated (the Practice/Tools feeds sort on it).
    date: z.string(),
  }),
});

// Project docs. Backed by a custom loader (src/lib/projects-loader.ts) that reads
// the `_project.md` files Astro's glob() can't — so project bodies render through
// the same Astro pipeline as essays, validated by the same shared schema. The
// registry fan-out (umbrella → sub-projects) stays in build-projects.mjs; this
// collection is only the document/render half (consulted by /projects/[slug] for
// `layout: doc` pages).
const projects = defineCollection({
  loader: projectsLoader(),
  schema: projectFrontmatterSchema(z),
});

// Real files committed to the repo, mirrored from the Jullie-Resume gdrive
// editing source via `npm run sync-bullets` (scripts/sync-bullets.mjs).
// Each file is one atomic career/education/exhibition bullet.
const bullets = defineCollection({
  loader: glob({
    pattern: ["**/*.md", "!_template.md"],
    base: "./src/content/bullets",
  }),
  schema: z.object({
    company: z.string().optional(),
    role: z.string().optional(),
    // Free-form string: Jullie-Resume has at least
    // experience/education/exhibition/skill/publication/talks in practice.
    category: z.string().optional(),
    date: z.string().optional(),
    tags: z.array(z.string()).optional(),
    project_key: z.string().optional(),
    project: z.string().optional(),
    size: z.string().optional(),
    // 6-char hex hash — matches filename suffix; canonical identifier
    // surviving filename changes. Coerce because hashes with only decimal
    // digits (e.g. `099625`) parse as numbers in YAML.
    id: z.coerce.string().optional(),
    // Explicit rank within a same-date group on /resume. Lower numbers sort
    // first; bullets without `order` fall to the end in stable alphabetical
    // order. Use it to surface "important" bullets in groups where dates tie
    // (e.g. all m-a-r-v-i-n bullets share `June 2015 – Present`).
    order: z.number().optional(),
  }),
});

// Editorial-page sections. `text` is a short prose line that sits between
// media blocks as a flow marker; `filmstrip` renders a primary + up to 4
// thumbs (5 assets total, build fails past 5 via Zod .max(5)).
const filmstripAsset = z.object({
  src: z.string(),
  type: z.enum(["image", "video"]),
  poster: z.string().optional(),
  project_url: z.string().optional(),
  project_label: z.string().optional(),
});

const pageSection = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), body: z.string() }),
  z.object({
    kind: z.literal("filmstrip"),
    assets: z.array(filmstripAsset).min(1).max(5),
  }),
  // A single outbound/in-site link rendered as a prose line (e.g. the landing
  // page's "Résumé" link), so it's authored in the page's markdown rather than
  // hardcoded in the route.
  z.object({ kind: z.literal("link"), href: z.string(), label: z.string() }),
]);

const pages = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string().optional(),
    sections: z.array(pageSection).optional(),
  }),
});

const diagrams = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/diagrams" }),
  schema: z.object({
    title: z.string(),
    caption: z.string(),
    // Filename in src/components/diagrams/ (without .astro). Resolved at
    // render time by /diagrams/[slug].astro via import.meta.glob.
    component: z.string(),
    project_keys: z.array(z.string()).optional(),
    aspect_ratio: z.string().optional(),
  }),
});

// Internal operations wiki. Rendered by the dev-only /wiki route (404 in
// production) — see src/pages/wiki/. One file per topic; `section` groups them
// in the sidebar, `order` sorts within a section. `summary` is a one-line
// blurb kept as metadata (the /wiki landing renders the Overview topic, not a
// table of contents — the sidebar is the index).
const wiki = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/wiki" }),
  schema: z.object({
    title: z.string(),
    section: z.string(),
    order: z.number().default(0),
    summary: z.string().optional(),
  }),
});

export const collections = { writing, projects, bullets, pages, diagrams, wiki };
