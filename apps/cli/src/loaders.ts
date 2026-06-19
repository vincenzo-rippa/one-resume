// Read + parse glue: read markdown through a ContentSource and hand the string
// to the pure parser.

import { parse } from "@one-resume/parser";
import type { ParsedCv, ParsedProjects } from "@one-resume/domain";
import type { ContentSource } from "@one-resume/content";

/** Read + parse a CV markdown file. */
export async function loadParsedCv(
  source: ContentSource,
  path: string,
): Promise<ParsedCv> {
  return parse(await source.read(path), "cv");
}

/** Read + parse a standalone projects markdown file. */
export async function loadParsedProjects(
  source: ContentSource,
  path: string,
): Promise<ParsedProjects> {
  return parse(await source.read(path), "projects");
}
