// Staleness guard for the committed site content.json.
//
// Compares the content this exporter WOULD build against the current on-disk
// JSON, **structurally** (parse both, deep-equal per top-level key), so
// reformatting noise never reads as stale. Never throws — bad markdown or an
// invalid `current` JSON is reported as `status:"error"` with a `ContentError`.

import { isDeepStrictEqual } from "node:util";
import { type ContentOutput } from "./build.ts";

export interface CheckOutput {
  isStale: boolean;
  /** Top-level keys that differ from `current` (only when `stale`). */
  staleKeys?: string[];
}

/**
 * Compare the content built from `cvMarkdown` (+ optional `projectsMarkdown`)
 * against `current` (the on-disk content.json text). `stale` means the committed
 * JSON is out of sync with the markdown + parser; `staleKeys` lists the
 * differing top-level keys.
 */
export function checkContent(a: ContentOutput, b: ContentOutput): CheckOutput {
  const staleKeys = Object.keys(a).filter(
    (key) =>
      !isDeepStrictEqual(
        a[key as keyof ContentOutput],
        b[key as keyof ContentOutput],
      ),
  );
  return staleKeys.length === 0
    ? { isStale: false }
    : { isStale: true, staleKeys };
}
