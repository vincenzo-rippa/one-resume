// The one-resume command dispatcher. Owns argv routing; each subcommand owns its
// own flags. Config is loaded per command that needs it (parse reads nothing
// from config).

import { PipelineConfig } from "./config.ts";
import { runParse } from "./commands/parse.ts";
import { runPdf } from "./commands/pdf.ts";
import { runDocx } from "./commands/docx.ts";
import { runSync, runCheck } from "./commands/sync.ts";
import { runSpecial } from "./commands/special.ts";

const USAGE = `one-resume <command> [options]

Commands:
  parse <md> [--out <json>]                      parse a CV markdown → ParsedCv JSON
  pdf   --input <md> [--template main|projects|freelance] [--out f]
  pdf   --public | --all
  docx  --input <md> [--template main|freelance|projects] [--out f]
  docx  --all
  sync  [--dry-run]                              write per-language content.json
  check                                          fail if a content.json is stale
  special                                        private Italian CV (sidecar + photo)
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
    case "sync":
      await runSync(config, rest);
      return;
    case "check":
      await runCheck(config);
      return;
    case "special":
      await runSpecial(config);
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
