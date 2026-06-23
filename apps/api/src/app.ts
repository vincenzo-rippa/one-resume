import Koa from "koa";
import Logger from "koa-logger";
import { bodyParser } from "@koa/bodyparser";
import { GitHubConfig } from "./io/github-config.ts";

import { GitHubRepository } from "./io/github-repo.ts";
import { PdfRenderer } from "@one-resume/pdf";
import { AppRouter } from "./routes.ts";
import { ErrorMiddleware } from "./middlewares/error.ts";
import { NoStoreMiddleware } from "./middlewares/cache.ts";

const app = new Koa();

const PORT = process.env.PORT || 3000;

app.context.documentSource = new GitHubRepository(GitHubConfig.fromEnv());

// Build the PDF renderer once at boot. Its constructor runs the typst
// `--version` preflight; if typst is unreachable we log and leave the renderer
// null — the app still boots and other routes keep working, while /v1/pdf
// answers 503. A missing binary needs a redeploy, not a retry, so there is no
// point refusing to boot or re-probing per request.
try {
  app.context.pdfRenderer = new PdfRenderer({ bin: process.env.TYPST_BIN });
} catch (err) {
  console.error("PDF rendering disabled — typst preflight failed at boot:", err);
  app.context.pdfRenderer = null;
}

const router = AppRouter();

app.use(ErrorMiddleware());
app.use(NoStoreMiddleware());
app.use(Logger());
app.use(bodyParser());
app.use(router.routes());
app.use(router.allowedMethods());

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
