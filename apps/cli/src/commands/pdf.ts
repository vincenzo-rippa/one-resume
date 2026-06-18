// `one-resume pdf` — CV / projects / freelance PDFs via @one-resume/pdf.
//
//   one-resume pdf --input <md> [--template main|projects|freelance] [--out out.pdf]
//   one-resume pdf --public    (4 PDFs → SITE_PUBLIC_CV_DIR)
//   one-resume pdf --all       (every parser-known PDF → PRINTED_DIR/pdf)

import { basename, extname, resolve } from "node:path";
import { detectLocale, pdfLabels } from "@one-resume/localization";
import { TypstPdf } from "@one-resume/pdf";
import type { PipelineConfig } from "../config.ts";
import { loadParsedCv, loadParsedProjects } from "../loaders.ts";
import { listDir } from "../io.ts";
import { BULK_DIRS, PUBLIC_PDF_TARGETS, resolveKind } from "../manifest.ts";
import { getFlag, has } from "../args.ts";

async function buildOne(
  typst: TypstPdf,
  outputDir: string,
  opts: { inputPath: string; templateFlag?: string; outPath?: string },
): Promise<void> {
  const { inputPath, templateFlag, outPath } = opts;
  const mdPath = resolve(process.cwd(), inputPath);
  const mdName = basename(mdPath, extname(mdPath));
  const locale = detectLocale(mdPath);
  const kind = resolveKind(mdPath, templateFlag);
  const labels = pdfLabels(locale);

  const pdfOut = outPath
    ? resolve(process.cwd(), outPath)
    : resolve(outputDir, mdName + ".pdf");

  console.log(
    `→ ${basename(mdPath)}  [${locale}/${kind}]  →  ${basename(pdfOut)}`,
  );

  if (kind === "projects") {
    await typst.renderProjects(
      await loadParsedProjects(mdPath),
      labels,
      pdfOut,
    );
  } else if (kind === "freelance") {
    await typst.renderFreelanceCv(await loadParsedCv(mdPath), labels, pdfOut);
  } else {
    await typst.renderCv(await loadParsedCv(mdPath), labels, pdfOut);
  }
  console.log(`  ✓ ${pdfOut}`);
}

async function buildAll(
  typst: TypstPdf,
  config: PipelineConfig,
  outputDir: string,
): Promise<void> {
  const mdFiles: string[] = [];
  for (const rel of BULK_DIRS) {
    const dir = resolve(config.contentDir, rel);
    const names = await listDir(dir);
    mdFiles.push(
      ...names.filter((f) => f.endsWith(".md")).map((f) => resolve(dir, f)),
    );
  }
  if (mdFiles.length === 0) {
    console.error(`No markdown files found under ${config.contentDir}`);
    process.exit(1);
  }
  for (const mdPath of mdFiles) {
    await buildOne(typst, outputDir, { inputPath: mdPath });
  }
}

export async function runPdf(
  config: PipelineConfig,
  args: string[],
): Promise<void> {
  const outputDir = resolve(config.outputDir, "pdf");
  const wantsPublic = has(args, "public");
  const wantsAll = has(args, "all");
  const inputPath = getFlag(args, "input");

  if (!wantsPublic && !wantsAll && !inputPath) {
    console.error(
      "Usage:\n" +
        "  one-resume pdf --input <path-to-md> [--template main|projects|freelance] [--out output.pdf]\n" +
        "  one-resume pdf --public        (4 PDFs → SITE_PUBLIC_CV_DIR)\n" +
        "  one-resume pdf --all           (every parser-known PDF → PRINTED_DIR/pdf)",
    );
    process.exit(1);
  }

  // One TypstPdf for the whole run; its constructor is the typst preflight.
  const typst = new TypstPdf({ bin: config.typstBin });

  if (wantsPublic) {
    for (const t of PUBLIC_PDF_TARGETS) {
      await buildOne(typst, outputDir, {
        inputPath: resolve(config.contentDir, t.input),
        outPath: resolve(config.sitePublicCvDir, t.out),
      });
    }
  } else if (wantsAll) {
    await buildAll(typst, config, outputDir);
  } else {
    await buildOne(typst, outputDir, {
      inputPath: inputPath!,
      templateFlag: getFlag(args, "template"),
      outPath: getFlag(args, "out"),
    });
  }
}
