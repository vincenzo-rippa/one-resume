#!/usr/bin/env node
/**
 * CV / freelance / projects ATS DOCX build wrapper.
 *
 * Usage (via root package.json):
 *   npm run cv:ats:all                          (every parser-known DOCX → PRINTED_DIR/ats)
 *   npm run cv:ats -- --input <path-to-md> [--template main|freelance|projects] [--out out.docx]
 *
 * `--input`/`--out` resolve against the cwd; --all resolves markdown from
 * CONTENT_DIR and writes under PRINTED_DIR — both env-configurable (.env at the
 * repo root; see .env.example).
 *
 * Template is auto-selected from the input filename and can be overridden
 * with `--template`:
 *   - filename contains "freelance" → freelance (CV + embedded projects)
 *   - filename contains "projects"  → projects (standalone)
 *   - otherwise                     → main (covers main + derived CVs)
 *
 * Output:
 *   --out <path>    write to <path> (mirrors cv-pdf's --out semantics)
 *   otherwise       printed/ats/<content-subpath>/<basename>-ats.docx
 *
 * Architectural note: this script does NOT carry parsing logic. It calls the
 * cv-parser to obtain a typed payload per template and hands it to the docx
 * renderer in cv-ats/src/render.ts. Parse failures abort the build.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { basename, dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCv } from "../../cv-parser/src/parse.ts";
import { parseProjects } from "../../cv-parser/src/parseProjects.ts";
import { loadSidecarFor } from "../../cv-parser/src/sidecar.ts";
import { LABELS, type Lang } from "../src/labels.ts";
import { renderCv, renderProjects, writeDocx } from "../src/render.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Paths ──────────────────────────────────────────────────────────────────
//
// The markdown sources live in a SIBLING repo, not inside this one, so their
// location comes from CONTENT_DIR (loaded from an optional .env at the repo
// root). DOCX outputs are private — they go under PRINTED_DIR, defaulting to
// ./printed inside this repo. See .env.example. Defaults assume the standard
// side-by-side layout: one-resume / pro-profile-source.
const PACKAGE_ROOT = resolve(__dirname, "..");
const TOOLS_ROOT = resolve(PACKAGE_ROOT, "..");

const envFile = resolve(TOOLS_ROOT, ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);

function envDir(name: string, fallback: string): string {
  const value = process.env[name];
  return value ? resolve(value) : fallback;
}

const CONTENT_ROOT = envDir(
  "CONTENT_DIR",
  resolve(TOOLS_ROOT, "..", "pro-profile-source"),
);
const PRINTED_DIR = envDir("PRINTED_DIR", resolve(TOOLS_ROOT, "printed"));
const OUTPUT_DIR = resolve(PRINTED_DIR, "ats");

type Kind = "main" | "freelance" | "projects";

function detectLang(mdPath: string): Lang {
  return basename(mdPath).startsWith("it-") ? "it" : "en";
}

function resolveKind(mdPath: string, flag?: string): Kind {
  if (flag === "main" || flag === "freelance" || flag === "projects") {
    return flag;
  }
  const name = basename(mdPath);
  if (name.includes("freelance")) return "freelance";
  if (name.includes("projects")) return "projects";
  return "main";
}

/**
 * Mirrors the content/ subfolder structure under printed/ats/ and suffixes the
 * basename with `-ats.docx`. E.g.:
 *   content/cv/main/en-cv.md          → printed/ats/cv/main/en-cv-ats.docx
 *   content/cv/derived/it-cv-mobile.md → printed/ats/cv/derived/it-cv-mobile-ats.docx
 *   content/freelance/en-cv-freelance.md → printed/ats/freelance/en-cv-freelance-ats.docx
 *   content/projects/en-projects.md   → printed/ats/projects/en-projects-ats.docx
 */
function defaultOutPath(mdPath: string): string {
  const rel = relative(CONTENT_ROOT, mdPath);
  const subdir = dirname(rel);
  const base = basename(mdPath, extname(mdPath));
  return resolve(OUTPUT_DIR, subdir, `${base}-ats.docx`);
}

interface BuildOneOpts {
  inputPath: string;
  templateFlag?: string;
  outPath?: string;
}

async function buildOne(opts: BuildOneOpts): Promise<void> {
  const { inputPath, templateFlag, outPath } = opts;

  const mdPath = resolve(process.cwd(), inputPath);
  const lang = detectLang(mdPath);
  const kind = resolveKind(mdPath, templateFlag);
  const docxOut = outPath
    ? resolve(process.cwd(), outPath)
    : defaultOutPath(mdPath);

  console.log(
    `→ ${basename(mdPath)}  [${lang}/${kind}]  →  ${relative(TOOLS_ROOT, docxOut)}`,
  );

  const md = readFileSync(mdPath, "utf8");
  const labels = LABELS[lang];

  let doc;
  if (kind === "projects") {
    const projects = parseProjects(md, { file: inputPath });
    doc = renderProjects(projects, labels);
  } else {
    const sidecar = loadSidecarFor(mdPath);
    const parsed = parseCv(md, { file: inputPath, sidecar });
    doc = renderCv(parsed, {
      labels,
      includeProjects: kind === "freelance",
    });
  }

  await writeDocx(doc, docxOut);
  console.log(`  ✓ ${docxOut}`);
}

/**
 * Builds every DOCX the parser knows about: main CVs, derived CVs, freelance,
 * and standalone projects. cv-special is intentionally excluded — it's a print
 * variant with photo + extras that have no place in an ATS document.
 */
async function buildAll(): Promise<void> {
  const dirs = [
    resolve(CONTENT_ROOT, "cv", "main"),
    resolve(CONTENT_ROOT, "cv", "derived"),
    resolve(CONTENT_ROOT, "projects"),
    resolve(CONTENT_ROOT, "freelance"),
  ];

  const mdFiles: string[] = [];
  for (const dir of dirs) {
    try {
      mdFiles.push(
        ...readdirSync(dir)
          .filter((f) => f.endsWith(".md"))
          .map((f) => resolve(dir, f)),
      );
    } catch {
      // Directory doesn't exist — skip silently.
    }
  }

  if (mdFiles.length === 0) {
    console.error("No markdown files found in content/");
    process.exit(1);
  }

  for (const mdPath of mdFiles) {
    await buildOne({ inputPath: mdPath });
  }
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function getFlag(name: string): string | undefined {
  const prefix = `--${name}=`;
  const inline = args.find((a) => a.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  return undefined;
}

async function main(): Promise<void> {
  if (args.includes("--all")) {
    await buildAll();
    return;
  }
  const inputPath = getFlag("input");
  if (!inputPath) {
    console.error(
      "Usage:\n" +
        "  tsx cv-ats/scripts/build.ts --input <path-to-md> [--template main|freelance|projects] [--out printed.docx]\n" +
        "  tsx cv-ats/scripts/build.ts --all",
    );
    process.exit(1);
  }
  await buildOne({
    inputPath,
    templateFlag: getFlag("template"),
    outPath: getFlag("out"),
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
