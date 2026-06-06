import { type Tokens } from "marked";
import type { Project } from "../types.ts";
import TokenStream from "../classes/TokenStream.ts";
import { isItalicOnlyParagraph } from "../helpers/internals.ts";
import { inlineToPlain } from "../helpers/inlineRendering.ts";
import { normalizeText } from "../helpers/normalize.ts";
import { parsePeriod } from "../helpers/period.ts";

// Recognized inline-paragraph labels (case-insensitive, EN + IT).
const ASSOCIATED_LABELS = ["associated with", "associato a"];
const TECHNOLOGIES_LABELS = ["selected technologies", "tecnologie selezionate"];
// `**Highlights**` paragraph that simply heads the bullet list below it.
// The list items become `Project.highlights`; the header paragraph is skipped.
const HIGHLIGHTS_HEADER_LABELS = ["highlights", "punti salienti", "punti chiave"];

/**
 * Reads consecutive project entries until the next HR / heading at a
 * shallower-or-equal depth / EOF. Each project's heading must be at
 * `projectDepth`. Returns an empty array when no projects are present.
 *
 * Exposed so parseCv can reuse it for freelance CVs that embed a
 * "## Selected Projects" section (entries at H3).
 */
export function readProjectsBlock(
  stream: TokenStream,
  projectDepth: number,
): Project[] {
  const projects: Project[] = [];
  while (true) {
    const next = stream.peekMeaningful();
    if (!next) break;
    if (next.type === "hr") {
      // Separator between projects (or just before the section ends). Consume
      // and continue — the next iteration decides whether more projects follow.
      stream.consumeMeaningful();
      continue;
    }
    // Any non-heading token (footer paragraph, etc.) ends the section.
    if (next.type !== "heading") break;
    // Heading at a different depth than projectDepth also ends the section
    // (shallower = outer section; deeper would be a malformed entry — the
    // body reader of the previous project would have stopped on it).
    if ((next as Tokens.Heading).depth !== projectDepth) break;
    projects.push(readOneProject(stream, projectDepth));
  }
  return projects;
}

function readOneProject(stream: TokenStream, projectDepth: number): Project {
  const heading = stream.consumeMeaningful();
  if (
    heading.type !== "heading" ||
    (heading as Tokens.Heading).depth !== projectDepth
  ) {
    throw stream.error(
      `expected H${projectDepth} project title heading, got ${heading.type}` +
        (heading.type === "heading"
          ? ` (depth ${(heading as Tokens.Heading).depth})`
          : ""),
      heading,
    );
  }
  const title = normalizeText(
    inlineToPlain((heading as Tokens.Heading).tokens),
  );

  // Period: an italic-only paragraph.
  const metaToken = stream.consumeMeaningful();
  if (!isItalicOnlyParagraph(metaToken)) {
    throw stream.error(
      "expected italic line with date range after project heading",
      metaToken,
    );
  }
  const periodText = normalizeText(
    inlineToPlain(
      ((metaToken as Tokens.Paragraph).tokens[0] as Tokens.Em).tokens,
    ),
  );
  const period = parsePeriod(periodText);
  if (!period) {
    throw stream.error(`unparseable date range "${periodText}"`, metaToken);
  }

  let associatedWith: string | undefined;
  let technologies: string[] = [];
  const highlights: string[] = [];
  const descriptionParts: string[] = [];

  // Body: everything up to the next hr / heading at projectDepth or shallower / EOF.
  while (true) {
    const next = stream.peekMeaningful();
    if (!next) break;
    if (next.type === "hr") break;
    if (
      next.type === "heading" &&
      (next as Tokens.Heading).depth <= projectDepth
    ) {
      break;
    }

    const token = stream.consumeMeaningful();

    if (token.type === "list") {
      for (const item of (token as Tokens.List).items) {
        highlights.push(normalizeText(inlineToPlain(item.tokens)));
      }
      continue;
    }

    if (token.type === "paragraph") {
      const para = token as Tokens.Paragraph;

      // `**Highlights**` is a header marker, not prose. Skip it; the bullet
      // list that follows will populate `highlights`.
      if (isStrongOnlyParagraph(para, HIGHLIGHTS_HEADER_LABELS)) continue;

      const labelled = readLabelledParagraph(para);
      if (labelled?.kind === "associated") {
        associatedWith = labelled.value;
        continue;
      }
      if (labelled?.kind === "technologies") {
        technologies = splitCommaList(labelled.value);
        continue;
      }
      // Plain prose — part of the description.
      descriptionParts.push(normalizeText(inlineToPlain(para.tokens)));
      continue;
    }

    throw stream.error(
      `unexpected token in project block: ${token.type}`,
      token,
    );
  }

  const project: Project = {
    title,
    period,
    description: descriptionParts.join(" "),
    highlights,
    technologies,
  };
  if (associatedWith) project.associatedWith = associatedWith;
  return project;
}

/**
 * Recognizes a `**Label:** value` paragraph. Returns the kind + value when the
 * leading bold run matches a known label, otherwise undefined (plain prose).
 */
function readLabelledParagraph(
  para: Tokens.Paragraph,
): { kind: "associated" | "technologies"; value: string } | undefined {
  const tokens = para.tokens;
  if (!tokens || tokens.length === 0 || tokens[0].type !== "strong") {
    return undefined;
  }
  const label = normalizeText(inlineToPlain((tokens[0] as Tokens.Strong).tokens))
    .toLowerCase()
    .replace(/:$/, "")
    .trim();
  // Value is everything after the bold run; tolerate a colon left outside it.
  const value = normalizeText(inlineToPlain(tokens.slice(1))).replace(
    /^:\s*/,
    "",
  );
  if (ASSOCIATED_LABELS.includes(label)) return { kind: "associated", value };
  if (TECHNOLOGIES_LABELS.includes(label)) {
    return { kind: "technologies", value };
  }
  return undefined;
}

/**
 * True for paragraphs that consist of nothing but a `**Label**` strong run
 * whose label text matches one of `labels`. Used to detect bare section
 * markers like `**Highlights**` that head a following bullet list.
 */
function isStrongOnlyParagraph(
  para: Tokens.Paragraph,
  labels: string[],
): boolean {
  const tokens = para.tokens;
  if (!tokens || tokens.length === 0 || tokens[0].type !== "strong") {
    return false;
  }
  const rest = tokens.slice(1).filter(
    (t) =>
      !(t.type === "text" && /^\s*$/.test((t as Tokens.Text).text)),
  );
  if (rest.length > 0) return false;
  const label = normalizeText(inlineToPlain((tokens[0] as Tokens.Strong).tokens))
    .toLowerCase()
    .replace(/:$/, "")
    .trim();
  return labels.includes(label);
}

function splitCommaList(text: string): string[] {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
