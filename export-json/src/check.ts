// Staleness guard for the committed site content.json.
//
// This used to live as a deep-equal assertion inside the parser's test suite,
// coupling those tests to the sibling content + site repos. It really belongs
// here: it validates the EXPORT artifact, not the parser. Made a first-class
// operation (the `prettier --check` pattern), it's useful to run while building
// the site repo, not just in CI.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import type { SourceResolver } from "core-parser/source";
import { buildContent, type Target } from "./content.ts";

export type CheckStatus = "ok" | "stale" | "missing";

export interface CheckResult {
  /** The target's output path, relative to the locales dir. */
  out: string;
  status: CheckStatus;
  /** Top-level keys that differ from the on-disk JSON (only when `stale`). */
  staleKeys?: string[];
}

/**
 * Compare the content this exporter WOULD write for `target` against the JSON
 * currently at `localesDir/target.out`, without writing anything. `stale` means
 * the committed site content.json is out of sync with the markdown + parser.
 */
export async function checkContent(
  source: SourceResolver,
  target: Target,
  localesDir: string,
): Promise<CheckResult> {
  const built = (await buildContent(source, target)) as Record<string, unknown>;
  const outPath = resolve(localesDir, target.out);
  if (!existsSync(outPath)) return { out: target.out, status: "missing" };

  const onDisk = JSON.parse(readFileSync(outPath, "utf8")) as Record<
    string,
    unknown
  >;
  const staleKeys = Object.keys(built).filter(
    (k) => !isDeepStrictEqual(built[k], onDisk[k]),
  );
  return staleKeys.length === 0
    ? { out: target.out, status: "ok" }
    : { out: target.out, status: "stale", staleKeys };
}
