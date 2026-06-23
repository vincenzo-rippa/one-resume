import type { Context, Next, Middleware } from "koa";
import { AppError } from "../lib/error.ts";

export function TimeoutMiddleware(ms: number): Middleware {
  return async (_ctx: Context, next: Next) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new AppError(504, "Request timed out")),
        ms,
      );
    });
    try {
      await Promise.race([next(), deadline]);
    } finally {
      clearTimeout(timer);
    }
  };
}
