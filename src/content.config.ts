import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const writing = defineCollection({
  loader: glob({ pattern: "**/[!_]*.md", base: "./public/images" }),
  schema: z.object({
    title: z.string(),
    date: z.string(),
    tags: z.array(z.string()).optional(),
    excerpt: z.string().optional(),
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

export const collections = { writing, bullets };
