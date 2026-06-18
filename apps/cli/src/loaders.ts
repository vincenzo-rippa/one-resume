// Read + parse glue: read a markdown file and hand the string to the pure
// parser. Folds in the former @one-resume/fs loaders.

import { parseCv, parseProjects } from "@one-resume/parser";
import type { ParsedCv, ParsedProjects } from "@one-resume/types";
import { readTextRequired } from "./io.ts";

/** Read + parse a CV markdown file. */
export async function loadParsedCv(path: string): Promise<ParsedCv> {
  return parseCv(await readTextRequired(path), { sourceName: path });
}

/** Read + parse a standalone projects markdown file. */
export async function loadParsedProjects(
  path: string,
): Promise<ParsedProjects> {
  return parseProjects(await readTextRequired(path), { sourceName: path });
}
