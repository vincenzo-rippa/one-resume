import type { Period } from "../types.ts";
import type Ctx from "../Ctx.ts";
import err from "./error.ts";

/**
 * Parses a "Start – End" date range into a Period.
 *
 * Accepts en-dash, em-dash, or hyphen (surrounded by spaces) as the separator.
 * `end` becomes the literal `"ongoing"` when the end text is Present/Presente.
 * Throws a ParseError when no separator is found.
 */
export function parsePeriod(text: string, ctx: Ctx, line?: number): Period {
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
  throw err(ctx, `unparseable date range "${text}"`, { line });
}
