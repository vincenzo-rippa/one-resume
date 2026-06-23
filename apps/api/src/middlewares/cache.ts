import type { Context, Next, Middleware } from "koa";

/**
 * Disable response caching across the API — a deliberate choice (see the README).
 *
 * The service is consumed by a single authenticated static-site build that wants
 * fresh data each run, and its source (the content repo) is mutable. Without this,
 * a 200 GET like `/v1/content` carries NO `Cache-Control` and is therefore
 * *heuristically* cacheable (RFC 9111 §4.2.2) — "no header" does not mean "do not
 * cache". `no-store` stops any client or intermediary from serving a stale
 * response (and from caching error responses such as a heuristically-cacheable
 * 404). The render endpoints are POST, which caches don't store by default, but
 * applying it uniformly keeps the "no caching" guarantee simple.
 */
export function NoStoreMiddleware(): Middleware {
  return (ctx: Context, next: Next) => {
    ctx.set("Cache-Control", "no-store");
    return next();
  };
}
