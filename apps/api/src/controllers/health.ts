import type { RouterContext } from "@koa/router";

export async function health(ctx: RouterContext): Promise<void> {
  // optional: add further things to check (e.g. connecting to dababase)
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
