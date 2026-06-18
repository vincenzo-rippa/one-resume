import Koa from "koa";
import Logger from "koa-logger";
import { GitHubConfig } from "./io/github-config.ts";

import { GitHubRepository } from "./io/github-repo.ts";
import { AppRouter } from "./routes.ts";
import { AuthMiddleware } from "./middlewares.ts";

const app = new Koa();

const PORT = process.env.PORT || 3000;

app.context.contentRepository = new GitHubRepository(GitHubConfig.fromEnv());

app.use(Logger());
app.use(AuthMiddleware(process.env.API_KEY));
app.use(AppRouter().routes());
app.use(AppRouter().allowedMethods());

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
