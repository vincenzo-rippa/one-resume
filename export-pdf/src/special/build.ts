// Isolated build for the private `special` CV variant (Italian, with photo).
//
// Distinct from the main build: it reads an extra YAML sidecar (the only
// surviving sidecar) for the city / header-extra / languages / other-skills /
// photo, copies the photo next to the Typst template, and renders special.typ.
// Everything special lives here so the main pipeline stays sidecar-free.

import { extname } from "node:path";
import type { FileSystemSource } from "source-nodefs";
import { loadParsedCv } from "source-nodefs";
import { LABELS } from "../labels.ts";
import { cachePath, compileTypst } from "../compile.ts";
import { parseSpecialSidecar } from "./parseSpecialSidecar.ts";

// Fixed target: the special variant is always built from the Italian main CV.
const CV_SOURCE = "cv/main/it-cv.md";
const SIDECAR_SOURCE = "special/it-special.meta.yaml";

/**
 * Build the special PDF to `outPath`. `source` must be rooted at the content
 * dir (so the relative CV / sidecar / photo names resolve) and carry the
 * pipeline `config`.
 */
export async function buildSpecial(
  source: FileSystemSource,
  outPath: string,
): Promise<void> {
  const lang = "it" as const;
  console.log(`→ ${CV_SOURCE}  [${lang}/cv-special]  →  ${outPath}`);

  const parsed = await loadParsedCv(source, CV_SOURCE);

  const rawSidecar = await source.read(SIDECAR_SOURCE);
  if (rawSidecar === null) {
    throw new Error(
      `cv-special sidecar not found: ${SIDECAR_SOURCE}\n` +
        "Expected at content/special/{lang}-special.meta.yaml.",
    );
  }
  const sidecar = parseSpecialSidecar(rawSidecar, SIDECAR_SOURCE);

  // Photo lives next to the sidecar; copy into the template .cache dir so
  // Typst's `image()` can resolve it relative to special.typ.
  const photoSource = `special/${sidecar.photo}`;
  const photo = cachePath(extname(sidecar.photo));
  await source.copy(photoSource, photo.abs);

  const payload = {
    profile: parsed.profile,
    footer: parsed.footer,
    experiences: parsed.experiences,
    education: parsed.education,
    keywords: parsed.keywords,
    labels: LABELS[lang],
    special: {
      city: sidecar.city,
      headerExtra: sidecar.headerExtra,
      languages: sidecar.languages,
      otherSkills: sidecar.otherSkills,
      photo: photo.templateRel,
    },
  };

  compileTypst({
    payload,
    template: "special",
    pdfOut: outPath,
    extraTempFiles: [photo.abs],
  });

  console.log(`  ✓ ${outPath}`);
}
