import type { DocumentSource } from "@one-resume/domain";
import type { PdfRenderer } from "@one-resume/pdf";

// Augment Koa's context with the app-level dependencies attached in app.ts
// (`app.context.documentSource = …`), so controllers read them fully typed
// instead of casting.
declare module "koa" {
  interface DefaultContext {
    documentSource: DocumentSource;
    /** Built once at boot; `null` when typst was unreachable then (/v1/pdf → 503). */
    pdfRenderer: PdfRenderer | null;
  }
}
