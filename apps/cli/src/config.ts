// The single config seam for the one-resume app: every env-configurable path
// plus the resolved typst binary. Defaults assume the side-by-side repo layout
// (one-resume / pro-profile-source / pro-landing); override via `.env` at the
// repo root (see .env.example). Folds in the former @one-resume/fs config.

export class PipelineConfig {
  /** Markdown sources (CONTENT_DIR). */
  readonly contentDir: string;
  /** Where the 4 public PDFs are written (SITE_PUBLIC_CV_DIR). */
  readonly sitePublicCvDir: string;
  /** Where the site's content.json is written (SITE_LOCALES_DIR). */
  readonly siteLocalesDir: string;
  /** Base dir for private outputs — printed/pdf, printed/ats (PRINTED_DIR). */
  readonly outputDir: string;
  /**
   * The typst binary the PDF renderer shells out to (TYPST_BIN). A bare name is
   * left bare so spawn finds it on PATH without a shell (`.exe` on Windows
   * avoids Node DEP0190); an absolute path from `.env` is used as-is.
   */
  readonly typstBin: string;
  

  constructor() {
    this.contentDir = process.env.CONTENT_DIR ?? "examples";
    this.sitePublicCvDir = process.env.SITE_PUBLIC_CV_DIR ?? "";
    this.siteLocalesDir = process.env.SITE_LOCALES_DIR ?? "";
    this.outputDir = process.env.OUTPUT_DIR ?? "out";
    this.typstBin =
      process.env.TYPST_BIN ??
      (process.platform === "win32" ? "typst.exe" : "typst");
  }
}
