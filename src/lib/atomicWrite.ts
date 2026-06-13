import fs from "node:fs";

/**
 * Write a file atomically: write to a unique temp file in the same directory,
 * then rename it over the target. `renameSync` is an atomic replace on every OS,
 * so a crash or interruption mid-write can never leave a truncated / half-written
 * file — the target is always either the previous complete file or the new one.
 * Plain `writeFileSync` truncates *then* writes, leaving a window where the file
 * is empty or partial; that window is what loses hand-curated content (the image
 * catalogue, a `_project.md`) if a write is interrupted.
 *
 * Synchronous to match the admin routes' existing `writeFileSync` call sites.
 */
export function writeFileAtomicSync(filePath: string, data: string): void {
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(tmp, data);
    fs.renameSync(tmp, filePath);
  } catch (err) {
    try {
      fs.rmSync(tmp, { force: true });
    } catch {}
    throw err;
  }
}
