import type { Tokens, Token } from "marked";
import { isItalicOnlyParagraph, tokenLine } from "../helpers/internals.ts";
import err from "../helpers/error";
import { normalizeText } from "../helpers/normalize.ts";
import { inlineToPlain } from "../helpers/inlineRendering.ts";
import { parsePeriod } from "../helpers/period.ts";
import TokenStream from "../classes/TokenStream.ts";
import type { Experience, Period } from "../types.ts";

export default function readExperiences(stream: TokenStream): Experience[] {
  const experiences: Experience[] = [];
  while (true) {
    const next = stream.peekMeaningful();
    if (!next) break;
    if (next.type === "hr") break;
    if (next.type === "heading" && (next as Tokens.Heading).depth === 2) break;
    experiences.push(readOneExperience(stream));
  }
  if (experiences.length === 0) {
    throw err(stream.ctxRef(), "no experience entries found");
  }
  return experiences;
}
function readOneExperience(stream: TokenStream): Experience {
  const heading = stream.consumeMeaningful();
  if (heading.type !== "heading" || (heading as Tokens.Heading).depth !== 3) {
    throw err(
      stream.ctxRef(),
      `expected ### Company — Role heading, got ${heading.type}`,
      {
        line: tokenLine(heading, stream.ctxRef().source),
      },
    );
  }
  const headingText = normalizeText(
    inlineToPlain((heading as Tokens.Heading).tokens),
  );
  const { company, role } = splitCompanyRole(headingText, stream, heading);

  const metaToken = stream.consumeMeaningful();
  if (!isItalicOnlyParagraph(metaToken)) {
    throw err(
      stream.ctxRef(),
      "expected italic line with `Location | Date range` after experience heading",
      { line: tokenLine(metaToken, stream.ctxRef().source) },
    );
  }
  const metaText = normalizeText(
    inlineToPlain(
      ((metaToken as Tokens.Paragraph).tokens[0] as Tokens.Em).tokens,
    ),
  );
  const { location, period } = parseLocationAndPeriod(
    metaText,
    stream,
    metaToken,
  );

  const listToken = stream.consumeMeaningful();
  if (listToken.type !== "list") {
    throw err(
      stream.ctxRef(),
      "expected bullet list with experience description",
      { line: tokenLine(listToken, stream.ctxRef().source) },
    );
  }
  const description = (listToken as Tokens.List).items.map((item) =>
    normalizeText(inlineToPlain(item.tokens)),
  );

  return { company, role, location, period, description };
}
function splitCompanyRole(
  text: string,
  stream: TokenStream,
  origin: Token,
): { company: string; role: string } {
  // Accept en-dash (–), em-dash (—), or hyphen as separator.
  const separators = [" — ", " – ", " - "];
  for (const sep of separators) {
    const idx = text.indexOf(sep);
    if (idx >= 0) {
      return {
        company: text.slice(0, idx).trim(),
        role: text.slice(idx + sep.length).trim(),
      };
    }
  }
  throw err(
    stream.ctxRef(),
    `expected '<Company> — <Role>' in experience heading, got "${text}"`,
    { line: tokenLine(origin, stream.ctxRef().source) },
  );
}
function parseLocationAndPeriod(
  text: string,
  stream: TokenStream,
  origin: Token,
): { location?: string; period: Period } {
  const pipeIdx = text.indexOf("|");
  if (pipeIdx < 0) {
    throw err(
      stream.ctxRef(),
      `expected '<Location> | <Date range>' on italic line, got "${text}"`,
      { line: tokenLine(origin, stream.ctxRef().source) },
    );
  }
  const location = text.slice(0, pipeIdx).trim() || undefined;
  const dateRange = text.slice(pipeIdx + 1).trim();
  const period = parsePeriod(
    dateRange,
    stream.ctxRef(),
    tokenLine(origin, stream.ctxRef().source),
  );
  return { location, period };
}
