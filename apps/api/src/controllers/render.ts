import type { RouterContext } from "@koa/router";
import type { ParsedCv, ParsedProjects } from "@one-resume/domain";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { randomUUID } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import { parseFrom, ParseError, type ParseType } from "@one-resume/parser";
import { renderDocx } from "@one-resume/docx";
import { AppError } from "../lib/error.ts";
import { RenderRequest } from "../models.ts";

function buildDownloadName(input: string, ext: string): string {
  const nameOnly = basename(input).replace(/\.md$/i, "");
  const withEscapedWhitespaces = nameOnly.replace(/[^\w.-]+/g, "_");
  return `${withEscapedWhitespaces || "document"}.${ext}`;
}

async function readAndParse(
  ctx: RouterContext,
  input: string,
  type: ParseType,
): Promise<ParsedCv | ParsedProjects> {
  try {
    return await parseFrom(ctx.documentSource, input, type);
  } catch (err) {
    if (err instanceof ParseError) throw new AppError(422, err.message);
    throw err;
  }
}

export async function postPdfRender(ctx: RouterContext): Promise<void> {
  const { type, input } = RenderRequest.parse(ctx.request.body);

  const pdf = ctx.pdfRenderer;
  if (!pdf) {
    throw new AppError(503, "PDF rendering is currently unavailable");
  }

  const parsed = await readAndParse(ctx, input, type);

  const tempOut = join(tmpdir(), `one-resume-${randomUUID()}.pdf`);
  try {
    await pdf.renderPdf([{ parsed, out: tempOut }]);
    const bytes = await readFile(tempOut);
    ctx.attachment(buildDownloadName(input, "pdf"));
    ctx.body = bytes;
  } finally {
    await rm(tempOut, { force: true });
  }
}

export async function postDocxRender(ctx: RouterContext): Promise<void> {
  const { type, input } = RenderRequest.parse(ctx.request.body);

  const parsed = await readAndParse(ctx, input, type);

  const [bytes] = await renderDocx([parsed]);
  ctx.attachment(buildDownloadName(input, "docx"));
  ctx.body = Buffer.from(bytes);
}
