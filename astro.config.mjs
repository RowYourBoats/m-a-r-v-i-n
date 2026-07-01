import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";
import remarkEssayImages from "./src/lib/remark-essay-images.mjs";
import remarkDiagram from "./src/lib/remark-diagram.mjs";

export default defineConfig({
  output: "server",
  adapter: vercel({ imageService: true, webAnalytics: { enabled: true } }),
  image: {
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  // One markdown pipeline for every content-collection render — essays AND
  // project docs (the latter now via the `projects` collection's custom loader,
  // src/lib/projects-loader.ts). remarkEssayImages resolves bare-filename images
  // to their Blob URLs by the file's own folder; remarkDiagram intercepts the
  // ```diagram fence. Both apply uniformly, so essays gain diagram fences and
  // project docs gain Blob-relative inline images.
  markdown: {
    remarkPlugins: [remarkEssayImages, remarkDiagram],
  },
});
