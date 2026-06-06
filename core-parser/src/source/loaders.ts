// Source-based loaders: read markdown through a SourceResolver and hand the
// string to the pure parser. This is the reusable read→parse path the API and
// exporters share — swap the resolver to read from anywhere.

import { parseCv } from "../parseCv.ts";
import { parseProjects } from "../parseProjects.ts";
import type { ParsedCv, ParsedProjects } from "../types.ts";
import type { SourceResolver } from "./types.ts";

/** Read a required source; throw a clear error when it does not resolve. */
async function readRequired(
  resolver: SourceResolver,
  sourceName: string,
): Promise<string> {
  const text = await resolver.read(sourceName);
  if (text === null) {
    throw new Error(`source not found: ${sourceName}`);
  }
  return text;
}

/** Read + parse a CV markdown file via a resolver. */
export async function loadParsedCv(
  resolver: SourceResolver,
  sourceName: string,
): Promise<ParsedCv> {
  const markdown = await readRequired(resolver, sourceName);
  return parseCv(markdown, { sourceName });
}

/** Read + parse a standalone projects markdown file via a resolver. */
export async function loadParsedProjects(
  resolver: SourceResolver,
  sourceName: string,
): Promise<ParsedProjects> {
  const markdown = await readRequired(resolver, sourceName);
  return parseProjects(markdown, { sourceName });
}
