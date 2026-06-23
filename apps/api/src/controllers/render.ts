import type { RouterContext } from "@koa/router";
import type { ParsedCv, ParsedProjects } from "@one-resume/domain";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { randomUUID } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import { parse, ParseError, type ParseType } from "@one-resume/parser";
import { renderDocx } from "@one-resume/docx";
import { IoError } from "../errors.ts";
import { RenderRequest } from "../models.ts";

/** A safe download filename derived from the input path's basename + extension. */
function downloadName(input: string, ext: string): string {
  const stem = basename(input).replace(/\.md$/i, "").replace(/[^\w.-]+/g, "_");
  return `${stem || "document"}.${ext}`;
}

/**
 * Read a job's markdown through the `DocumentSource` and parse it. Read errors
 * (404/502 from the source) propagate as-is; only a parse failure on otherwise
 * readable markdown is a 422.
 */
async function readAndParse(
  ctx: RouterContext,
  type: ParseType,
  input: string,
): Promise<ParsedCv | ParsedProjects> {
  const markdown = await ctx.documentSource.read(input);
  try {
    return parse(markdown, type);
  } catch (err) {
    if (err instanceof ParseError) throw new IoError(422, err.message);
    throw err;
  }
}

/**
 * POST /v1/pdf — render one document to a PDF and stream it back.
 *
 * Body: `{ type: "cv" | "projects", input: "<relative .md path>" }`. typst writes
 * a temp PDF which is streamed as an attachment and then deleted. Rendering uses
 * async `spawn` (`renderPdf`), so the event loop is never blocked while typst
 * compiles.
 *
 * `ctx.pdfRenderer` is built once at boot and is `null` when typst was unreachable
 * then. A missing binary needs a redeploy, not a retry — so this answers 503
 * immediately rather than re-probing on every request.
 */
export async function postPdfRender(ctx: RouterContext): Promise<void> {
  const { type, input } = RenderRequest.parse(ctx.request.body);

  const pdf = ctx.pdfRenderer;
  if (!pdf) {
    throw new IoError(503, "PDF rendering is unavailable");
  }

  const parsed = await readAndParse(ctx, type, input);

  const out = join(tmpdir(), `one-resume-${randomUUID()}.pdf`);
  try {
    await pdf.renderPdf([{ parsed, out }]);
    const bytes = await readFile(out);
    ctx.attachment(downloadName(input, "pdf"));
    ctx.body = bytes;
  } finally {
    await rm(out, { force: true });
  }
}

/**
 * POST /v1/docx — render one document to an ATS `.docx` and stream it back.
 *
 * Body: `{ type: "cv" | "projects", input: "<relative .md path>" }`. Unlike PDF,
 * `renderDocx` packs the document to bytes in-process (no typst), so there is no
 * boot renderer and no 503 path.
 */
export async function postDocxRender(ctx: RouterContext): Promise<void> {
  const { type, input } = RenderRequest.parse(ctx.request.body);

  const parsed = await readAndParse(ctx, type, input);

  const [bytes] = await renderDocx([parsed]);
  ctx.attachment(downloadName(input, "docx"));
  ctx.body = Buffer.from(bytes);
}
