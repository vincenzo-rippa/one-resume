// `one-resume pdf` — CV / projects PDFs via @one-resume/pdf.
//
//   one-resume pdf --input <md> [--template cv|projects] [--out out.pdf]
//   one-resume pdf --all       (every markdown under CONTENT_DIR → <out>/pdf)

import { basename, extname, resolve } from "node:path";
import { parseFrom } from "@one-resume/parser";
import { PdfRenderer } from "@one-resume/pdf";
import type { PipelineConfig } from "../lib/config.ts";
import { FsDocumentSource } from "../lib/source.ts";

import { listMarkdown } from "../lib/io.ts";
import { resolveKind } from "../lib/helpers.ts";
import { getFlag, has } from "../lib/args.ts";

async function buildOne(
  typst: PdfRenderer,
  source: FsDocumentSource,
  outputDir: string,
  opts: { input: string; templateFlag?: string; outPath?: string },
): Promise<void> {
  const { input, templateFlag, outPath } = opts;
  const kind = resolveKind(input, templateFlag);
  const out = outPath
    ? resolve(process.cwd(), outPath)
    : resolve(outputDir, basename(input, extname(input)) + ".pdf");

  const parsed = await parseFrom(source, input, kind);

  console.log(`→ ${basename(input)}  [${kind}]  →  ${basename(out)}`);
  await typst.renderPdf([{ parsed, out }]);
  console.log(`  ✓ ${out}`);
}

async function buildAll(
  typst: PdfRenderer,
  source: FsDocumentSource,
  config: PipelineConfig,
  outputDir: string,
): Promise<void> {
  const inputs = await listMarkdown(config.contentDir);
  if (inputs.length === 0) {
    console.error(`No markdown files found under ${config.contentDir}`);
    process.exit(1);
  }
  for (const input of inputs) {
    await buildOne(typst, source, outputDir, { input });
  }
}

export async function runPdf(
  config: PipelineConfig,
  args: string[],
): Promise<void> {
  const outputDir = resolve(config.outputDir, "pdf");
  const source = new FsDocumentSource(config.contentDir);
  const wantsAll = has(args, "all");
  const inputPath = getFlag(args, "input");

  if (!wantsAll && !inputPath) {
    console.error(
      "Usage:\n" +
        "  one-resume pdf --input <path-to-md> [--template cv|projects] [--out output.pdf]\n" +
        "  one-resume pdf --all           (every markdown under CONTENT_DIR)",
    );
    process.exit(1);
  }

  // One PdfRenderer for the whole run; its constructor is the typst preflight.
  const typst = new PdfRenderer({ bin: config.typstBin });

  if (wantsAll) {
    await buildAll(typst, source, config, outputDir);
  } else {
    await buildOne(typst, source, outputDir, {
      input: resolve(process.cwd(), inputPath!),
      templateFlag: getFlag(args, "template"),
      outPath: getFlag(args, "out"),
    });
  }
}
