import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PdfError } from "../src/index.ts";
import { parseSpecialSidecar } from "../src/special/parseSpecialSidecar.ts";

// PDF rendering shells out to the typst binary, so it is proven by the golden
// harness (scripts/verify-baseline.sh), not here. This smoke covers the
// package's pure logic: the special-sidecar parser + PdfError.

const VALID = `city: Roma
headerExtra: LEGAL STATUS
otherSkills: Driving license
photo: me.jpg
languages:
  - label: Italian
    level: Native
  - label: English
    level: Fluent
`;

describe("parseSpecialSidecar", () => {
  it("parses a valid sidecar", () => {
    const s = parseSpecialSidecar(VALID, "it-special.meta.yaml");
    assert.equal(s.city, "Roma");
    assert.equal(s.photo, "me.jpg");
    assert.equal(s.languages.length, 2);
    assert.deepEqual(s.languages[0], { label: "Italian", level: "Native" });
  });

  it("throws PdfError with the offending field on a missing required key", () => {
    assert.throws(
      () => parseSpecialSidecar("headerExtra: X\n", "s.yaml"),
      (e: unknown) => {
        assert.ok(e instanceof PdfError);
        assert.equal(e.field, "city");
        assert.equal(e.sourceName, "s.yaml");
        return true;
      },
    );
  });

  it("throws PdfError when languages is empty", () => {
    assert.throws(
      () =>
        parseSpecialSidecar(
          "city: R\nheaderExtra: X\notherSkills: s\nphoto: p.jpg\nlanguages: []\n",
          "s.yaml",
        ),
      (e: unknown) => e instanceof PdfError && e.field === "languages",
    );
  });
});
