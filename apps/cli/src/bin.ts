#!/usr/bin/env -S tsx
import { main } from "./cli.ts";

main(process.argv.slice(2)).catch((err) => {
  console.error(err);
  process.exit(1);
});
