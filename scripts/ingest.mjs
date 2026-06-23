#!/usr/bin/env node
// One-command content ingest. Takes the current state of public/images/
// (folders, _project.md, images, plus any tags entered in /admin/images) and
// makes it consistent and visible on the site — idempotent and safe to re-run.
//
// Order matters: reconcile heals renames BEFORE stub adds new files, so a
// renamed image keeps its tags instead of being re-stubbed empty. See
// docs/ingest-log.md for a record of what each run changed.
//
// Usage:
//   npm run ingest            full pipeline (reconcile → stub → build → blob)
//   npm run ingest -- --dry-run   preview stub/remap/quarantine only, no writes
//   npm run ingest -- --drop      also remove captioned-but-missing entries
//                                 (deleted-from-disk files reconcile would keep)
//
// Blob upload runs only when BLOB_READ_WRITE_TOKEN is set (read from the
// environment or a root .env); otherwise it's skipped and local /images/
// paths are left in place (still visible in `astro dev`).

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const scriptsDir = __dirname;
const logPath = path.join(root, "docs/ingest-log.md");

const dryRun = process.argv.includes("--dry-run");
// Forwarded to the reconcile step: remove catalogue entries whose file is gone
// from disk even when they carry a caption (otherwise those are quarantined,
// i.e. kept, to survive an unsynced file on the other machine).
const drop = process.argv.includes("--drop");

// Load BLOB_READ_WRITE_TOKEN from a root .env if present (these scripts don't
// pull in dotenv on their own). Never clobber a value already in the env.
function loadDotEnv() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const [, key, rawVal] = m;
    if (process.env[key] != null) continue;
    process.env[key] = rawVal.replace(/^["']|["']$/g, "");
  }
}
loadDotEnv();
const hasBlobToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

// Run a step script, echoing its output live while capturing stdout so we can
// pull the ##SUMMARY line. Resolves to { code, summary }.
function runStep(file, args = [], { fatal = true } = {}) {
  return new Promise((resolve, reject) => {
    const label = path.basename(file, ".mjs");
    console.log(`\n── ${label} ${args.join(" ")} ──`);
    const child = spawn(process.execPath, [path.join(scriptsDir, file), ...args], {
      cwd: root,
      env: process.env,
    });
    let out = "";
    child.stdout.on("data", (d) => {
      const s = d.toString();
      out += s;
      process.stdout.write(s);
    });
    child.stderr.on("data", (d) => process.stderr.write(d));
    child.on("close", (code) => {
      let summary = null;
      const line = out.split(/\r?\n/).find((l) => l.startsWith("##SUMMARY "));
      if (line) {
        try {
          summary = JSON.parse(line.slice("##SUMMARY ".length));
        } catch {
          /* ignore malformed summary */
        }
      }
      if (code !== 0 && fatal) {
        reject(new Error(`${label} exited with code ${code}`));
      } else {
        if (code !== 0) console.warn(`  (${label} exited ${code} — continuing, non-fatal)`);
        resolve({ code, summary });
      }
    });
  });
}

const summaries = [];
const notes = [];
async function step(file, args, opts) {
  const { summary } = await runStep(file, args, opts);
  if (summary) summaries.push(summary);
  return summary;
}
const get = (name) => summaries.find((s) => s.step === name);

// ── pipeline ────────────────────────────────────────────────────────────────
try {
  if (dryRun) {
    console.log("DRY RUN — previewing catalogue changes only; nothing is written.\n");
    await step("reconcile-catalogue-paths.mjs", drop ? ["--drop"] : []); // dry (no --apply)
    await step("stub-catalogue.mjs", ["--all"]); // dry (no --apply)
    console.log("\n(dry-run: build/blob/poster steps skipped — re-run without --dry-run to apply)");
  } else {
    // 1. Heal renames + quarantine missing. With --drop, also remove
    //    captioned-but-missing entries (deleted from disk). Before stub.
    await step("reconcile-catalogue-paths.mjs", drop ? ["--apply", "--drop"] : ["--apply"]);
    // 2. Add genuinely-new images as empty stubs (whole tree).
    await step("stub-catalogue.mjs", ["--all", "--apply"]);
    // 3. Stamp created dates (incl. fresh stubs).
    await step("mine-dates.mjs", []);
    // 4. Aggregate per-image tags into _project.md before projects are built.
    await step("sync-image-tags.mjs", []);
    // 5–6. Rebuild registry + manifest.
    await step("build-projects.mjs", []);
    await step("build-manifest.mjs", []);
    // 7. Recover any blob URLs the rebuild dropped (offline-safe).
    if (fs.existsSync(path.join(root, "src/data/manifest.archive.json"))) {
      await step("rehydrate-blob-urls.mjs", [], { fatal: false });
    } else {
      notes.push("rehydrate skipped — no manifest.archive.json yet (first run)");
    }
    // 8. Publish to Vercel Blob when a token is available.
    if (hasBlobToken) {
      await step("upload-blob.mjs", [], { fatal: false });
    } else {
      notes.push("blob upload skipped — BLOB_READ_WRITE_TOKEN not set (local /images/ paths kept)");
    }
    // 9. Refresh Vimeo poster cache (network; non-fatal).
    await step("sync-vimeo-posters.mjs", ["--apply"], { fatal: false });
  }
} catch (err) {
  console.error(`\n✗ ingest failed: ${err.message}`);
  writeLog({ failed: err.message });
  process.exit(1);
}

