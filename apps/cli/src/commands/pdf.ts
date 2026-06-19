// `one-resume pdf` — CV / projects PDFs via @one-resume/pdf.
//
//   one-resume pdf --input <md> [--template cv|projects] [--out out.pdf]
//   one-resume pdf --public    (4 PDFs → SITE_PUBLIC_CV_DIR)
//   one-resume pdf --all       (every markdown under the content root → <out>/pdf)

import { basename, extname, join, resolve } from "node:path";
import { TypstPdf } from "@one-resume/pdf";
import type { PipelineConfig } from "../config.ts";
import { FsContentSource } from "../source.ts";
import { loadParsedCv, loadParsedProjects } from "../loaders.ts";
import { listDir } from "../io.ts";
import { BULK_DIRS, PUBLIC_PDF_TARGETS, resolveKind } from "../targets.ts";
import { getFlag, has } from "../args.ts";

async function buildOne(
  typst: TypstPdf,
  source: FsContentSource,
  outputDir: string,
  opts: { input: string; templateFlag?: string; outPath?: string },
): Promise<void> {
  const { input, templateFlag, outPath } = opts;
  const kind = resolveKind(input, templateFlag);
  const out = outPath
    ? resolve(process.cwd(), outPath)
    : resolve(outputDir, basename(input, extname(input)) + ".pdf");

  const parsed =
    kind === "projects"
      ? await loadParsedProjects(source, input)
      : await loadParsedCv(source, input);

  console.log(`→ ${basename(input)}  [${kind}]  →  ${basename(out)}`);
  typst.renderPdf([{ parsed, out }]);
  console.log(`  ✓ ${out}`);
}

async function buildAll(
  typst: TypstPdf,
  source: FsContentSource,
  config: PipelineConfig,
  outputDir: string,
): Promise<void> {
  const inputs: string[] = [];
  for (const rel of BULK_DIRS) {
    const names = await listDir(resolve(config.contentDir, rel));
    inputs.push(
      ...names.filter((f) => f.endsWith(".md")).map((f) => join(rel, f)),
    );
  }
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
  const source = new FsContentSource(config.contentDir);
  const wantsPublic = has(args, "public");
  const wantsAll = has(args, "all");
  const inputPath = getFlag(args, "input");

  if (!wantsPublic && !wantsAll && !inputPath) {
    console.error(
      "Usage:\n" +
        "  one-resume pdf --input <path-to-md> [--template cv|projects] [--out output.pdf]\n" +
        "  one-resume pdf --public        (4 PDFs → SITE_PUBLIC_CV_DIR)\n" +
        "  one-resume pdf --all           (every markdown under the content root)",
    );
    process.exit(1);
  }

  // One TypstPdf for the whole run; its constructor is the typst preflight.
  const typst = new TypstPdf({ bin: config.typstBin });

  if (wantsPublic) {
    for (const t of PUBLIC_PDF_TARGETS) {
      await buildOne(typst, source, outputDir, {
        input: t.input,
        outPath: resolve(config.sitePublicCvDir, t.out),
      });
    }
  } else if (wantsAll) {
    await buildAll(typst, source, config, outputDir);
  } else {
    await buildOne(typst, source, outputDir, {
      input: resolve(process.cwd(), inputPath!),
      templateFlag: getFlag(args, "template"),
      outPath: getFlag(args, "out"),
    });
  }
}
