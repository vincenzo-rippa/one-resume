import Router from "@koa/router";

import { AuthMiddleware } from "./middlewares/auth.ts";
import { getContent } from "./controllers/content.ts";
import { postPdfRender, postDocxRender } from "./controllers/render.ts";
import { health } from "./controllers/health.ts";

export function AppRouter(): Router {
  const router = new Router();
  const authMiddleware = AuthMiddleware(process.env.API_KEY);

  router.get("/health", health);
  router.get("/v1/content", authMiddleware, getContent);
  router.post("/v1/pdf", authMiddleware, postPdfRender);
  router.post("/v1/docx", authMiddleware, postDocxRender);
  return router;
}
