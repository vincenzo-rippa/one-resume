import type { Tokens } from "marked";
import type { Contact, Location } from "@one-resume/domain";
import type { TokenStream } from "../classes/TokenStream.ts";
import { plainText } from "../helpers/inline.ts";

export interface HeaderBlock {
  location: Location;
  contacts: Contact[];
}

/** The name (H1, first line). */
export function readName(stream: TokenStream): string {
  return plainText(
    stream.consumeHeading([1], "an H1 name as the first line").tokens,
  );
}

/**
 * The header block: the paragraphs between the name and the headline H2, in any
 * order. One line is the location (`Based · Availability`); every other line is
 * a contact line whose `·`-separated segments are captured verbatim and in
 * order. A `Label: value` segment keeps its label; a bare segment (e.g. an
 * email) has an empty label. No service is special-cased — the markdown is the
 * source of every label.
 */
export function readHeader(stream: TokenStream): HeaderBlock {
  let location: Location | undefined;
  const contacts: Contact[] = [];

  for (const paragraph of readHeaderParagraphs(stream)) {
    if (!location && isLocationLine(paragraph)) {
      location = parseLocation(paragraph);
    } else {
      contacts.push(...parseContacts(paragraph));
    }
  }

  if (!location) {
    throw stream.error(
      "header is missing a location line (`City · Availability`)",
    );
  }
  if (contacts.length === 0) {
    throw stream.error(
      "header is missing a contacts line (`email · Label: value`)",
    );
  }
  return { location, contacts };
}

/** The headline (the first H2 after the header). */
export function readHeadline(stream: TokenStream): string {
  return plainText(stream.consumeHeading([2], "a ## headline").tokens);
}

/** Zero, one, or two italic taglines after the headline (long, then short). */
export function readTaglines(stream: TokenStream): {
  tagline: string;
  taglineShort: string;
} {
  const lines: string[] = [];
  let para = stream.consumeItalicParagraph();
  while (para) {
    lines.push(plainText(para.tokens));
    para = stream.consumeItalicParagraph();
  }
  return { tagline: lines[0] ?? "", taglineShort: lines[1] ?? "" };
}

// ─── Header-line capture ──────────────────────────────────────────────────────

const SEGMENT_SEPARATOR = "·";
// A `Label: value` segment: a label, then a colon FOLLOWED BY WHITESPACE. The
// trailing space is what separates a label from a URL scheme — `https://…` has
// no space after its colon, so it is captured as a bare value.
const LABELLED = /^(.+?):\s+(.+)$/;

/** Collect the paragraphs between the name and the headline H2. */
function readHeaderParagraphs(stream: TokenStream): string[] {
  const paragraphs: string[] = [];
  while (true) {
    const next = stream.peekMeaningful();
    if (!next) throw stream.error("expected a ## headline after the header");
    if (next.type === "heading" && (next as Tokens.Heading).depth === 2) break;
    const token = stream.consumeMeaningful();
    if (token.type !== "paragraph") {
      throw stream.error(
        `unexpected token in header block: ${token.type}`,
        token,
      );
    }
    paragraphs.push(plainText((token as Tokens.Paragraph).tokens));
  }
  return paragraphs;
}

/** The location line: has the separator, no email, and no `Label: ` segment. */
function isLocationLine(text: string): boolean {
  return (
    text.includes(SEGMENT_SEPARATOR) &&
    !text.includes("@") &&
    !LABELLED.test(text)
  );
}

function parseLocation(text: string): Location {
  const idx = text.indexOf(SEGMENT_SEPARATOR);
  return {
    based: text.slice(0, idx).trim(),
    availability: text.slice(idx + SEGMENT_SEPARATOR.length).trim(),
  };
}

/** Split a contact line into ordered segments, each captured verbatim. */
function parseContacts(text: string): Contact[] {
  return text
    .split(SEGMENT_SEPARATOR)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .map(toContact);
}

function toContact(segment: string): Contact {
  const m = segment.match(LABELLED);
  return m
    ? { label: m[1].trim(), value: m[2].trim() }
    : { label: "", value: segment };
}
