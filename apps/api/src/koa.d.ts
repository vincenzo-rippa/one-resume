import type { DocumentSource } from "@one-resume/domain";
import type { PdfRenderer } from "@one-resume/pdf";

declare module "koa" {
  interface DefaultContext {
    documentSource: DocumentSource;
    pdfRenderer: PdfRenderer | null;
  }
}
