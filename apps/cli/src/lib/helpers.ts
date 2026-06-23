// CLI-local kind resolution and DOCX output naming. (The hardcoded build-target
// lists — bulk dirs, public PDFs, sync targets — were removed: `--all` now walks
// CONTENT_DIR, `--public`/`sync` are gone, and the API owns the cv+projects merge.)

import type { ParseType } from "@one-resume/parser";
import { basename, dirname, extname, relative, resolve } from "node:path";

/**
 * Resolve the kind from the input filename, overridable with `--template`
 * (`cv` or `projects`; `main` is accepted as an alias for `cv`).
 */
export function resolveKind(mdPath: string, templateFlag?: string): ParseType {
  if (templateFlag === "projects") return "projects";
  if (templateFlag === "cv" || templateFlag === "main") return "cv";
  return basename(mdPath).includes("projects") ? "projects" : "cv";
}

/**
 * Mirror the content/ subfolder structure under `<atsRoot>/` and suffix the
 * basename with `-ats.docx`:
 *   <content>/cv/main/en-cv.md → <atsRoot>/cv/main/en-cv-ats.docx
 */
export function defaultDocxOut(
  contentRoot: string,
  atsRoot: string,
  mdPath: string,
): string {
  const rel = relative(contentRoot, mdPath);
  const subdir = dirname(rel);
  const base = basename(mdPath, extname(mdPath));
  return resolve(atsRoot, subdir, `${base}-ats.docx`);
}
