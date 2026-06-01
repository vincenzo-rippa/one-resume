import type { Token, Tokens } from "marked";

// ───────────────────────────────────────────────────────────────────────────
// Internals
// ───────────────────────────────────────────────────────────────────────────

export function isSkippable(token: Token | undefined): boolean {
  if (!token) return false;
  if (token.type === "space") return true;
  if (token.type === "html") {
    // HTML comments are skippable; other raw HTML is unexpected.
    const raw = (token as Tokens.HTML).raw ?? "";
    return /^\s*<!--[\s\S]*-->\s*$/.test(raw);
  }
  return false;
}

export function tokenLine(
  token: Token | undefined,
  source: string,
): number | undefined {
  if (!token) return undefined;
  // Marked doesn't track line numbers directly; locate by raw text.
  const raw = (token as { raw?: string }).raw;
  if (!raw) return undefined;
  const idx = source.indexOf(raw);
  if (idx < 0) return undefined;
  return source.slice(0, idx).split("\n").length;
}

export function isItalicOnlyParagraph(token: Token): boolean {
  if (token.type !== "paragraph") return false;
  const para = token as Tokens.Paragraph;
  if (!para.tokens || para.tokens.length !== 1) return false;
  return para.tokens[0].type === "em";
}
