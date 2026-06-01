import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCv } from "../src/parse.ts";
import { loadSidecarFor } from "../src/sidecar.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOOLS_ROOT = resolve(__dirname, "../..");

// Markdown sources and the site's generated content JSON live in sibling
// repos, not inside this one, so their locations come from env vars (loaded from
// an optional .env at the repo root). Defaults assume the standard side-by-side
// layout: one-resume / pro-profile-source / pro-landing. See .env.example.
const envFile = resolve(TOOLS_ROOT, ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);

function envDir(name: string, fallback: string): string {
  const value = process.env[name];
  return value ? resolve(value) : fallback;
}

const CONTENT_DIR = envDir(
  "CONTENT_DIR",
  resolve(TOOLS_ROOT, "..", "pro-profile-source"),
);
const SITE_LOCALES_DIR = envDir(
  "SITE_LOCALES_DIR",
  resolve(TOOLS_ROOT, "..", "pro-landing", "src", "lib", "locales"),
);

interface Fixture {
  name: string;
  markdown: string; // relative to CONTENT_DIR
  content?: string; // content.json relative to SITE_LOCALES_DIR; undefined → structural parse check only
  /** Minimum number of embedded `Selected Projects` entries expected (freelance only). */
  minProjects?: number;
}

const FIXTURES: Fixture[] = [
  {
    name: "main / en",
    markdown: "cv/main/en-cv.md",
    content: "en/content.json",
  },
  {
    name: "main / it",
    markdown: "cv/main/it-cv.md",
    content: "it/content.json",
  },
  {
    // Derived variants keep their markdown sources but are not emitted into the
    // site's content JSON — structural parse check only.
    name: "derived / it-mobile",
    markdown: "cv/derived/it-cv-mobile.md",
  },
  {
    name: "derived / it-backend",
    markdown: "cv/derived/it-cv-backend.md",
  },
  {
    // Not in the content JSON — verify it parses cleanly.
    name: "derived / en-mobile",
    markdown: "cv/derived/en-cv-mobile.md",
  },
  {
    // Freelance CV: H2 + bullet-list technologies, embedded Selected Projects
    // section after Education. Not in the content JSON — structural sanity only.
    name: "freelance / en",
    markdown: "freelance/en-cv-freelance.md",
    minProjects: 4,
  },
];

describe("cv-parser fixtures", () => {
  for (const f of FIXTURES) {
    it(`parses ${f.name}`, () => {
      const mdPath = resolve(CONTENT_DIR, f.markdown);
      const md = readFileSync(mdPath, "utf8");
      const sidecar = loadSidecarFor(mdPath);

      if (!f.content) {
        // Just verify it parses without throwing; no content comparison.
        const parsed = parseCv(md, { file: f.markdown, sidecar });
        if (f.minProjects !== undefined) {
          assert.ok(
            parsed.projects.length >= f.minProjects,
            `expected at least ${f.minProjects} embedded projects, got ${parsed.projects.length}`,
          );
        }
        return;
      }

      const content = JSON.parse(
        readFileSync(resolve(SITE_LOCALES_DIR, f.content), "utf8"),
      );

      const parsed = parseCv(md, { file: f.markdown, sidecar });

      // Structural sanity.
      assert.equal(typeof parsed.cvData.name, "string");
      assert.ok(parsed.cvData.name.length > 0);
      assert.ok(parsed.experiences.length > 0);
      assert.ok(parsed.education.length > 0);

      // Staleness guard: the generated content JSON must match the parser.
      assert.deepStrictEqual(
        parsed.cvData,
        content.cvData,
        `cvData diverges from ${f.content}`,
      );
      assert.deepStrictEqual(
        parsed.experiences,
        content.experiences,
        `experiences diverge from ${f.content}`,
      );
      assert.deepStrictEqual(
        parsed.education,
        content.education,
        `education diverges from ${f.content}`,
      );
    });
  }
});
