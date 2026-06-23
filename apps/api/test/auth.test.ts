import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { AuthMiddleware } from "../src/middlewares/auth.ts";

const SERVER_KEY = "a-sufficiently-long-test-key-1234567890";

interface CtxLike {
  request: { get(header: string): string };
  status?: number;
  body?: unknown;
}

function makeCtx(clientKey: string | undefined): CtxLike {
  return {
    request: {
      get: (header: string) =>
        header.toLowerCase() === "x-api-key" && clientKey !== undefined
          ? clientKey
          : "",
    },
  };
}

async function run(serverKey: string, clientKey: string | undefined) {
  const middleware = AuthMiddleware(serverKey);
  const ctx = makeCtx(clientKey);
  let nextCalled = false;
  await middleware(ctx as never, async () => {
    nextCalled = true;
  });
  return { ctx, nextCalled };
}

describe("AuthMiddleware", () => {
  it("calls next when the key matches", async () => {
    const { ctx, nextCalled } = await run(SERVER_KEY, SERVER_KEY);
    assert.equal(nextCalled, true);
    assert.equal(ctx.status, undefined);
  });

  it("rejects a missing X-API-KEY header with 401", async () => {
    const { ctx, nextCalled } = await run(SERVER_KEY, undefined);
    assert.equal(ctx.status, 401);
    assert.deepEqual(ctx.body, { error: "Missing X-API-KEY header" });
    assert.equal(nextCalled, false);
  });

  it("rejects a wrong key of equal length with 401", async () => {
    const { ctx, nextCalled } = await run(
      SERVER_KEY,
      "X".repeat(SERVER_KEY.length),
    );
    assert.equal(ctx.status, 401);
    assert.deepEqual(ctx.body, { error: "Invalid API key" });
    assert.equal(nextCalled, false);
  });

  it("rejects a wrong key of different length without throwing", async () => {
    const { ctx, nextCalled } = await run(SERVER_KEY, "short");
    assert.equal(ctx.status, 401);
    assert.equal(nextCalled, false);
  });

  it("exits at boot when the server key is missing or too short", () => {
    const exit = mock.method(process, "exit", ((): never => {
      throw new Error("process.exit called");
    }) as never);
    const error = mock.method(console, "error", () => {});
    try {
      assert.throws(() => AuthMiddleware(undefined), /process\.exit called/);
      assert.throws(() => AuthMiddleware("too-short"), /process\.exit called/);
    } finally {
      exit.mock.restore();
      error.mock.restore();
    }
  });
});
