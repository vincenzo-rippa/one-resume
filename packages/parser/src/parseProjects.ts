import { marked, type Token, type Tokens } from "marked";
import type { ParsedProjects } from "@one-resume/types";
import TokenStream from "./classes/TokenStream.ts";
import { readProjectsBlock } from "./readers/readProjects.ts";

// ───────────────────────────────────────────────────────────────────────────
// Public API
// ───────────────────────────────────────────────────────────────────────────

export interface ParseProjectsOptions {
  /** Source label for error messages. Not read; only used in diagnostics. */
  sourceName?: string;
}

/**
 * Deterministic parser for the standalone projects markdown
 * (content/projects/*.md).
 *
 * Structure (language-agnostic, EN + IT labels recognized):
 *   # Projects                             ← H1 title
 *   ## <Project title>                     ← per-project heading (depth 2)
 *   _<Start> – <End>_                      ← italic date range
 *   **Associated with:** <value>           ← optional (EN/IT)
 *   <description paragraph(s)>             ← prose
 *   **Highlights**                         ← optional header marker (EN/IT)
 *   - <highlight>                          ← optional bullet list
 *   **Selected technologies:** a, b, c     ← optional (EN/IT)
 *   ---                                    ← optional separator
 *
 * For projects embedded inside a freelance CV the H1 is absent and entries
 * use H3; `readProjectsBlock` (readers/readProjects.ts) handles that case
 * directly with `projectDepth: 3`.
 */
export function parseProjects(
  markdown: string,
  options: ParseProjectsOptions = {},
): ParsedProjects {
  const tokens = marked.lexer(markdown) as Token[];
  const stream = new TokenStream(tokens, markdown, options.sourceName);

  // First meaningful token: H1 title (# Projects / # Progetti). Value unused.
  const h1 = stream.consumeMeaningful();
  if (h1.type !== "heading" || (h1 as Tokens.Heading).depth !== 1) {
    throw stream.error("expected H1 with projects title as first line", h1);
  }

  const projects = readProjectsBlock(stream, 2);
  if (projects.length === 0) {
    throw stream.error("no project entries found");
  }
  return projects;
}
