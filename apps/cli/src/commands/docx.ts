// `one-resume docx` — ATS DOCX via @one-resume/docx (byte-returning; the app
// writes the bytes).
//
//   one-resume docx --input <md> [--template cv|projects] [--out out.docx]
//   one-resume docx --all       (every markdown under CONTENT_DIR → <out>/ats)

import { basename, resolve } from "node:path";
import { renderDocx } from "@one-resume/docx";
import type { PipelineConfig } from "../config.ts";
import { FsDocumentSource } from "../source.ts";
import { parseFrom } from "@one-resume/parser";
import { listMarkdown, write } from "../io.ts";
import { defaultDocxOut, resolveKind } from "../targets.ts";
import { getFlag, has } from "../args.ts";

async function buildOne(
  source: FsDocumentSource,
  config: PipelineConfig,
  atsRoot: string,
  opts: { input: string; templateFlag?: string; outPath?: string },
): Promise<void> {
  const { input, templateFlag, outPath } = opts;
  const kind = resolveKind(input, templateFlag);
  const out = outPath
    ? resolve(process.cwd(), outPath)
    : defaultDocxOut(
        config.contentDir,
        atsRoot,
        resolve(config.contentDir, input),
      );

  const parsed = await parseFrom(source, input, kind);
  const [bytes] = await renderDocx([parsed]);

  console.log(`→ ${basename(input)}  [${kind}]  →  ${out}`);
  await write(out, bytes);
  console.log(`  ✓ ${out}`);
}

async function buildAll(
  source: FsDocumentSource,
  config: PipelineConfig,
  atsRoot: string,
): Promise<void> {
  const inputs = await listMarkdown(config.contentDir);
  if (inputs.length === 0) {
    console.error(`No markdown files found under ${config.contentDir}`);
    process.exit(1);
  }
  for (const input of inputs) {
    await buildOne(source, config, atsRoot, { input });
  }
}

export async function runDocx(
  config: PipelineConfig,
  args: string[],
): Promise<void> {
  const atsRoot = resolve(config.outputDir, "ats");
  const source = new FsDocumentSource(config.contentDir);

  if (has(args, "all")) {
    await buildAll(source, config, atsRoot);
    return;
  }
  const inputPath = getFlag(args, "input");
  if (!inputPath) {
    console.error(
      "Usage:\n" +
        "  one-resume docx --input <path-to-md> [--template cv|projects] [--out output.docx]\n" +
        "  one-resume docx --all",
    );
    process.exit(1);
  }
  await buildOne(source, config, atsRoot, {
    input: resolve(process.cwd(), inputPath),
    templateFlag: getFlag(args, "template"),
    outPath: getFlag(args, "out"),
  });
}
