import type { Context, Next, Middleware } from "koa";

export function HeadersMiddleware(): Middleware {
  return (ctx: Context, next: Next) => {
    ctx.set("Cache-Control", "no-store");
    ctx.set("X-Content-Type-Options", "nosniff");
    return next();
  };
}
