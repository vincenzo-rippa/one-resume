import type { Tokens } from "marked";
import { isItalicOnlyParagraph, tokenLine } from "../helpers/internals.ts";
import err from "../helpers/error";
import { normalizeText } from "../helpers/normalize.ts";
import { inlineToPlain } from "../helpers/inlineRendering.ts";
import TokenStream from "../classes/TokenStream.ts";
import type { Education } from "../types.ts";

export default function readEducation(stream: TokenStream): Education[] {
  const entries: Education[] = [];
  while (true) {
    const next = stream.peekMeaningful();
    if (!next) break;
    if (next.type === "heading" && (next as Tokens.Heading).depth === 2) break;
    if (next.type === "hr") break;
    if (next.type !== "paragraph") {
      const token = stream.consumeMeaningful();
      throw err(
        stream.ctxRef(),
        `unexpected token in education section: ${token.type}`,
        { line: tokenLine(token, stream.ctxRef().source) },
      );
    }
    entries.push(readOneEducation(stream));
  }
  if (entries.length === 0) {
    throw err(stream.ctxRef(), "no education entries found");
  }
  return entries;
}
function readOneEducation(stream: TokenStream): Education {
  const token = stream.consumeMeaningful() as Tokens.Paragraph;
  const tokens = token.tokens;
  if (!tokens || tokens.length === 0 || tokens[0].type !== "strong") {
    throw err(
      stream.ctxRef(),
      "expected education entry to start with bold **Title** line",
      { line: tokenLine(token, stream.ctxRef().source) },
    );
  }
  const boldText = normalizeText(
    inlineToPlain((tokens[0] as Tokens.Strong).tokens),
  );
  const { title, institution } = splitTitleInstitution(boldText);

  // After the bold, there may be a subtitle in one of three forms:
  //   (a) trailing italic on same line:    **bold** _subtitle_
  //   (b) em-dash + plain text inline:     **bold** — subtitle
  //   (c) italic on the next paragraph (handled below as separate paragraph)
  let subtitle: string | undefined;

  // Inspect inline tokens after the strong.
  const rest = tokens.slice(1);
  if (rest.length > 0) {
    // Trim leading whitespace text tokens, look at next.
    const meaningful = rest.filter(
      (t) => !(t.type === "text" && /^\s*$/.test((t as Tokens.Text).text)),
    );
    if (meaningful.length > 0) {
      const first = meaningful[0];
      if (first.type === "em") {
        subtitle = normalizeText(inlineToPlain((first as Tokens.Em).tokens));
      } else if (first.type === "text") {
        const raw = normalizeText(inlineToPlain([first]));
        // Form (b): leading " — text" / " – text" / " - text"
        const m = raw.match(/^[\s]*[—–-]\s*(.+)$/);
        if (m) subtitle = normalizeText(m[1]);
        // Else: text continuation, treat as subtitle plain text if non-empty.
        else if (raw.length > 0) subtitle = raw;
      }
    }
  }

  // Form (c): the next paragraph (if it's italic-only) is the subtitle.
  if (subtitle === undefined) {
    const next = stream.peekMeaningful();
    if (next && isItalicOnlyParagraph(next)) {
      const italicPara = stream.consumeMeaningful() as Tokens.Paragraph;
      subtitle = normalizeText(
        inlineToPlain((italicPara.tokens[0] as Tokens.Em).tokens),
      );
    }
  }

  const entry: Education = { title };
  if (subtitle) entry.subtitle = subtitle;
  if (institution) entry.institution = institution;
  return entry;
}
function splitTitleInstitution(boldText: string): {
  title: string;
  institution?: string;
} {
  const atIdx = boldText.indexOf("@");
  if (atIdx < 0) return { title: boldText.trim() };
  return {
    title: boldText.slice(0, atIdx).trim(),
    institution: boldText.slice(atIdx + 1).trim(),
  };
}
