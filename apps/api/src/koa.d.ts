import type { ContentRepository } from "./ports.ts";

// Augment Koa's context with the app-level dependencies attached in app.ts
// (`app.context.contentRepository = …`), so controllers read them fully typed
// instead of casting.
declare module "koa" {
  interface DefaultContext {
    contentRepository: ContentRepository;
  }
}
