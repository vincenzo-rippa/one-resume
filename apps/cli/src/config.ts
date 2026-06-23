// The single config seam for the one-resume app. Demo-first: with no `.env` and
// nothing in the environment, the CLI reads the bundled `examples/` and writes
// to `./out`, so a fresh clone produces real artifacts with zero setup.
//
// Overrides come from `apps/cli/.env` (see .env.example), loaded by the npm
// scripts via `tsx --env-file-if-exists=apps/cli/.env` — the same mechanism the
// `api` script uses. This class only reads `process.env`; it never touches disk.

export class PipelineConfig {
  /** Markdown sources (CONTENT_DIR). Default: the bundled `examples/`. */
  readonly contentDir: string;
  /** Base dir for all generated output (OUTPUT_DIR). Default: `out`. */
  readonly outputDir: string;
  /**
   * The typst binary the PDF renderer shells out to (TYPST_BIN). A bare name is
   * left bare so spawn finds it on PATH without a shell (`.exe` on Windows
   * avoids Node DEP0190); an absolute path from `.env` is used as-is.
   */
  readonly typstBin: string;

  constructor() {
    this.contentDir = process.env.CONTENT_DIR ?? "examples";
    this.outputDir = process.env.OUTPUT_DIR ?? "out";
    this.typstBin =
      process.env.TYPST_BIN ??
      (process.platform === "win32" ? "typst.exe" : "typst");
  }
}
