import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { resolveKind, defaultDocxOut } from "../src/lib/helpers.ts";

describe("resolveKind", () => {
  it("infers projects from a filename containing 'projects'", () => {
    assert.equal(resolveKind("projects/en-projects.md"), "projects");
  });

  it("infers cv for anything else", () => {
    assert.equal(resolveKind("cv/main/en-cv.md"), "cv");
    assert.equal(resolveKind("cv/derived/en-cv-freelance.md"), "cv");
  });

  it("lets --template override the filename heuristic", () => {
    assert.equal(resolveKind("en-projects.md", "cv"), "cv");
    assert.equal(resolveKind("en-cv.md", "projects"), "projects");
  });

  it("accepts 'main' as an alias for cv", () => {
    assert.equal(resolveKind("en-projects.md", "main"), "cv");
  });
});

describe("defaultDocxOut", () => {
  it("mirrors the content subfolder under atsRoot, suffixed -ats.docx", () => {
    const out = defaultDocxOut("/content", "/ats", "/content/cv/main/en-cv.md");
    assert.equal(out, resolve("/ats", "cv/main", "en-cv-ats.docx"));
  });
});
