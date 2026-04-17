# Open flags

Things flagged during work but not yet decided or addressed. Rough priority.

## Tooling

- **`scripts/post.mjs` is stale.** It appends directly to `src/data/manifest.json`, which is now regenerated from `public/images/image_catalogue.json` on every `build-manifest.mjs` run — anything `post.mjs` writes gets wiped on next rebuild. Decide: (a) rewrite it to append to the catalogue + copy the image into the correct folder, or (b) delete it.
- **Junction recreation on other machines.** `src/content/bullets` is a Windows directory junction to `D:\ClaudeCoding\Jullie-Resume\input\bullets`. It's not tracked by git, so a fresh clone will have an empty folder. Add a setup note to `USAGE.md` (or a `scripts/setup-links.mjs` that recreates it).

## Data hygiene

- **Project metadata is stub-level.** `src/data/manifest.json` → `projects{}` has empty `description`, default `year: 2026` (or `null` for empty projects), and placeholder credits `[{role: "Design", name: "Marvin de Jong"}]`. Needs per-project content, especially descriptions for the project detail pages.
- **Catalogue `client` field is now informational only.** Grouping is done by top-level folder via `FOLDER_MAP` in `scripts/build-manifest.mjs`. The catalogue still has a `client` field the LLM populated inconsistently (empty, `personal`, or brand name). Not causing bugs, but it's dead data; either stop writing it or make the catalogue generator derive it from folder.
- **Schema vs. reality drift.** `src/data/schema.json` declares the tag/medium/client vocabulary, but the catalogue contains tags and mediums outside that list (e.g. mediums `identity`, `environments`, `spatial`, `digital`; many free-form tags). The filter bar on Work uses `schema.pinned` which may not match what's actually in the manifest. Reconcile when project/item structure is stable.
- **`gahi` vs `Hagahi`.** Catalogue has both a `Gahi` folder and a `Hagahi` client name; the folder wins (`FOLDER_MAP` → `gahi`). If the canonical name is Hagahi, rename the folder and update the map.
- **`dsr` slug.** Folder is `DS+R`; slugged to `dsr` because `+` breaks in URLs. Project title still displays as `DS+R`. Fine, just noting.
- **Yale on Practice.** `Yale` folder is currently `personal: true` (academic work → Practice). If Yale thesis/graduate work should live on Work instead, flip `personal` in `FOLDER_MAP`.

## Pages

- **Work page intro copy is missing.** Practice has the parameter-driven design paragraph; Work has nothing above the filter bar. Copy needed.
- **`essay` tag still in `schema.json`.** Filtered out at render time on `index.astro`. Could be removed from schema if it's never needed on Work again.

## CV page (`/cv`)

- **No chronological sort.** Bullets are grouped by category → company/role in file-walk order. Dates are free-form strings (`"Jun 2019 – Jun 2022, promoted to ACD Jun 2021"`), so there's no reliable sort key. Fix requires a normalized `date_start` / `date_end` field in Jullie-Resume's frontmatter.
- **One section per (company, role) pair.** A company with multiple roles produces multiple sections on the CV page. Probably correct (promotions should be visible), but could be folded into one block per company with role transitions inline if preferred.
- **Tags include tiered-skill prefix.** Jullie-Resume uses `~tag` for secondary/tiered skill tags. The `/cv` page strips the `~` for display and filtering, merging both tiers into one flat vocabulary. If the tiering should be preserved in the filter UI (e.g. primary tags as pinned, `~` tags behind a "more" toggle), that's additional work.
- **No runtime semantic search.** The CV page is filter + browse only; there is no "find bullets like this JD" feature. If that's wanted later, it requires bringing back Chroma or a similar vector store.

## Deferred

- **Image migration to `src/assets/`.** For build-time resizing / `srcset` / AVIF via `astro:assets`. Touches every image reference in the manifest and templates. Recommendation: do this in one pass *after* project/item structure is locked in, to avoid redoing the work.
- **Jullie-Resume live endpoint.** A "paste a JD, get a tailored resume" demo on the site would require a hosted Python service (Flask/FastAPI wrapper around Jullie-Resume) with Ollama running somewhere persistent. Not compatible with Vercel serverless. Deferred in favor of the static CV page, which already covers the browse-my-experience use case.
