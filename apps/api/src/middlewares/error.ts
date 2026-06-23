import type { Context, Next, Middleware } from "koa";
import { ZodError } from "zod";
import { AppError } from "../lib/error.ts";

export function ErrorMiddleware(): Middleware {
  return async (ctx: Context, next: Next) => {
    try {
      await next();
    } catch (err) {
      console.error(err);
      if (err instanceof AppError) {
        ctx.status = err.status;
        ctx.body = { error: err.message };
      } else if (err instanceof ZodError) {
        ctx.status = 400;
        ctx.body = { error: "Invalid request body", issues: err.issues };
      } else {
        const error = err as { status?: unknown; message?: unknown };
        const status = typeof error.status === "number" ? error.status : 500;
        const message =
          typeof error.message === "string"
            ? error.message
            : "Internal Server Error";
        ctx.status = status;
        ctx.body = { error: message };
      }
    }
  };
}
