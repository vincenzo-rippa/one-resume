// `one-resume parse <markdown-file> [--out <json-file>] [--check <json-file>]`
//
// Parses a CV markdown file into ParsedCv JSON. Without flags it prints to stdout
// or writes to --out. With --check it compares the fresh parse against an existing
// JSON and exits non-zero if they differ (the staleness check, CV-only).

import { writeFileSync, mkdirSync, writeSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { parseFrom, ParseError } from "@one-resume/parser";
import { FsDocumentSource } from "../lib/source.ts";

/**
 * Synchronous write to stderr (fd 2). When launched via npm/tsx the stderr
 * stream is a pipe, not a TTY, so `process.stderr.write` is buffered and
 * `process.exit` would discard it; `fs.writeSync` writes regardless.
 */
function eprint(message: string): void {
  writeSync(2, message);
}

function printHelp(): void {
  eprint(
    [
      "Usage: one-resume parse <markdown-file> [--out <json-file>] [--check <json-file>]",
      "",
      "Parses a CV markdown file (per packages/parser/docs/CONTENT_CONTRACT.md)",
      "into ParsedCv JSON. Prints to stdout, or writes to --out.",
      "",
      "With --check <json-file>, compares the fresh parse against an existing JSON",
      "and exits 1 if it is stale (listing the differing top-level keys) instead of",
      "printing.",
      "",
      "Exits with code 1 on parse error or staleness, 2 on usage error.",
      "",
    ].join("\n"),
  );
}

interface ParseArgs {
  input: string;
  out?: string;
  check?: string;
}

function parseArgs(argv: string[]): ParseArgs {
  const positional: string[] = [];
  let out: string | undefined;
  let check: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out" || a === "-o") {
      out = argv[++i];
    } else if (a.startsWith("--out=")) {
      out = a.slice("--out=".length);
    } else if (a === "--check") {
      check = argv[++i];
    } else if (a.startsWith("--check=")) {
      check = a.slice("--check=".length);
    } else if (a === "-h" || a === "--help") {
      printHelp();
      process.exit(0);
    } else {
      positional.push(a);
    }
  }
  if (positional.length !== 1) {
    printHelp();
    process.exit(2);
  }
  return { input: positional[0], out, check };
}

/**
 * The top-level keys where a freshly-parsed doc differs from an existing JSON —
 * the comparison behind `parse --check`. `[]` means up to date; a key present in
 * `fresh` but absent from `existing` counts as differing.
 */
export function staleKeys(
  fresh: object,
  existing: Record<string, unknown>,
): string[] {
  const f = fresh as Record<string, unknown>;
  return Object.keys(f).filter((k) => !isDeepStrictEqual(f[k], existing[k]));
}

/**
 * Compare a freshly-parsed CV against an existing JSON file, exiting 1 when
 * stale (or the file is missing). Lists the differing top-level keys.
 */
function checkAgainst(input: string, parsed: object, checkPath: string): void {
  let existingText: string;
  try {
    existingText = readFileSync(resolve(checkPath), "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      eprint(`✗ ${checkPath} not found — nothing to check against\n`);
      process.exit(1);
    }
    throw e;
  }
  const existing = JSON.parse(existingText) as Record<string, unknown>;
  const keys = staleKeys(parsed, existing);
  if (keys.length === 0) {
    process.stdout.write(`✓ ${input} matches ${checkPath}\n`);
  } else {
    eprint(
      `✗ ${input} is STALE vs ${checkPath} (differs in: ${keys.join(", ")})\n`,
    );
    process.exit(1);
  }
}

export async function runParse(args: string[]): Promise<void> {
  const opts = parseArgs(args);
  // Read against the cwd (absolute paths short-circuit inside the source).
  const source = new FsDocumentSource(process.cwd());

  try {
    const parsed = await parseFrom(source, opts.input, "cv");
    if (opts.check !== undefined) {
      checkAgainst(opts.input, parsed, opts.check);
      return;
    }
    const json = JSON.stringify(parsed, null, 2);
    if (opts.out) {
      mkdirSync(dirname(resolve(opts.out)), { recursive: true });
      writeFileSync(opts.out, json + "\n", "utf8");
    } else {
      process.stdout.write(json + "\n");
    }
  } catch (e) {
    if (e instanceof ParseError) {
      eprint(`Parse error: ${e.message}\n`);
      process.exit(1);
    }
    throw e;
  }
}
