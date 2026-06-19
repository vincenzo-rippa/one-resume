import type { Period } from "@one-resume/domain";

/** En-dash, em-dash, or hyphen (space-surrounded) — the range/pair separators. */
const DASH_SEPARATORS = [" – ", " — ", " - "];

/**
 * Split text on the first dash separator into a trimmed `[left, right]` pair, or
 * `undefined` when none is present. Shared by date ranges and `Company — Role`.
 */
export function splitOnDash(text: string): [string, string] | undefined {
  for (const sep of DASH_SEPARATORS) {
    const idx = text.indexOf(sep);
    if (idx >= 0) {
      return [text.slice(0, idx).trim(), text.slice(idx + sep.length).trim()];
    }
  }
  return undefined;
}

/**
 * Parse a "Start – End" date range into a Period. `end` is kept verbatim — a
 * current role is whatever word the author wrote ("Present", "Presente",
 * "Présent", …), rendered as-is. Returns `null` when no separator is found.
 */
export function parsePeriod(text: string): Period | null {
  const parts = splitOnDash(text);
  return parts ? { start: parts[0], end: parts[1] } : null;
}
