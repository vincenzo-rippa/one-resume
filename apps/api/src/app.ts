import Koa from "koa";
import Logger from "koa-logger";
import { bodyParser } from "@koa/bodyparser";
import { injectDependencies } from "./lib/di.ts";
import { AppRouter } from "./routes.ts";
import { ErrorMiddleware } from "./middlewares/error.ts";
import { HeadersMiddleware } from "./middlewares/headers.ts";
import { TimeoutMiddleware } from "./middlewares/timeout.ts";

const app = new Koa();

const router = AppRouter();

const PORT = process.env.PORT || 3000;
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS) || 30_000;

injectDependencies(app.context);

app.use(ErrorMiddleware());
app.use(HeadersMiddleware());
app.use(Logger());
app.use(TimeoutMiddleware(REQUEST_TIMEOUT_MS));
app.use(bodyParser({ enableTypes: ["json"], jsonLimit: "16kb" }));
app.use(router.routes());
app.use(router.allowedMethods());

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
