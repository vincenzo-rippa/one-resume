import type { DefaultContext } from "koa";
import { GitHubConfig } from "./config.ts";
import { GitHubDocumentSource } from "./source.ts";
import { PdfRenderer } from "@one-resume/pdf";

export function injectDependencies(context: DefaultContext) {
  context.documentSource = new GitHubDocumentSource(GitHubConfig.fromEnv());

  try {
    context.pdfRenderer = new PdfRenderer({ bin: process.env.TYPST_BIN });
  } catch (err) {
    console.error(
      "PDF rendering disabled — typst preflight failed at boot:",
      err,
    );
    context.pdfRenderer = null;
  }
}
