import { marked, type Token, type Tokens } from "marked";
import { type Profile, type ParsedCv, type Project } from "./types.ts";
import { isItalicOnlyParagraph } from "./helpers/internals.ts";
import TokenStream from "./classes/TokenStream.ts";

import readHeader from "./readers/readHeader.ts";
import readExperiences from "./readers/readExperiences.ts";
import readEducation from "./readers/readEducation.ts";
import { readProjectsBlock } from "./readers/readProjects.ts";
import { readMetadata } from "./readers/readMetadata.ts";
import { inlineToPlain } from "./helpers/inlineRendering.ts";
import { normalizeText } from "./helpers/normalize.ts";

// ───────────────────────────────────────────────────────────────────────────
// Public API
// ───────────────────────────────────────────────────────────────────────────

export interface ParseOptions {
  /** Source label for error messages. Not read; only used in diagnostics. */
  sourceName?: string;
}

export function parseCv(
  markdown: string,
  options: ParseOptions = {},
): ParsedCv {
  const tokens = marked.lexer(markdown) as Token[];
  const stream = new TokenStream(tokens, markdown, options.sourceName);

  const name = readName(stream);
  const header = readHeader(stream);
  const headline = readHeadline(stream);
  const { tagline, taglineShort } = readTaglines(stream);
  const aboutParagraphs = readAboutParagraphs(stream);
  const selectedTechnologies = readSelectedTechnologies(stream);
  consumeOptionalHorizontalRule(stream);
  readSectionHeading(stream, "experience");
  const experiences = readExperiences(stream);
  consumeOptionalHorizontalRule(stream);
  readSectionHeading(stream, "education");
  const education = readEducation(stream);
  const projects = readOptionalProjectsSection(stream);
  const footer = readFooter(stream);

  const { keywords } = readMetadata(markdown);

  const profile: Profile = {
    name,
    location: header.location,
    contacts: header.contacts,
    portfolio: header.portfolio,
    headline,
    tagline,
    taglineShort,
    aboutParagraphs,
    selectedTechnologies,
  };

  return { profile, experiences, education, projects, footer, keywords };
}

// ───────────────────────────────────────────────────────────────────────────
// Other section readers
// ───────────────────────────────────────────────────────────────────────────

function readName(stream: TokenStream): string {
  const token = stream.consumeMeaningful();
  if (token.type !== "heading" || (token as Tokens.Heading).depth !== 1) {
    throw stream.error("expected H1 with full name as first line", token);
  }
  return normalizeText(inlineToPlain((token as Tokens.Heading).tokens));
}

function readHeadline(stream: TokenStream): string {
  const token = stream.consumeMeaningful();
  if (token.type !== "heading" || (token as Tokens.Heading).depth !== 2) {
    throw stream.error("expected ## headline after header block", token);
  }
  return normalizeText(inlineToPlain((token as Tokens.Heading).tokens));
}
function readTaglines(stream: TokenStream): {
  tagline: string;
  taglineShort: string;
} {
  // Collect paragraphs whose entire content is a single italic (em) inline.
  const taglineParagraphs: string[] = [];

  while (true) {
    const next = stream.peekMeaningful();
    if (!next) break;
    if (!isItalicOnlyParagraph(next)) break;
    const token = stream.consumeMeaningful() as Tokens.Paragraph;
    const em = token.tokens[0] as Tokens.Em;
    taglineParagraphs.push(normalizeText(inlineToPlain(em.tokens)));
  }

  if (taglineParagraphs.length === 0) {
    return { tagline: "", taglineShort: "" };
  }
  if (taglineParagraphs.length === 1) {
    return { tagline: taglineParagraphs[0], taglineShort: "" };
  }
  // Two or more — take first as long, second as short.
  return {
    tagline: taglineParagraphs[0],
    taglineShort: taglineParagraphs[1],
  };
}
function readAboutParagraphs(stream: TokenStream): string[] {
  const paragraphs: string[] = [];
  while (true) {
    const next = stream.peekMeaningful();
    if (!next) {
      throw stream.error(
        "expected ### Selected technologies heading after about paragraphs",
      );
    }
    if (next.type === "heading") break;
    const token = stream.consumeMeaningful();
    if (token.type === "paragraph") {
      const text = inlineToPlain((token as Tokens.Paragraph).tokens);
      paragraphs.push(normalizeText(text));
    } else {
      throw stream.error(
        `unexpected token in about section: ${token.type}`,
        token,
      );
    }
  }
  return paragraphs;
}
// Recognized headings for the technologies section (case-insensitive).
// Both the standard `### Selected technologies` (main CV) and the freelance
// `## Core technologies` form pass.
const TECH_HEADINGS = [
  "selected technologies",
  "core technologies",
  "tecnologie selezionate",
  "tecnologie principali",
];

