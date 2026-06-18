// The single place for build targets, output naming, and kind/template
// resolution shared across the pdf / docx / sync / special commands.

import { basename, dirname, extname, relative, resolve } from "node:path";

/** CV kind, derived from the filename or an explicit --template flag. */
export type Kind = "cv" | "freelance" | "projects";

/**
 * Resolve the kind from the input filename, overridable with `--template`.
 * `main` is accepted as an alias for `cv` (the docx command's wording).
 */
export function resolveKind(mdPath: string, templateFlag?: string): Kind {
  if (templateFlag === "main" || templateFlag === "cv") return "cv";
  if (templateFlag === "freelance") return "freelance";
  if (templateFlag === "projects") return "projects";
  const name = basename(mdPath);
  if (name.includes("freelance")) return "freelance";
  if (name.includes("projects")) return "projects";
  return "cv";
}

// ─── Bulk source dirs (--all), relative to contentDir ────────────────────────

export const BULK_DIRS = [
  "cv/main",
  "cv/derived",
  "projects",
  "freelance",
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

// ─── Special (private Italian CV with photo) ─────────────────────────────────

export const SPECIAL_CV_SOURCE = "cv/main/it-cv.md";
export const SPECIAL_SIDECAR_SOURCE = "special/it-special.meta.yaml";

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
