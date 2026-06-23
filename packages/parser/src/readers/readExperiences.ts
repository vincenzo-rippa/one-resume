import type { Tokens } from "marked";
import type { Experience, Period } from "@one-resume/domain";
import type { TokenStream } from "../classes/TokenStream.ts";
import { plainText } from "../helpers/inline.ts";
import { parsePeriod, splitOnDash } from "../helpers/period.ts";

/** The Experience section: `## <label>` heading + `### Company — Role` entries. */
export function readExperienceSection(stream: TokenStream): {
  label: string;
  experiences: Experience[];
} {
  stream.skipHorizontalRule();
  const label = plainText(stream.consumeHeading([2], "## Experience").tokens);

  const experiences: Experience[] = [];
  while (true) {
    const next = stream.peekMeaningful();
    if (!next || next.type === "hr") break;
    if (next.type === "heading" && (next as Tokens.Heading).depth === 2) break;
    experiences.push(readOneExperience(stream));
  }
  if (experiences.length === 0) {
    throw stream.error("no experience entries found");
  }
  return { label, experiences };
}

function readOneExperience(stream: TokenStream): Experience {
  const headingText = plainText(
    stream.consumeHeading([3], "### Company — Role").tokens,
  );
  const pair = splitOnDash(headingText);
  if (!pair) {
    throw stream.error(
      `expected '<Company> — <Role>' in the experience heading, got "${headingText}"`,
    );
  }
  const [company, role] = pair;

  const meta = stream.consumeItalicParagraph();
  if (!meta) {
    throw stream.error(
      "expected an italic `Location | Date range` line after the experience heading",
    );
  }
  const { location, period } = parseLocationAndPeriod(
    plainText(meta.tokens),
    stream,
  );

  const listToken = stream.consumeMeaningful();
  if (listToken.type !== "list") {
    throw stream.error(
      "expected a bullet list with the experience description",
      listToken,
    );
  }
  const description = (listToken as Tokens.List).items.map((item) =>
    plainText(item.tokens),
  );

  return { company, role, location, period, description };
}

function parseLocationAndPeriod(
  text: string,
  stream: TokenStream,
): { location?: string; period: Period } {
  const pipeIdx = text.indexOf("|");
  if (pipeIdx < 0) {
    throw stream.error(
      `expected '<Location> | <Date range>' on the italic line, got "${text}"`,
    );
  }
  const location = text.slice(0, pipeIdx).trim() || undefined;
  const period = parsePeriod(text.slice(pipeIdx + 1).trim());
  if (!period) throw stream.error(`unparseable date range in "${text}"`);
  return { location, period };
}
