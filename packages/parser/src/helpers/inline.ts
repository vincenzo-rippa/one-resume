import type { Token, Tokens } from "marked";
import { normalizeText } from "./normalize.ts";

// ───────────────────────────────────────────────────────────────────────────
// Inline rendering — strips markdown formatting (bold/italic/links/code/breaks)
// to plain text, preserving inline characters and collapsing soft line breaks
// to spaces.
// ───────────────────────────────────────────────────────────────────────────
export function inlineToPlain(tokens: Token[] | undefined): string {
  if (!tokens) return "";
  let out = "";
  for (const token of tokens) {
    out += renderInline(token);
  }
  return normalizeText(out, true).replace(/\s+/g, " ");
}

/** Inline tokens → trimmed plain text. The common reader pattern. */
export function plainText(tokens: Token[] | undefined): string {
  return normalizeText(inlineToPlain(tokens));
}

function renderInline(token: Token): string {
  switch (token.type) {
    case "text": {
      const t = token as Tokens.Text;
      if (t.tokens && t.tokens.length > 0) {
        return inlineToPlain(t.tokens);
      }
      return decodeHtmlEntities(t.text);
    }
    case "escape":
      return (token as Tokens.Escape).text;
    case "strong":
      return inlineToPlain((token as Tokens.Strong).tokens);
    case "em":
      return inlineToPlain((token as Tokens.Em).tokens);
    case "codespan":
      return (token as Tokens.Codespan).text;
    case "del":
      return inlineToPlain((token as Tokens.Del).tokens);
    case "link":
      return inlineToPlain((token as Tokens.Link).tokens);
    case "image":
      return (token as Tokens.Image).text ?? "";
    case "br":
      return " ";
    case "html":
      // Strip inline HTML tags entirely.
      return "";
    default:
      // Best-effort: if the token has a `tokens` array, recurse; else its `text`.
      const anyToken = token as {
        tokens?: Token[];
        text?: string;
        raw?: string;
      };
      if (anyToken.tokens) return inlineToPlain(anyToken.tokens);
      if (typeof anyToken.text === "string") return anyToken.text;
      return "";
  }
}
const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};
function decodeHtmlEntities(s: string): string {
  return s.replace(/&[a-zA-Z#0-9]+;/g, (m) => HTML_ENTITIES[m] ?? m);
}
