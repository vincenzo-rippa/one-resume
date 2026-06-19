import type { Tokens } from "marked";
import { TokenStream } from "../classes/TokenStream.ts";
import { plainText } from "../helpers/inline.ts";

/** The About section: a `## About` heading (label) + paragraphs up to the next heading. */
export function readAbout(stream: TokenStream): {
  label: string;
  paragraphs: string[];
} {
  const label = plainText(stream.consumeHeading([2], "## About").tokens);
  const paragraphs: string[] = [];
  while (true) {
    const next = stream.peekMeaningful();
    if (!next) throw stream.error("expected a section heading after About");
    if (next.type === "heading") break;
    const token = stream.consumeMeaningful();
    if (token.type !== "paragraph") {
      throw stream.error(`unexpected token in About: ${token.type}`, token);
    }
    paragraphs.push(plainText((token as Tokens.Paragraph).tokens));
  }
  return { label, paragraphs };
}

/** The technologies section: a heading (label) + a comma paragraph or a bullet list. */
export function readTechnologies(stream: TokenStream): {
  label: string;
  items: string[];
} {
  const label = plainText(
    stream.consumeHeading([2, 3], "a technologies heading (## or ###)").tokens,
  );
  const next = stream.consumeMeaningful();
  if (next.type === "list") {
    return {
      label,
      items: (next as Tokens.List).items.map((item) => plainText(item.tokens)),
    };
  }
  if (next.type === "paragraph") {
    return {
      label,
      items: plainText((next as Tokens.Paragraph).tokens)
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    };
  }
  throw stream.error(
    `expected a list or comma-separated paragraph for technologies, got ${next.type}`,
    next,
  );
}
