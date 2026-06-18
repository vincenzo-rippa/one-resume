/**
 * Failures from the PDF renderer:
 *  - typst not reachable (the `TypstPdf` constructor preflight) — `cause` carries
 *    the spawn error / non-zero exit;
 *  - a non-zero `typst compile` exit — `cause` carries the exit code;
 *  - special-sidecar validation — `field` names the offending YAML key,
 *    `sourceName` the sidecar.
 */
export class PdfError extends Error {
  sourceName?: string;
  field?: string;
  override cause?: unknown;

  constructor(
    message: string,
    opts: { sourceName?: string; field?: string; cause?: unknown } = {},
  ) {
    super(message);
    this.name = "PdfError";
    this.sourceName = opts.sourceName;
    this.field = opts.field;
    this.cause = opts.cause;
  }
}
