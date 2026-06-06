#!/usr/bin/env tsx
import { writeFileSync, mkdirSync, writeSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { ParseError } from "core-parser";
import { FileSystemSource, loadConfig, loadParsedCv } from "../src/index.ts";

interface CliArgs {
  input: string;
  out?: string;
}

/**
 * Synchronous write to stderr (fd 2).
 *
 * We can't use `process.stderr.write` here: when the process is launched
 * via npm/tsx the stderr stream is a pipe, not a TTY, so writes are
 * buffered and `process.exit` would discard them. `fs.writeSync` writes
 * synchronously regardless of stream type.
 */
function eprint(message: string): void {
  writeSync(2, message);
}

function printHelp(): void {
  eprint(
    [
      "Usage: core-parse <markdown-file> [--out <json-file>]",
      "",
      "Parses a CV markdown file (per core-parser/docs/CONTENT_CONTRACT.md)",
      "into ParsedCv JSON, reading the file through a FileSystemSource.",
      "A sibling <name>.meta.yaml sidecar (keywords) is merged when present.",
      "",
      "Exits with code 1 on parse error, 2 on usage error.",
      "",
    ].join("\n"),
  );
}

function parseArgs(argv: string[]): CliArgs {
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

async function main(): Promise<void> {
  const { input, out } = parseArgs(process.argv.slice(2));
  // Root the source at the cwd; absolute --input paths short-circuit. The
  // keyword sidecar is read relative to the markdown file by loadParsedCv.
  const source = new FileSystemSource(process.cwd(), loadConfig());

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

main();
