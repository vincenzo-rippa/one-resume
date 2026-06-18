#!/usr/bin/env -S tsx
import { main } from "./cli.ts";

main(process.argv.slice(2)).catch((err) => {
  // Message-only by default — a clean one-liner for expected failures (missing
  // file, parse error). Set DEBUG=1 for the full stack.
  if (process.env.DEBUG) {
    console.error(err);
  } else {
    console.error(`\n${err instanceof Error ? err.message : String(err)}`);
  }
  process.exit(1);
});
