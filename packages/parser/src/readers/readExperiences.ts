import type { Tokens, Token } from "marked";
import { normalizeText } from "../helpers/normalize.ts";
import { inlineToPlain } from "../helpers/inlineRendering.ts";
import { parsePeriod } from "../helpers/period.ts";
import TokenStream from "../classes/TokenStream.ts";
import type { Experience, Period } from "@one-resume/types";

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
    throw stream.error("no experience entries found");
  }
  return experiences;
}
function readOneExperience(stream: TokenStream): Experience {
  const heading = stream.consumeMeaningful();
  if (heading.type !== "heading" || (heading as Tokens.Heading).depth !== 3) {
    throw stream.error(
      `expected ### Company — Role heading, got ${heading.type}`,
      heading,
    );
  }
  const headingText = normalizeText(
    inlineToPlain((heading as Tokens.Heading).tokens),
  );
  const { company, role } = splitCompanyRole(headingText, stream, heading);

  const metaToken = stream.consumedMeaningful_IsItalicOnlyParagraph();
  if (!metaToken) {
    throw stream.error(
      "expected italic line with `Location | Date range` after experience heading",
      metaToken,
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
    throw stream.error(
      "expected bullet list with experience description",
      listToken,
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
  throw stream.error(
    `expected '<Company> — <Role>' in experience heading, got "${text}"`,
    origin,
  );
}
function parseLocationAndPeriod(
  text: string,
  stream: TokenStream,
  origin: Token,
): { location?: string; period: Period } {
  const pipeIdx = text.indexOf("|");
  if (pipeIdx < 0) {
    throw stream.error(
      `expected '<Location> | <Date range>' on italic line, got "${text}"`,
      origin,
    );
  }
  const location = text.slice(0, pipeIdx).trim() || undefined;
  const dateRange = text.slice(pipeIdx + 1).trim();
  const period = parsePeriod(dateRange);
  if (!period) {
    throw stream.error(`unparseable date range "${dateRange}"`, origin);
  }
  return { location, period };
}
