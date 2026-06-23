/**
 * A PDF rendering failure: typst was unreachable (the `PdfRenderer` preflight) or
 * a `typst compile` invocation failed (non-zero exit, spawn error, or timeout).
 * `cause` carries the underlying spawn error or exit code.
 */
export class PdfError extends Error {
  override cause?: unknown;

  constructor(message: string, opts: { cause?: unknown } = {}) {
    super(message);
    this.name = "PdfError";
    this.cause = opts.cause;
  }
}
