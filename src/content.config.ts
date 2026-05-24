import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const writing = defineCollection({
  loader: glob({ pattern: "**/[!_]*.md", base: "./public/images" }),
  schema: z.object({
    title: z.string(),
    date: z.string(),
    tags: z.array(z.string()).optional(),
    excerpt: z.string().optional(),
    // Optional filename of a companion image (an `essay_of` image in this
    // essay's folder) to show on the Practice card. Falls back to the first
    // uploaded companion image when omitted.
    cover: z.string().optional(),
  }),
});

// Sourced from Jullie-Resume via a directory junction at src/content/bullets.
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
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string().optional(),
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

export const collections = { writing, bullets, pages, diagrams };
