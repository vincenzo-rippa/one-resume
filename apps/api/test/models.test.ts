import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ContentQuery, RenderRequest } from "../src/models.ts";

// The request validators — chiefly the safe-`.md`-path rule that keeps a request
// from reaching outside the content repo (traversal / absolute paths).
describe("ContentQuery", () => {
  it("accepts a relative .md cv, with projects optional", () => {
    assert.equal(
      ContentQuery.safeParse({ cv: "cv/main/en-cv.md" }).success,
      true,
    );
    assert.equal(
      ContentQuery.safeParse({ cv: "cv/en.md", projects: "projects/en.md" })
        .success,
      true,
    );
  });

  it("rejects traversal, absolute, drive, non-.md, empty, and missing cv", () => {
    const bad = [
      "../secret.md",
      "/etc/passwd.md",
      "C:\\Windows\\x.md",
      "\\\\server\\share\\x.md",
      "\\x.md",
      "cv/en-cv.txt",
      "",
      undefined,
    ];
    for (const cv of bad) {
      assert.equal(
        ContentQuery.safeParse({ cv }).success,
        false,
        `expected reject for cv=${String(cv)}`,
      );
    }
  });

  it("rejects an unsafe projects path even when cv is valid", () => {
    assert.equal(
      ContentQuery.safeParse({ cv: "cv/en.md", projects: "../x.md" }).success,
      false,
    );
  });

  it("rejects a repeated param (array)", () => {
    assert.equal(
      ContentQuery.safeParse({ cv: ["a.md", "b.md"] }).success,
      false,
    );
  });
});

describe("RenderRequest", () => {
  it("accepts a single { type, input } job", () => {
    assert.equal(
      RenderRequest.safeParse({ type: "cv", input: "cv/en.md" }).success,
      true,
    );
    assert.equal(
      RenderRequest.safeParse({ type: "projects", input: "projects/en.md" })
        .success,
      true,
    );
  });

  it("rejects a bad type, a missing input, an unsafe path, or an array", () => {
    assert.equal(
      RenderRequest.safeParse({ type: "bogus", input: "cv/en.md" }).success,
      false,
    );
    assert.equal(RenderRequest.safeParse({ type: "cv" }).success, false);
    assert.equal(
      RenderRequest.safeParse({ type: "cv", input: "../x.md" }).success,
      false,
    );
    assert.equal(
      RenderRequest.safeParse([{ type: "cv", input: "cv/en.md" }]).success,
      false,
    );
  });
});
