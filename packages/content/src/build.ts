// The markdown → site content.json transform. Pure data→data: parse the CV
// (and optional standalone projects) markdown and return the canonical content
// the pro-landing site consumes — the parsed CV itself, with its captured
// labels. The CLI / API own env/path resolution and file I/O; this module owns
// the format.

import type { ParsedCv } from "@one-resume/domain";
import { parse } from "@one-resume/parser";

export interface ContentInput {
  cvMarkdown: string;
  /**
   * Standalone projects markdown. When given, its projects (and its captured
   * section heading) replace the CV's embedded projects — the standard site
   * layout, where projects live in their own file.
   */
  projectsMarkdown?: string;
}

/** The content the site consumes: a parsed CV, with its captured labels. */
export type ContentOutput = ParsedCv;

/**
 * Build the content for one language. The CV is parsed as-is; when
 * `projectsMarkdown` is given, the standalone projects and their captured label
 * replace the CV's embedded ones.
 */
export function buildContent(input: ContentInput): ContentOutput {
  const cv = parse(input.cvMarkdown, "cv");
  if (input.projectsMarkdown === undefined) return cv;

  const standalone = parse(input.projectsMarkdown, "projects");
  return {
    ...cv,
    labels: { ...cv.labels, projects: standalone.label },
    projects: standalone.projects,
  };
}
