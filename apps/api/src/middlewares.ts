import { timingSafeEqual } from "crypto";
import type { Context, Next, Middleware } from "koa";
import { IoError } from "./errors";

function isSecure(serverKey: string): boolean {
  return serverKey.length > 16;
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function AuthMiddleware(serverKey: string | undefined): Middleware {
  if (!serverKey) {
    throw new IoError(500, "Missing API Key");
  }

  if (!isSecure(serverKey)) {
    throw new IoError(500, "Provided API key is not secure enough");
  }

  return (ctx: Context, next: Next) => {
    const clientKey = ctx.request.get("x-api-key");
    if (!clientKey) {
      ctx.status = 401;
      ctx.body = { error: "Invalid X-API-KEY header" };
      return;
    }

    if (!safeEqual(serverKey, clientKey)) {
      ctx.status = 401;
      ctx.body = { error: "Invalid Bearer token" };
      return;
    }

    return next();
  };
}
