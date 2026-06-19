// The content-source port + the load use-case. A `ContentSource` is any root the
// pipeline reads markdown from by path — a filesystem dir (CLI) or a GitHub repo
// (API). `loadContent` reads a job's markdown through the source and builds the
// content, so both delivery mechanisms share one read-then-build path and the
// source is the single seam where "where the markdown lives" is decided.

import { buildContent, type ContentOutput } from "./build.ts";

/** A root the pipeline reads markdown from, by path. */
export interface ContentSource {
  read(path: string): Promise<string>;
}

/** A content job: the CV markdown path + an optional standalone projects path. */
export interface ContentJob {
  cv: string;
  projects?: string;
}

/** Read a job's markdown through `source`, then build the content. */
export async function loadContent(
  source: ContentSource,
  job: ContentJob,
): Promise<ContentOutput> {
  const cvMarkdown = await source.read(job.cv);
  const projectsMarkdown =
    job.projects !== undefined ? await source.read(job.projects) : undefined;
  return buildContent({ cvMarkdown, projectsMarkdown });
}
