// The markdown → site content.json transform. Pure string→string: parse the CV
// (and optional standalone projects) markdown and emit the canonical content
// JSON the pro-landing site consumes. The CLI owns env/path resolution and file
// I/O; this module owns the format.

import type {
  Profile,
  Experience,
  Education,
  Project,
} from "@one-resume/types";
import { parseCv, parseProjects } from "@one-resume/parser";

export interface ContentInput {
  cvMarkdown: string;
  projectsMarkdown?: string;
}

export interface ContentOutput {
  profile: Profile;
  experiences: Experience[];
  education: Education[];
  projects: Project[];
  footer: string;
  keywords: string[];
}

/**
 * The untransformed parser output the site consumes:
 * `{ profile, experiences, education, projects, footer, keywords }`. When
 * `projectsMarkdown` is given, its parsed projects replace the CV's embedded
 * ones (the standard site layout, where projects live in their own file);
 * otherwise the CV's own `projects` array is used.
 */
export function buildContent(input: ContentInput): ContentOutput {
  const cv = parseCv(input.cvMarkdown, { sourceName: "cv" });
  const { profile, experiences, education, footer, keywords } = cv;
  const projects =
    input.projectsMarkdown !== undefined
      ? parseProjects(input.projectsMarkdown, { sourceName: "projects" })
      : cv.projects;
  return { profile, experiences, education, projects, footer, keywords };
}
