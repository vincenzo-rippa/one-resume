import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { postPdfRender } from "../src/controllers/render.ts";
import { IoError } from "../src/errors.ts";

// The /v1/pdf controller's guard branches — the ones that don't need typst:
// unavailable renderer → 503, parse failure → 422, bad body → ZodError (→ 400).
// The happy render path (real typst) is covered by the pdf package + manual smoke.

interface CtxLike {
  request: { body: unknown };
  pdfRenderer: unknown;
  documentSource: { read(path: string): Promise<string> };
  attachment(name: string): void;
  body?: unknown;
}

function makeCtx(
  body: unknown,
  pdfRenderer: unknown,
  files: Record<string, string> = {},
): CtxLike {
  return {
    request: { body },
    pdfRenderer,
    documentSource: {
      read: async (p: string) => {
        const md = files[p];
        if (md === undefined) {
          const e = new Error(`not found: ${p}`) as Error & { status: number };
          e.status = 404;
          throw e;
        }
        return md;
      },
    },
    attachment() {},
  };
}

describe("postPdfRender guards", () => {
  it("responds 503 when the renderer was unavailable at boot (null)", async () => {
    const ctx = makeCtx({ type: "cv", input: "cv.md" }, null);
    await assert.rejects(
      postPdfRender(ctx as never),
      (e) => e instanceof IoError && e.status === 503,
    );
  });

  it("maps a parse failure to a 422 (renderer present)", async () => {
    const ctx = makeCtx({ type: "cv", input: "bad.md" }, {}, {
      "bad.md": "## not a CV\n",
    });
    await assert.rejects(
      postPdfRender(ctx as never),
      (e) => e instanceof IoError && e.status === 422,
    );
  });

  it("rejects an invalid body before touching the renderer", async () => {
    const ctx = makeCtx({ type: "bogus", input: "cv.md" }, null);
    // ZodError (the ErrorMiddleware turns it into a 400) — not an IoError 503.
    await assert.rejects(postPdfRender(ctx as never), (e) => !(e instanceof IoError));
  });
});
