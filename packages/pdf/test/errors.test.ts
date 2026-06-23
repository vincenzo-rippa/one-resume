import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PdfError } from "../src/index.ts";

// PDF rendering shells out to typst, so it's covered by end-to-end smokes, not
// here. This unit covers the package's only pure logic: PdfError.
describe("PdfError", () => {
  it("is an Error carrying message + optional cause", () => {
    const e = new PdfError("boom", { cause: 502 });
    assert.ok(e instanceof Error);
    assert.equal(e.name, "PdfError");
    assert.equal(e.message, "boom");
    assert.equal(e.cause, 502);
  });
});
