import type { Period } from "@one-resume/types";

/**
 * Parses a "Start – End" date range into a Period.
 *
 * Accepts en-dash, em-dash, or hyphen (surrounded by spaces) as the separator.
 * `end` becomes the literal `"ongoing"` when the end text is Present/Presente.
 * Returns `null` when no separator is found — the caller raises a ParseError
 * through its TokenStream so the error carries the source label and line.
 */
export function parsePeriod(text: string): Period | null {
  const separators = [" – ", " — ", " - "];
  for (const sep of separators) {
    const idx = text.indexOf(sep);
    if (idx >= 0) {
      const start = text.slice(0, idx).trim();
      const endRaw = text.slice(idx + sep.length).trim();
      const end = /^(present|presente)$/i.test(endRaw) ? "ongoing" : endRaw;
      return { start, end };
    }
  }
  return null;
}
