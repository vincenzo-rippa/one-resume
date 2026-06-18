// `one-resume docx` — ATS DOCX via @one-resume/docx (byte-returning; the app
// writes the bytes).
//
//   one-resume docx --input <md> [--template main|freelance|projects] [--out out.docx]
//   one-resume docx --all       (every parser-known DOCX → PRINTED_DIR/ats)

import { basename, relative, resolve } from "node:path";
import { detectLocale, docxLabels } from "@one-resume/localization";
import { renderCv, renderFreelanceCv, renderProjects } from "@one-resume/docx";
import type { PipelineConfig } from "../config.ts";
import { loadParsedCv, loadParsedProjects } from "../loaders.ts";
import { listDir, write } from "../io.ts";
import { BULK_DIRS, defaultDocxOut, resolveKind } from "../manifest.ts";
import { getFlag, has } from "../args.ts";

async function buildOne(
  config: PipelineConfig,
  atsRoot: string,
  opts: { inputPath: string; templateFlag?: string; outPath?: string },
): Promise<void> {
  const { inputPath, templateFlag, outPath } = opts;
  const mdPath = resolve(process.cwd(), inputPath);
  const locale = detectLocale(mdPath);
  const kind = resolveKind(mdPath, templateFlag);
  const labels = docxLabels(locale);

  const docxOut = outPath
    ? resolve(process.cwd(), outPath)
    : defaultDocxOut(config.contentDir, atsRoot, mdPath);

  console.log(`→ ${basename(mdPath)}  [${locale}/${kind}]  →  ${docxOut}`);

  let bytes: Uint8Array;
  if (kind === "projects") {
    bytes = await renderProjects(await loadParsedProjects(mdPath), labels);
  } else if (kind === "freelance") {
    bytes = await renderFreelanceCv(await loadParsedCv(mdPath), labels);
  } else {
    bytes = await renderCv(await loadParsedCv(mdPath), labels);
  }

  await write(docxOut, bytes);
  console.log(`  ✓ ${docxOut}`);
}

async function buildAll(
  config: PipelineConfig,
  atsRoot: string,
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
    await buildOne(config, atsRoot, { inputPath: mdPath });
  }
}

export async function runDocx(
  config: PipelineConfig,
  args: string[],
): Promise<void> {
  const atsRoot = resolve(config.outputDir, "ats");

  if (has(args, "all")) {
    await buildAll(config, atsRoot);
    return;
  }
  const inputPath = getFlag(args, "input");
  if (!inputPath) {
    console.error(
      "Usage:\n" +
        "  one-resume docx --input <path-to-md> [--template main|freelance|projects] [--out printed.docx]\n" +
        "  one-resume docx --all",
    );
    process.exit(1);
  }
  await buildOne(config, atsRoot, {
    inputPath,
    templateFlag: getFlag(args, "template"),
    outPath: getFlag(args, "out"),
  });
}
