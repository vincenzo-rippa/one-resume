// The one sanctioned PDF entry point. Constructing a `TypstPdf` runs the typst
// preflight (`typst --version`); a successfully-constructed instance proves typst
// is reachable. `renderPdf` writes one PDF per job: the parsed document IS the
// template payload (the templates read it directly), and its shape selects the
// template — a ParsedCv renders the adaptive `cv` template, a ParsedProjects the
// `projects` one. The app builds ONE instance at startup so a missing binary
// fails fast there.

import type { ParsedCv, ParsedProjects } from "@one-resume/domain";
import { compile, preflight } from "./typst.ts";

export interface PdfJob {
  /** A parsed CV or projects document — passed to the template verbatim. */
  parsed: ParsedCv | ParsedProjects;
  /** Where typst writes the PDF (its native file output). */
  out: string;
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

  /**
   * Render each job to its `out` path. A CV uses the adaptive `cv` template (it
   * renders the projects section only when present); a standalone projects
   * document uses `projects`.
   */
  renderPdf(jobs: PdfJob[]): void {
    for (const { parsed, out } of jobs) {
      compile(this.bin, {
        payload: parsed,
        template: "profile" in parsed ? "cv" : "projects",
        pdfOut: out,
      });
    }
  }
}
