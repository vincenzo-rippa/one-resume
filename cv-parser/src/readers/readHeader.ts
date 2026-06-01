import type { Tokens } from "marked";
import { isSkippable, tokenLine } from "../helpers/internals.ts";
import err from "../helpers/error";
import { normalizeText } from "../helpers/normalize.ts";
import { inlineToPlain } from "../helpers/inlineRendering.ts";
import TokenStream from "../classes/TokenStream.ts";

interface HeaderBlock {
  location: { based: string; availability: string };
  contacts: Record<string, string>;
  portfolio: string;
}
export default function readHeader(stream: TokenStream): HeaderBlock {
  // Consume all paragraphs up to but not including the first H2.
  const paragraphs: string[] = [];
  while (true) {
    const next = stream.peekMeaningful();
    if (!next) {
      throw err(stream.ctxRef(), "expected ## headline after header block");
    }
    if (next.type === "heading" && (next as Tokens.Heading).depth === 2) break;
    const token = stream.consumeMeaningful();
    if (token.type === "paragraph") {
      const text = inlineToPlain((token as Tokens.Paragraph).tokens);
      paragraphs.push(normalizeText(text));
    } else if (isSkippable(token)) {
      // already consumed
    } else {
      throw err(
        stream.ctxRef(),
        `unexpected token in header block: ${token.type}`,
        { line: tokenLine(token, stream.ctxRef().source) },
      );
    }
  }

  let location: { based: string; availability: string } | undefined;
  let contacts: Record<string, string> = {};
  let portfolio = "";

  for (const p of paragraphs) {
    if (looksLikeLocationLine(p) && !location) {
      location = parseLocation(p);
      continue;
    }
    if (looksLikeContactsLine(p)) {
      const result = parseContactsLine(p);
      // Merge: already-set keys (from earlier paragraphs) win, preserving
      // first-seen order. New keys from this paragraph are appended.
      contacts = { ...result.contacts, ...contacts };
      if (result.portfolio && !portfolio) portfolio = result.portfolio;
      continue;
    }
    if (looksLikePortfolioLine(p)) {
      portfolio = extractPortfolioValue(p);
      continue;
    }
    // Otherwise: ignore. (Could be an extra hint paragraph.)
  }

  if (!location) {
    throw err(
      stream.ctxRef(),
      "header is missing location line (expected `City · Availability`)",
    );
  }
  if (Object.keys(contacts).length === 0) {
    throw err(
      stream.ctxRef(),
      "header is missing contacts line (expected `email · LinkedIn: url`)",
    );
  }

  return { location, contacts, portfolio };
}
function looksLikeLocationLine(text: string): boolean {
  // Location: contains ` · ` and no `@` (no email) and doesn't start with "Portfolio".
  if (/@/.test(text)) return false;
  if (/^Portfolio\b/i.test(text)) return false;
  return /\s·\s/.test(text);
}
function looksLikeContactsLine(text: string): boolean {
  return /@/.test(text);
}
function looksLikePortfolioLine(text: string): boolean {
  return /^Portfolio[\s·:]/i.test(text);
}
function parseLocation(text: string): { based: string; availability: string } {
  const idx = text.indexOf("·");
  const based = text.slice(0, idx).trim();
  const availability = text.slice(idx + 1).trim();
  return { based, availability };
}
interface ContactsParseResult {
  contacts: Record<string, string>;
  portfolio?: string;
}
function parseContactsLine(text: string): ContactsParseResult {
  const contacts: Record<string, string> = {};
  let portfolio: string | undefined;

  // Email: first email-shaped token. (Labels/ariaLabels come from sidecar.)
  const emailMatch = text.match(/[^\s·]+@[^\s·]+\.[^\s·]+/);
  if (emailMatch) {
    contacts.email = `mailto:${emailMatch[0]}`;
  }

  // LinkedIn: `LinkedIn: <url>` (URL may or may not include scheme).
  const linkedinMatch = text.match(/LinkedIn[:\s]+([^\s·]+)/i);
  if (linkedinMatch) {
    const raw = linkedinMatch[1].replace(/[.,;]+$/, "");
    const url = raw.startsWith("http") ? raw : `https://${raw}`;
    contacts.linkedin = url;
  }

  // Portfolio inline (only when on the same paragraph as contacts):
  // matches "Portfolio · value" or "Portfolio: value".
  const portfolioMatch = text.match(
    /Portfolio[\s·:]+([^\s·]+(?:\s+[^\s·]+)*)/i,
  );
  if (portfolioMatch) {
    portfolio = portfolioMatch[1].trim();
  }

  return { contacts, portfolio };
}
function extractPortfolioValue(text: string): string {
  // "Portfolio · value" or "Portfolio: value"
  const m = text.match(/^Portfolio[\s·:]+(.+)$/i);
  return m ? m[1].trim() : "";
}
