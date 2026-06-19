import Router from "@koa/router";
import { getContent } from "./controllers/content.ts";
import { health } from "./controllers/health.ts";

export function AppRouter(): Router {
  const router = new Router();
  router.all("/health", health);
  router.get("/v1/content", getContent);

  return router;
}
