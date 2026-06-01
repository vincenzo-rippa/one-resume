import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseProjects } from "../src/parseProjects.ts";

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
  content: string; // content.json relative to SITE_LOCALES_DIR
}

const FIXTURES: Fixture[] = [
  {
    name: "en",
    markdown: "projects/en-projects.md",
    content: "en/content.json",
  },
  {
    name: "it",
    markdown: "projects/it-projects.md",
    content: "it/content.json",
  },
];

describe("projects-parser fixtures", () => {
  for (const f of FIXTURES) {
    it(`parses ${f.name}`, () => {
      const md = readFileSync(resolve(CONTENT_DIR, f.markdown), "utf8");
      const parsed = parseProjects(md, { file: f.markdown });

      // Structural sanity.
      assert.ok(parsed.length > 0);
      for (const p of parsed) {
        assert.equal(typeof p.title, "string");
        assert.ok(p.title.length > 0);
        assert.equal(typeof p.description, "string");
        assert.ok(Array.isArray(p.highlights));
        assert.ok(Array.isArray(p.technologies));
      }

      // Staleness guard: the generated content JSON must match the parser.
      const content = JSON.parse(
        readFileSync(resolve(SITE_LOCALES_DIR, f.content), "utf8"),
      );
      assert.deepStrictEqual(
        parsed,
        content.projects,
        `projects diverge from ${f.content}`,
      );
    });
  }
});
