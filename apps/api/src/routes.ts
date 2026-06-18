import Router from "@koa/router";
import { getContent } from "./controllers/content.ts";
import { getDocxLabels, getPdfLabels } from "./controllers/labels.ts";
import { health } from "./controllers/health.ts";

export function AppRouter(): Router {
  const router = new Router();
  router.all("/health", health);
  router.get("/v1/content", getContent);
  router.get("/v1/labels/pdf/:locale", getPdfLabels);
  router.get("/v1/labels/docx/:locale", getDocxLabels);

  return router;
}
