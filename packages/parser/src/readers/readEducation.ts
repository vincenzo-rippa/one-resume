import type { Tokens } from "marked";
import type { Education } from "@one-resume/domain";
import type { TokenStream } from "../classes/TokenStream.ts";
import { plainText } from "../helpers/inline.ts";

/** The Education section: `## <label>` heading + bold `**Title @ Institution**` entries. */
export function readEducationSection(stream: TokenStream): {
  label: string;
  education: Education[];
} {
  stream.skipHorizontalRule();
  const label = plainText(stream.consumeHeading([2], "## Education").tokens);

  const entries: Education[] = [];
  while (true) {
    const next = stream.peekMeaningful();
    if (!next || next.type === "hr") break;
    if (next.type === "heading" && (next as Tokens.Heading).depth === 2) break;
    if (next.type !== "paragraph") {
      const token = stream.consumeMeaningful();
      throw stream.error(
        `unexpected token in education section: ${token.type}`,
        token,
      );
    }
    entries.push(readOneEducation(stream));
  }
  if (entries.length === 0) {
    throw stream.error("no education entries found");
  }
  return { label, education: entries };
}

function readOneEducation(stream: TokenStream): Education {
  const token = stream.consumeMeaningful() as Tokens.Paragraph;
  const tokens = token.tokens;
  if (!tokens || tokens.length === 0 || tokens[0].type !== "strong") {
    throw stream.error(
      "expected an education entry to start with a bold **Title** line",
      token,
    );
  }
  const { title, institution } = splitTitleInstitution(
    plainText((tokens[0] as Tokens.Strong).tokens),
  );

  // A subtitle may follow as: (a) trailing italic on the same line, (b) an
  // em-dash + plain text on the same line, or (c) the next italic paragraph.
  let subtitle = inlineSubtitle(tokens.slice(1));
  if (subtitle === undefined) {
    const italicPara = stream.consumeItalicParagraph();
    if (italicPara) subtitle = plainText(italicPara.tokens);
  }

  const entry: Education = { title };
  if (subtitle) entry.subtitle = subtitle;
  if (institution) entry.institution = institution;
  return entry;
}

/** Subtitle carried on the same line as the bold title (forms (a)/(b)). */
function inlineSubtitle(rest: Tokens.Generic[]): string | undefined {
  const meaningful = rest.filter(
    (t) => !(t.type === "text" && /^\s*$/.test((t as Tokens.Text).text)),
  );
  const first = meaningful[0];
  if (!first) return undefined;
  if (first.type === "em") return plainText((first as Tokens.Em).tokens);
  if (first.type === "text") {
    const raw = plainText([first]);
    const dash = raw.match(/^\s*[—–-]\s*(.+)$/);
    if (dash) return dash[1].trim();
    return raw.length > 0 ? raw : undefined;
  }
  return undefined;
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
