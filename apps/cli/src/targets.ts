// The hardcoded build targets, output naming, and kind resolution for the CLI's
// bulk/public commands. These are CLI-local (a local tool may carry its own
// target lists); a later manifest runner replaces them with JSON manifests for
// other consumers.

import { basename, dirname, extname, relative, resolve } from "node:path";

/**
 * What to parse a markdown file as: a `cv` (which may embed a projects section)
 * or a standalone `projects` document. There is no separate variant for a CV
 * with embedded projects — the parser captures them when present and the single
 * `cv` template renders them.
 */
export type Kind = "cv" | "projects";

/**
 * Resolve the kind from the input filename, overridable with `--template`
 * (`cv` or `projects`; `main` is accepted as an alias for `cv`).
 */
export function resolveKind(mdPath: string, templateFlag?: string): Kind {
  if (templateFlag === "projects") return "projects";
  if (templateFlag === "cv" || templateFlag === "main") return "cv";
  return basename(mdPath).includes("projects") ? "projects" : "cv";
}

// ─── Bulk source dirs (--all), relative to contentDir ────────────────────────

export const BULK_DIRS = [
  "cv/main",
  "cv/derived",
  "projects",
] as const;

// ─── Public PDF targets (--public): the 4 PDFs the site ships ────────────────

export const PUBLIC_PDF_TARGETS: { input: string; out: string }[] = [
  { input: "cv/main/en-cv.md", out: "en.pdf" },
  { input: "cv/main/it-cv.md", out: "it.pdf" },
  { input: "projects/en-projects.md", out: "projects.pdf" },
  { input: "projects/it-projects.md", out: "progetti.pdf" },
];

// ─── Sync targets: per-language content.json the pro-landing site consumes ────

export interface SyncTarget {
  /** CV markdown, relative to contentDir. */
  cv: string;
  /** Projects markdown, relative to contentDir. */
  projects: string;
  /** Output JSON, relative to siteLocalesDir. */
  out: string;
}

export const SYNC_TARGETS: SyncTarget[] = [
  {
    cv: "cv/main/en-cv.md",
    projects: "projects/en-projects.md",
    out: "en/content.json",
  },
  {
    cv: "cv/main/it-cv.md",
    projects: "projects/it-projects.md",
    out: "it/content.json",
  },
];

// ─── Output naming ───────────────────────────────────────────────────────────

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
