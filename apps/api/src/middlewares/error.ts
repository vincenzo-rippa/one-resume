import type { Context, Next, Middleware } from "koa";
import { ZodError } from "zod";
import { IoError } from "../errors.ts";

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
        ctx.body = { error: err.message };
      } else if (err instanceof ZodError) {
        ctx.status = 400;
        ctx.body = { error: "Invalid request body", issues: err.issues };
      } else if (typeof (err as { status?: unknown })?.status === "number") {
        ctx.status = (err as { status: number }).status;
        const errorMsg =
          ctx.status < 500 && err instanceof Error
            ? err.message
            : "Internal Server Error";
        ctx.body = { error: errorMsg };
      } else {
        ctx.status = 500;
        ctx.body = { error: "Internal Server Error" };
      }
    }
  };
}
