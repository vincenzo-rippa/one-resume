// `one-resume special` — the private Italian CV with photo + extras sidecar.
//
// Reads the only surviving YAML sidecar and the headshot bytes, then renders
// special.typ. The renderer (TypstPdf.renderSpecialCv) re-parses + validates the
// YAML; here we parse it only to discover the photo filename.

import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { pdfLabels } from "@one-resume/localization";
import { TypstPdf } from "@one-resume/pdf";
import type { PipelineConfig } from "../config.ts";
import { loadParsedCv } from "../loaders.ts";
import { readBytes, readText } from "../io.ts";
import { SPECIAL_CV_SOURCE, SPECIAL_SIDECAR_SOURCE } from "../manifest.ts";

export async function runSpecial(config: PipelineConfig): Promise<void> {
  const outPath = resolve(config.outputDir, "pdf", "it-cv-special.pdf");
  console.log(`→ ${SPECIAL_CV_SOURCE}  [it/cv-special]  →  ${outPath}`);

  const typst = new TypstPdf({ bin: config.typstBin });

  const parsed = await loadParsedCv(
    resolve(config.contentDir, SPECIAL_CV_SOURCE),
  );

  const sidecarPath = resolve(config.contentDir, SPECIAL_SIDECAR_SOURCE);
  const yamlText = await readText(sidecarPath);
  if (yamlText === null) {
    throw new Error(
      `cv-special sidecar not found: ${SPECIAL_SIDECAR_SOURCE}\n` +
        "Expected at content/special/{lang}-special.meta.yaml.",
    );
  }

  const photoName = (parseYaml(yamlText) as { photo?: string } | null)?.photo;
  if (!photoName) {
    throw new Error(
      `cv-special sidecar missing \`photo\`: ${SPECIAL_SIDECAR_SOURCE}`,
    );
  }
  const photo = await readBytes(
    resolve(config.contentDir, "special", photoName),
  );

  await typst.renderSpecialCv(
    parsed,
    pdfLabels("it"),
    { yamlText, photo, options: { sourceName: SPECIAL_SIDECAR_SOURCE } },
    outPath,
  );
  console.log(`  ✓ ${outPath}`);
}
