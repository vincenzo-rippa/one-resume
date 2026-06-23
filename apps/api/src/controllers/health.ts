import type { RouterContext } from "@koa/router";

export async function health(ctx: RouterContext): Promise<void> {
  const healthCheck = {
    uptime: process.uptime(),
    message: "OK",
    timestamp: Date.now(),
  };
  try {
    ctx.body = healthCheck;
  } catch (err) {
    ctx.throw(503, err instanceof Error ? err.message : "Unknown error");
  }
}
