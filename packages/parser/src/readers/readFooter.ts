import type { Tokens } from "marked";
import { TokenStream } from "../classes/TokenStream.ts";
import { plainText } from "../helpers/inline.ts";

/**
 * The footer: the final quoted paragraph (e.g. the GDPR notice). Wrapping
 * straight/curly quotes and an optional trailing comma are stripped.
 */
export function readFooter(stream: TokenStream): string {
  stream.skipHorizontalRule();
  const next = stream.peekMeaningful();
  if (!next) {
    throw stream.error("expected a footer paragraph after the sections");
  }
  if (next.type !== "paragraph") {
    throw stream.error(
      `expected a footer paragraph after the sections, got ${next.type}`,
      next,
    );
  }
  const token = stream.consumeMeaningful() as Tokens.Paragraph;
  return plainText(token.tokens)
    .replace(/^["“]/, "")
    .replace(/["”]\s*,?\s*$/, "")
    .trim();
}
