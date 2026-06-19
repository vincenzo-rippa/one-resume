import type { ContentSource } from "@one-resume/content";

// Augment Koa's context with the app-level dependencies attached in app.ts
// (`app.context.contentSource = …`), so controllers read them fully typed
// instead of casting.
declare module "koa" {
  interface DefaultContext {
    contentSource: ContentSource;
  }
}