function readSelectedTechnologies(stream: TokenStream): string[] {
  const heading = stream.consumeMeaningful();
  if (heading.type !== "heading") {
    throw stream.error(
      `expected technologies heading, got ${heading.type}`,
      heading,
    );
  }
  const h = heading as Tokens.Heading;
  if (h.depth !== 2 && h.depth !== 3) {
    throw stream.error(
      `expected technologies heading at depth 2 or 3, got H${h.depth}`,
      heading,
    );
  }
  const headingText = normalizeText(inlineToPlain(h.tokens)).toLowerCase();
  if (!TECH_HEADINGS.some((l) => headingText.includes(l))) {
    throw stream.error(
      `expected technologies heading text matching one of ${TECH_HEADINGS.join(" / ")}, got "${headingText}"`,
      heading,
    );
  }

  // Accept either a comma-separated paragraph (standard CV) or a bullet list
  // (freelance CV). Both produce the same flat string[].
  const next = stream.consumeMeaningful();
  if (next.type === "list") {
    return (next as Tokens.List).items.map((item) =>
      normalizeText(inlineToPlain(item.tokens)),
    );
  }
  if (next.type === "paragraph") {
    const text = normalizeText(
      inlineToPlain((next as Tokens.Paragraph).tokens),
    );
    return text
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  throw stream.error(
    `expected paragraph or bullet list after technologies heading, got ${next.type}`,
    next,
  );
}

/**
 * Optional Selected Projects section after Education (freelance CVs).
 *
 * Form:
 *   ---                                  ← optional separator
 *   ## Selected Projects                 ← H2 section heading (EN/IT)
 *   ### <Project title>                  ← project entries at H3
 *   ...
 *
 * Returns [] when the section is absent (every standard CV).
 */
function readOptionalProjectsSection(stream: TokenStream): Project[] {
  consumeOptionalHorizontalRule(stream);

  const next = stream.peekMeaningful();
  if (!next || next.type !== "heading") return [];
  const h = next as Tokens.Heading;
  if (h.depth !== 2) return [];

  const text = normalizeText(inlineToPlain(h.tokens)).toLowerCase();
  if (
    !text.includes("selected projects") &&
    !text.includes("progetti selezionati")
  ) {
    return [];
  }

  stream.consumeMeaningful(); // consume "## Selected Projects"
  const projects = readProjectsBlock(stream, 3);
  consumeOptionalHorizontalRule(stream);
  return projects;
}
// The `---` separator is optional. The next `##` heading is itself a hard
// section boundary; the rule is presentational only. If an HR is present,
// consume it; otherwise leave the next token in place.
function consumeOptionalHorizontalRule(stream: TokenStream): void {
  const next = stream.peekMeaningful();
  if (next && next.type === "hr") {
    stream.consumeMeaningful();
  }
}
function readSectionHeading(
  stream: TokenStream,
  kind: "experience" | "education",
): void {
  const token = stream.consumeMeaningful();
  if (token.type !== "heading" || (token as Tokens.Heading).depth !== 2) {
    throw stream.error(
      `expected ## ${kind === "experience" ? "Professional Experience" : "Education"} heading, got ${token.type}`,
      token,
    );
  }
  const text = normalizeText(
    inlineToPlain((token as Tokens.Heading).tokens),
  ).toLowerCase();
  const expected =
    kind === "experience"
      ? ["professional experience", "esperienza professionale"]
      : ["education", "formazione"];
  if (!expected.some((e) => text.includes(e))) {
    throw stream.error(
      `expected one of ${expected.join(" / ")} as ## heading, got "${text}"`,
      token,
    );
  }
}

/**
 * Reads the footer (e.g. GDPR notice) that follows the Education section.
 *
 * Form expected in markdown (after the closing `---`):
 *   "I authorize the processing of personal data … 679/2016"
 *
 * Wrapping ASCII or curly quotes (and an optional trailing comma) are part of
 * the source-file formatting and are stripped here. The text itself is required
 * — every CV markdown must end with a footer paragraph.
 */
function readFooter(stream: TokenStream): string {
  consumeOptionalHorizontalRule(stream);

  const next = stream.peekMeaningful();
  if (!next) {
    throw stream.error("expected footer paragraph after Education section");
  }
  if (next.type !== "paragraph") {
    throw stream.error(
      `expected footer paragraph after Education section, got ${next.type}`,
      next,
    );
  }

  const token = stream.consumeMeaningful() as Tokens.Paragraph;
  const raw = normalizeText(inlineToPlain(token.tokens));
  // Strip the wrapping ASCII / curly quotes (markdown formatting only) and an
  // optional trailing comma — both appear in the source files.
  return raw.replace(/^["“]/, "").replace(/["”]\s*,?\s*$/, "").trim();
}
