import { ParseError } from "@one-resume/parser";
import { buildContent, checkContent } from "@one-resume/content";

export type CheckStatus = "ok" | "stale" | "error";

export interface CheckResult {
  status: CheckStatus;
  /** Top-level keys that differ from `current` (only when `stale`). */
  staleKeys?: string[];
  /** Present only when `error`. */
  error?: CheckError;
}

/**
 * A content build/check failure. Carries the parser's `sourceName`/`line` when
 * it wraps a `ParseError`, so callers can point at the offending markdown.
 *
 * `buildSiteContent` throws the parser's `ParseError` directly; `checkContent`
 * never throws and reports failures as a `ContentError` on its result instead.
 */
export class CheckError extends Error {
  sourceName?: string;
  line?: number;
  override cause?: unknown;

  constructor(
    message: string,
    opts: { sourceName?: string; line?: number; cause?: unknown } = {},
  ) {
    super(message);
    this.name = "ContentError";
    this.sourceName = opts.sourceName;
    this.line = opts.line;
    this.cause = opts.cause;
  }

  static fromError(e: unknown): CheckError {
    if (e instanceof CheckError) return e;
    if (e instanceof ParseError) {
      return new CheckError(e.message, {
        sourceName: e.sourceName,
        line: e.line,
        cause: e,
      });
    }
    return new CheckError(e instanceof Error ? e.message : String(e), {
      cause: e,
    });
  }
}

/**
 * Compare the content built from `cvMarkdown` (+ optional `projectsMarkdown`)
 * against `current` (the on-disk content.json text). `stale` means the committed
 * JSON is out of sync with the markdown + parser; `staleKeys` lists the
 * differing top-level keys.
 */
export function checkStringifiedContent(
  current: string,
  cvMarkdown: string,
  projectsMarkdown?: string,
): CheckResult {
  try {
    const built = buildContent({ cvMarkdown, projectsMarkdown });
    const onDisk = JSON.parse(current);
    const checkOutput = checkContent(built, onDisk);
    return {
      status: checkOutput.isStale ? "stale" : "ok",
      staleKeys: checkOutput.staleKeys,
    };
  } catch (e) {
    return {
      status: "error",
      error: CheckError.fromError(e),
    };
  }
}
