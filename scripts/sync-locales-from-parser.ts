/**
 * Content-gen: writes the pro-landing site's per-language content JSON from the
 * CV + projects markdown in the content repo.
 *
 * Run:  npm run cv:sync-locales        (add --dry-run to print instead of write)
 *
 * For each language it parses the CV markdown (→ cvData + experiences +
 * education) and the projects markdown (→ projects), then writes a single
 * `content.json` — the raw parser output, untransformed. The site reads that
 * JSON in src/lib/content-source.ts and maps it to its own UI shapes. Nothing
 * here renders TypeScript; it is a plain `JSON.stringify` to a file.
 *
 * Source markdown is read from CONTENT_DIR and the JSON is written under
 * SITE_LOCALES_DIR — both env-configurable (.env at the repo root; see
 * .env.example). Sidecars (ATS keywords + contact ariaLabels) live next to each
 * CV markdown file as <name>.meta.yaml.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCv } from "../cv-parser/src/parse.ts";
import { parseProjects } from "../cv-parser/src/parseProjects.ts";
import { loadSidecarFor } from "../cv-parser/src/sidecar.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOOLS_ROOT = resolve(__dirname, "..");

// The markdown sources and the site we write the content JSON into are in
// SIBLING repos, not inside this one, so both come from env vars (loaded from an
// optional .env at the repo root). Defaults assume the standard side-by-side
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

interface Target {
  /** CV markdown, relative to CONTENT_DIR. */
  cv: string;
  /** Projects markdown, relative to CONTENT_DIR. */
  projects: string;
  /** Output JSON, relative to SITE_LOCALES_DIR. */
  out: string;
}

const TARGETS: Target[] = [
  {
    cv: "cv/main/en-cv.md",
    projects: "projects/en-projects.md",
    out: "en/content.json",
  },
  {
    cv: "cv/main/it-cv.md",
    projects: "projects/it-projects.md",
    out: "it/content.json",
  },
];

/** Parse a language's markdown into the raw content object the site consumes. */
function buildContent(target: Target) {
  const cvPath = resolve(CONTENT_DIR, target.cv);
  const { cvData, experiences, education } = parseCv(
    readFileSync(cvPath, "utf8"),
    { file: target.cv, sidecar: loadSidecarFor(cvPath) },
  );
  const projects = parseProjects(
    readFileSync(resolve(CONTENT_DIR, target.projects), "utf8"),
    { file: target.projects },
  );
  return { cvData, experiences, education, projects };
}

function main(): void {
  const dryRun = process.argv.includes("--dry-run");

  for (const target of TARGETS) {
    const json = JSON.stringify(buildContent(target), null, 2) + "\n";

    if (dryRun) {
      console.log(`--- ${target.out} ---`);
      console.log(json);
      continue;
    }

    const outPath = resolve(SITE_LOCALES_DIR, target.out);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, json, "utf8");
    console.log(`✓ ${outPath}`);
  }
}

main();
