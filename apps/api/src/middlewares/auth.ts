import { timingSafeEqual } from "node:crypto";
import type { Context, Next, Middleware } from "koa";

function isSecure(serverKey: string): boolean {
  return serverKey.length > 16;
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function ApiKeyAuthMiddleware(serverKey: string | undefined): Middleware {
  // Boot-time config check: fail fast with a clear message rather than a
  // request-shaped error that would crash the process at startup.
  if (!serverKey || !isSecure(serverKey)) {
    console.error(
      "FATAL: API_KEY must be set and longer than 16 characters (set it in apps/api/.env).",
    );
    process.exit(1);
  }

  return (ctx: Context, next: Next) => {
    const clientKey = ctx.request.get("x-api-key");
    if (!clientKey) {
      ctx.status = 401;
      ctx.body = { error: "Missing X-API-KEY header" };
      return;
    }

    if (!safeEqual(serverKey, clientKey)) {
      ctx.status = 401;
      ctx.body = { error: "Invalid API key" };
      return;
    }

    return next();
  };
}
