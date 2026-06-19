// `one-resume parse <markdown-file> [--out <json-file>]`
//
// Parses a CV markdown file into ParsedCv JSON, printing to stdout or writing
// to --out. Folds in the former `core-parse` bin.

import { writeFileSync, mkdirSync, writeSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { ParseError } from "@one-resume/parser";
import { FsContentSource } from "../source.ts";
import { loadParsedCv } from "../loaders.ts";

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
      "Usage: one-resume parse <markdown-file> [--out <json-file>]",
      "",
      "Parses a CV markdown file (per packages/parser/docs/CONTENT_CONTRACT.md)",
      "into ParsedCv JSON. Prints to stdout, or writes to --out.",
      "",
      "Exits with code 1 on parse error, 2 on usage error.",
      "",
    ].join("\n"),
  );
}

interface ParseArgs {
  input: string;
  out?: string;
}

function parseArgs(argv: string[]): ParseArgs {
  const positional: string[] = [];
  let out: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out" || a === "-o") {
      out = argv[++i];
    } else if (a.startsWith("--out=")) {
      out = a.slice("--out=".length);
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
  return { input: positional[0], out };
}

export async function runParse(args: string[]): Promise<void> {
  const { input, out } = parseArgs(args);
  // Read against the cwd (absolute paths short-circuit inside the source).
  const source = new FsContentSource(process.cwd());

  try {
    const parsed = await loadParsedCv(source, input);
    const json = JSON.stringify(parsed, null, 2);
    if (out) {
      mkdirSync(dirname(resolve(out)), { recursive: true });
      writeFileSync(out, json + "\n", "utf8");
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
