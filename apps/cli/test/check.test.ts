import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { staleKeys } from "../src/commands/parse.ts";

// The comparison behind `one-resume parse --check`: which top-level keys of a
// freshly-parsed doc differ from an existing JSON. (The surrounding file I/O and
// process.exit are CLI wiring and not unit-tested here.)
describe("staleKeys", () => {
  it("returns [] when fresh equals existing", () => {
    const a = { profile: { name: "Jane" }, footer: "f", keywords: ["a"] };
    assert.deepEqual(staleKeys(a, structuredClone(a)), []);
  });

  it("compares deeply — nested-but-equal is not stale", () => {
    const fresh = { profile: { name: "Jane", tags: ["a", "b"] } };
    const existing = { profile: { name: "Jane", tags: ["a", "b"] } };
    assert.deepEqual(staleKeys(fresh, existing), []);
  });

  it("lists every differing top-level key, in order", () => {
    const fresh = { profile: { name: "Jane" }, footer: "new", keywords: ["a"] };
    const existing = { profile: { name: "Jane" }, footer: "old", keywords: [] };
    assert.deepEqual(staleKeys(fresh, existing), ["footer", "keywords"]);
  });

  it("treats a key missing from existing as stale", () => {
    assert.deepEqual(staleKeys({ footer: "f" }, {}), ["footer"]);
  });

  it("ignores keys present only in existing (checks fresh's keys)", () => {
    assert.deepEqual(staleKeys({ a: 1 }, { a: 1, extra: 2 }), []);
  });
});
