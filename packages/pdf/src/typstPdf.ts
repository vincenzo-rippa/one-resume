// The one sanctioned PDF entry point. Constructing a `TypstPdf` runs the typst
// preflight (`typst --version`); a successfully-constructed instance proves typst
// is present and reachable. Render methods assemble the JSON payload per template
// and shell out to typst, writing the PDF to `outPath` (typst's native file
// output — no stdout capture). The app builds ONE instance at startup so a
// missing binary fails fast there.

import { writeFileSync } from "node:fs";
import { extname } from "node:path";
import type { ParsedCv, ParsedProjects } from "@one-resume/types";
import type { PdfLabels } from "./labels.ts";
import { cachePath, compile, preflight } from "./typst.ts";
import { parseSpecialSidecar } from "./special/parseSpecialSidecar.ts";

/**
 * The extra inputs the private `special` CV variant needs beyond the base CV:
 * the sidecar YAML (parsed + validated here) and the headshot bytes (read by the
 * caller; written into typst's scratch by the renderer). `options.sourceName`
 * labels sidecar validation errors.
 */
export interface SpecialPayload {
  yamlText: string;
  photo: Uint8Array;
  options?: { sourceName?: string };
}

function cvPayload(parsed: ParsedCv, labels: PdfLabels) {
  return {
    profile: parsed.profile,
    footer: parsed.footer,
    experiences: parsed.experiences,
    education: parsed.education,
    keywords: parsed.keywords,
    labels,
  };
}

export class TypstPdf {
  private readonly bin: string;

  /**
   * `bin` is the typst binary the app resolved (TYPST_BIN). Defaults to
   * `typst.exe` on Windows / `typst` elsewhere so the binary is found without a
   * shell (avoids Node DEP0190). Throws `PdfError` if typst is unreachable.
   */
  constructor(options: { bin?: string } = {}) {
    this.bin =
      options.bin ?? (process.platform === "win32" ? "typst.exe" : "typst");
    preflight(this.bin);
  }

  async renderCv(
    parsed: ParsedCv,
    labels: PdfLabels,
    outPath: string,
  ): Promise<void> {
    compile(this.bin, {
      payload: cvPayload(parsed, labels),
      template: "main",
      pdfOut: outPath,
    });
  }

  async renderFreelanceCv(
    parsed: ParsedCv,
    labels: PdfLabels,
    outPath: string,
  ): Promise<void> {
    compile(this.bin, {
      payload: { ...cvPayload(parsed, labels), projects: parsed.projects },
      template: "freelance",
      pdfOut: outPath,
    });
  }

  async renderProjects(
    projects: ParsedProjects,
    labels: PdfLabels,
    outPath: string,
  ): Promise<void> {
    compile(this.bin, {
      payload: { projects, labels },
      template: "projects",
      pdfOut: outPath,
    });
  }

  async renderSpecialCv(
    parsed: ParsedCv,
    labels: PdfLabels,
    payload: SpecialPayload,
    outPath: string,
  ): Promise<void> {
    const sidecar = parseSpecialSidecar(
      payload.yamlText,
      payload.options?.sourceName ?? "special sidecar",
    );

    // Write the caller-provided photo bytes into the template .cache dir so
    // Typst's `image()` can resolve it relative to special.typ.
    const photo = cachePath(extname(sidecar.photo));
    writeFileSync(photo.abs, payload.photo);

    compile(this.bin, {
      payload: {
        ...cvPayload(parsed, labels),
        special: {
          city: sidecar.city,
          headerExtra: sidecar.headerExtra,
          languages: sidecar.languages,
          otherSkills: sidecar.otherSkills,
          photo: photo.templateRel,
        },
      },
      template: "special",
      pdfOut: outPath,
      extraTempFiles: [photo.abs],
    });
  }
}