// ── final tally + log ─────────────────────────────────────────────────────────
printTally();
writeLog({});

function printTally() {
  console.log("\n══ ingest summary ══");
  const r = get("reconcile");
  const stub = get("stub");
  if (stub) console.log(`  stubbed:      ${stub.added.length}`);
  if (r) console.log(`  remapped:     ${r.remaps.length}`);
  if (r) console.log(`  quarantined:  ${r.quarantined.length}${r.dropped ? ` (dropped ${r.dropped})` : " (kept)"}`);
  const man = get("build-manifest");
  if (man) console.log(`  manifest:     ${man.items} items / ${man.projects} projects`);
  const up = get("upload-blob");
  if (up) console.log(`  blob:         uploaded ${up.uploaded}, adopted ${up.adopted}, skipped ${up.skipped}, failed ${up.failed}`);
  for (const n of notes) console.log(`  note:         ${n}`);
}

function writeLog({ failed }) {
  const ts = new Date().toISOString();
  const mode = (dryRun ? "dry-run, no writes" : "applied") + (drop ? ", --drop" : "");
  const lines = [`## ${ts} — ingest (${mode})`, ""];

  if (failed) lines.push(`- **FAILED:** ${failed}`, "");

  const r = get("reconcile");
  if (r) {
    const verb = r.dropped ? "dropped" : "quarantined (kept)";
    lines.push(`- **reconcile:** ${r.remaps.length} remap(s), ${r.quarantined.length} ${verb}, ${r.unregistered} unregistered on disk`);
    for (const rm of r.remaps) lines.push(`  - remap: \`${rm.from}\` → \`${rm.to}\``);
    for (const q of r.quarantined) lines.push(`  - quarantine: \`${q.from}\` (${q.reason})`);
  }
  const stub = get("stub");
  if (stub) {
    lines.push(`- **stub:** +${stub.added.length} new image(s)`);
    for (const p of stub.added) lines.push(`  - \`${p}\``);
  }
  const md = get("mine-dates");
  if (md) lines.push(`- **mine-dates:** ${md.stamped} stamped, ${md.missing} missing`);
  const sit = get("sync-image-tags");
  if (sit) lines.push(`- **sync-image-tags:** ${sit.updated} _project.md updated`);
  const bp = get("build-projects");
  if (bp) lines.push(`- **build-projects:** ${bp.projects} projects, ${bp.tags} tags, ${bp.clients} clients`);
  const man = get("build-manifest");
  if (man) lines.push(`- **build-manifest:** ${man.items} items across ${man.projects} projects`);
  const rh = get("rehydrate");
  if (rh) lines.push(`- **rehydrate:** ${rh.matched} matched, ${rh.unmatched} unmatched`);
  const up = get("upload-blob");
  if (up) lines.push(`- **upload-blob:** uploaded ${up.uploaded}, adopted ${up.adopted}, skipped ${up.skipped}, failed ${up.failed}`);
  const vp = get("vimeo-posters");
  if (vp) lines.push(`- **vimeo-posters:** ${vp.referenced} referenced, ${vp.fetched} fetched`);
  for (const n of notes) lines.push(`- _${n}_`);

  const entry = lines.join("\n") + "\n\n";
  const title = "# Ingest run log\n\nNewest run first. Appended automatically by `npm run ingest`.\n\n";
  let prior = "";
  if (fs.existsSync(logPath)) {
    const existing = fs.readFileSync(logPath, "utf8");
    prior = existing.startsWith(title) ? existing.slice(title.length) : existing;
  } else {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
  }
  fs.writeFileSync(logPath, title + entry + prior);
  console.log(`\nlogged → ${path.relative(root, logPath)}`);
}
