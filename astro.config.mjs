import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";
import remarkEssayImages from "./src/lib/remark-essay-images.mjs";

export default defineConfig({
  output: "server",
  adapter: vercel({ imageService: true, webAnalytics: { enabled: true } }),
  image: {
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  // Resolves bare-filename images in writing-essay bodies to their Blob URLs.
  // Note: the markdown-doc path (src/lib/project-doc.ts) builds its own
  // processor and does NOT inherit this — inline images are essay-only for now.
  markdown: {
    remarkPlugins: [remarkEssayImages],
  },
});
