import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectLocale, pdfLabels, docxLabels } from "../src/index.ts";

describe("detectLocale", () => {
  it("maps it- prefixed names to it, everything else to en", () => {
    assert.equal(detectLocale("it-cv.md"), "it");
    assert.equal(detectLocale("en-cv.md"), "en");
    assert.equal(detectLocale("cv.md"), "en");
  });
  it("uses the basename, ignoring directories", () => {
    assert.equal(detectLocale("/a/b/it-projects.md"), "it");
    assert.equal(detectLocale("a/b/en-cv.md"), "en");
  });
});

describe("label values", () => {
  it("pdfLabels carries the per-locale wording", () => {
    assert.equal(pdfLabels("en").experience, "Experience");
    assert.equal(pdfLabels("it").experience, "Esperienza");
    assert.equal(pdfLabels("it").otherSkills, "Altre competenze");
  });
  it("docxLabels carries the ATS wording", () => {
    assert.equal(docxLabels("en").experience, "Professional Experience");
    assert.equal(docxLabels("it").selectedTechnologies, "Tecnologie principali");
  });
});
