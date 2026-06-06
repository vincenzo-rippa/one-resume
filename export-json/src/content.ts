// The read → parse → content-object transform behind export-json.
//
// Reads through a SourceResolver (filesystem today, GitHub/bucket later), so
// this is source-agnostic. The CLI in scripts/build.ts owns env/path resolution
// and picks the source.

import {
  loadParsedCv,
  loadParsedProjects,
  type SourceResolver,
} from "core-parser/source";

export interface Target {
  /** CV markdown, relative to the content dir. */
  cv: string;
  /** Projects markdown, relative to the content dir. */
  projects: string;
  /** Output JSON, relative to the locales dir. */
  out: string;
}

/** The per-language content.json files the pro-landing site consumes. */
export const TARGETS: Target[] = [
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

/**
 * Parse one language's markdown into the raw content object the site consumes —
 * `{ profile, experiences, education, projects, footer, keywords }`, the
 * untransformed parser output that gets JSON-stringified verbatim. The
 * standalone projects markdown supplies the top-level `projects` array
 * (replacing any embedded one from the CV).
 */
export async function buildContent(source: SourceResolver, target: Target) {
  const { profile, experiences, education, footer, keywords } =
    await loadParsedCv(source, target.cv);
  const projects = await loadParsedProjects(source, target.projects);
  return { profile, experiences, education, projects, footer, keywords };
}
