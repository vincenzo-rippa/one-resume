import { timingSafeEqual } from "node:crypto";
import type { Context, Next, Middleware } from "koa";
import { IoError } from "./errors.ts";

/**
 * Outermost middleware: catch everything thrown downstream, log the full error
 * server-side, and emit a sanitized JSON body. Client-facing errors (status
 * < 500: validation, 404, 422) expose their message; anything else collapses to
 * a generic 500 so internals never leak. The single place response errors are
 * shaped — controllers just throw.
 */
export function ErrorMiddleware(): Middleware {
  return async (ctx: Context, next: Next) => {
    try {
      await next();
    } catch (err) {
      console.error(err);
      if (err instanceof IoError) {
        ctx.status = err.status;
      } else if (typeof (err as { status?: unknown })?.status === "number") {
        ctx.status = (err as { status: number }).status;
      } else {
        ctx.status = 500;
      }
      const errorMsg =
        ctx.status < 500 && err instanceof Error
          ? err.message
          : "Internal Server Error";
      ctx.body = {
        error: errorMsg,
      };
    }
  };
}

function isSecure(serverKey: string): boolean {
  return serverKey.length > 16;
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function AuthMiddleware(serverKey: string | undefined): Middleware {
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
