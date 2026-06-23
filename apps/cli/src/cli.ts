// The one-resume command dispatcher. Owns argv routing; each subcommand owns its
// own flags. Config is loaded per command that needs it (parse reads nothing
// from config).

import { PipelineConfig } from "./config.ts";
import { runParse } from "./commands/parse.ts";
import { runPdf } from "./commands/pdf.ts";
import { runDocx } from "./commands/docx.ts";

const USAGE = `one-resume <command> [options]

Commands:
  parse <md> [--out <json>] [--check <json>]     parse a CV markdown → ParsedCv JSON
  pdf   --input <md> [--template cv|projects] [--out f]
  pdf   --all
  docx  --input <md> [--template cv|projects] [--out f]
  docx  --all
`;

export async function main(argv: string[]): Promise<void> {
  const config = new PipelineConfig();
  const [cmd, ...rest] = argv;
  switch (cmd) {
    case "parse":
      await runParse(rest);
      return;
    case "pdf":
      await runPdf(config, rest);
      return;
    case "docx":
      await runDocx(config, rest);
      return;
    case undefined:
    case "-h":
    case "--help":
      process.stdout.write(USAGE);
      return;
    default:
      process.stderr.write(`Unknown command: ${cmd}\n\n${USAGE}`);
      process.exit(2);
  }
}
