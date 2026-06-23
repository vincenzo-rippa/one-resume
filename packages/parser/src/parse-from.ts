import type {
  ParsedCv,
  ParsedProjects,
  DocumentSource,
} from "@one-resume/domain";
import { parse, type ParseType } from "./parse.ts";

/**
 * Read a document from `source` by `path`, then `parse` it — the source-driven
 * sibling of {@link parse}. Because `type` is a runtime value, it returns the
 * `ParsedCv | ParsedProjects` union; callers that know the type narrow the result.
 */
export async function parseFrom(
  source: DocumentSource,
  path: string,
  type: ParseType,
): Promise<ParsedCv | ParsedProjects> {
  const markdown = await source.read(path);
  return parse(markdown, type);
}
