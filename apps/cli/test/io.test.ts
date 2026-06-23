import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listMarkdown } from "../src/lib/io.ts";

// The `--all` enumeration: recursively collect *.md under a root as sorted,
// root-relative paths. Exercised against a temp tree.
describe("listMarkdown", () => {
  let root: string;

  before(async () => {
    root = await mkdtemp(join(tmpdir(), "one-resume-io-"));
    await mkdir(join(root, "cv", "main"), { recursive: true });
    await mkdir(join(root, "projects"), { recursive: true });
    await mkdir(join(root, "empty"), { recursive: true });
    await writeFile(join(root, "cv", "main", "en-cv.md"), "x");
    await writeFile(join(root, "cv", "main", "it-cv.md"), "x");
    await writeFile(join(root, "projects", "en-projects.md"), "x");
    await writeFile(join(root, "notes.md"), "x");
    await writeFile(join(root, "README.txt"), "x"); // non-md, ignored
  });

  after(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("returns *.md only, recursively, as sorted root-relative paths", async () => {
    assert.deepEqual(await listMarkdown(root), [
      join("cv", "main", "en-cv.md"),
      join("cv", "main", "it-cv.md"),
      "notes.md",
      join("projects", "en-projects.md"),
    ]);
  });

  it("returns [] for a non-existent root", async () => {
    assert.deepEqual(await listMarkdown(join(root, "nope")), []);
  });
});
