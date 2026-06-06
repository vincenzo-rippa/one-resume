#!/usr/bin/env node
/**
 * CV / projects / special PDF build wrapper.
 *
 * Usage (via root package.json):
 *   npm run pdf:public                       (4 PDFs → SITE_PUBLIC_CV_DIR)
 *   npm run pdf:all                           (every parser-known PDF → PRINTED_DIR/pdf)
 *   npm run pdf:special                       (private Italian special CV → PRINTED_DIR/pdf)
 *   npm run pdf -- --input <path-to-md> [--template main|projects|freelance] [--out out.pdf]
 *
 * `--input`/`--out` are resolved against the current working dir. The bulk
 * targets (--public/--all) resolve markdown from CONTENT_DIR and write to
 * SITE_PUBLIC_CV_DIR / PRINTED_DIR — all configurable via env (.env at the repo
 * root); see .env.example.
 *
 * Template is auto-selected from the input filename (`*freelance*` → freelance,
 * `*projects*` → projects, everything else → main CV) and can be overridden
 * with --template.
 *
 * Architectural note: this script does NOT carry parsing logic. It calls the
 * core-parser (through a FileSystemSource) to obtain a typed payload per
 * template and shells out to typst. The private `special` variant — with its
 * extra YAML sidecar and photo — lives in its own module (src/special/),
 * invoked via --special.
 *
 * Requires the `typst` CLI on PATH.
 * Install: https://typst.app/docs/install  |  winget install Typst.Typst  |  brew install typst
 */

import { resolve, basename, extname } from "node:path";
import {
  FileSystemSource,
  loadConfig,
  loadParsedCv,
  loadParsedProjects,
} from "source-nodefs";
import { LABELS, detectLang } from "../src/labels.ts";
import { compileTypst } from "../src/compile.ts";
import { buildSpecial } from "../src/special/build.ts";

// ─── Paths ──────────────────────────────────────────────────────────────────
//
// Templates and fonts are bundled in this package (see src/compile.ts). The
// markdown sources and the website that ships the public PDFs live in SIBLING
// repos; their locations come from env vars (loaded from an optional .env at the
// repo root). Defaults assume the standard side-by-side layout under one parent
// dir: one-resume / pro-profile-source / pro-landing.
const config = loadConfig();
const {
  contentDir: CONTENT_DIR,
  sitePublicCvDir: PUBLIC_CV_DIR,
  printedDir: PRINTED_DIR,
} = config;
const OUTPUT_DIR = resolve(PRINTED_DIR, "pdf");
const source = new FileSystemSource(CONTENT_DIR, config);

// ─── Build kind / template resolution ─────────────────────────────────────────

type Kind = "cv" | "cv-freelance" | "projects";

function resolveBuild(
  mdPath: string,
  templateFlag?: string,
): { kind: Kind; template: string } {
  if (
    templateFlag === "freelance" ||
    (!templateFlag && basename(mdPath).includes("freelance"))
  ) {
    return { kind: "cv-freelance", template: "freelance" };
  }
  if (
    templateFlag === "projects" ||
    (!templateFlag && basename(mdPath).includes("projects"))
  ) {
    return { kind: "projects", template: "projects" };
  }
  return { kind: "cv", template: templateFlag ?? "main" };
}

// ─── Build one PDF ───────────────────────────────────────────────────────────

async function buildOne(opts: {
  inputPath: string;
  templateFlag?: string;
  outPath?: string;
}): Promise<void> {
  const { inputPath, templateFlag, outPath } = opts;

  const mdPath = resolve(process.cwd(), inputPath);
  const mdName = basename(mdPath, extname(mdPath));
  const lang = detectLang(mdPath);
  const { kind, template } = resolveBuild(mdPath, templateFlag);

  const pdfOut = outPath
    ? resolve(process.cwd(), outPath)
    : resolve(OUTPUT_DIR, mdName + ".pdf");

  console.log(
    `→ ${basename(mdPath)}  [${lang}/${kind}]  →  ${basename(pdfOut)}`,
  );

  // Assemble the JSON payload for the chosen template.
  let payload: unknown;
  if (kind === "projects") {
    payload = {
      projects: await loadParsedProjects(source, mdPath),
      labels: LABELS[lang],
    };
  } else {
    const parsed = await loadParsedCv(source, mdPath);
    const cvPayload = {
      profile: parsed.profile,
      footer: parsed.footer,
      experiences: parsed.experiences,
      education: parsed.education,
      keywords: parsed.keywords,
      labels: LABELS[lang],
    };
    // Freelance CVs ship the embedded Selected Projects section too.
    payload =
      kind === "cv-freelance"
        ? { ...cvPayload, projects: parsed.projects }
        : cvPayload;
  }

  compileTypst({ payload, template, pdfOut });
  console.log(`  ✓ ${pdfOut}`);
}

// ─── Build public assets ─────────────────────────────────────────────────────

/**
 * The 4 PDFs the Next.js site ships as static assets under `public/cv/`.
 * Updated by the pre-push hook so they stay in sync with the markdown sources.
 *
 * Everything else (derived CVs, freelance, cv-special) is private and lives
 * under `printed/` — `buildAll` covers it, but those PDFs are not committed.
 */
const PUBLIC_TARGETS: { input: string; out: string }[] = [
  { input: "cv/main/en-cv.md", out: "en.pdf" },
  { input: "cv/main/it-cv.md", out: "it.pdf" },
  { input: "projects/en-projects.md", out: "projects.pdf" },
  { input: "projects/it-projects.md", out: "progetti.pdf" },
];

async function buildPublic(): Promise<void> {
  for (const t of PUBLIC_TARGETS) {
    await buildOne({
      inputPath: resolve(CONTENT_DIR, t.input),
      outPath: resolve(PUBLIC_CV_DIR, t.out),
    });
  }
}

// ─── Build all ───────────────────────────────────────────────────────────────

/**
 * Builds every PDF the parser knows about: CV mains, CV derived variants,
 * projects, and freelance. cv-special is intentionally excluded (private;
 * needs sidecar + photo, must be invoked explicitly via --special).
 */
async function buildAll(): Promise<void> {
  const dirs = [
    resolve(CONTENT_DIR, "cv", "main"),
    resolve(CONTENT_DIR, "cv", "derived"),
    resolve(CONTENT_DIR, "projects"),
    resolve(CONTENT_DIR, "freelance"),
  ];

  const mdFiles: string[] = [];
  for (const dir of dirs) {
    try {
      const names = await source.list(dir);
      mdFiles.push(
        ...names.filter((f) => f.endsWith(".md")).map((f) => resolve(dir, f)),
      );
    } catch {
      // Directory doesn't exist — skip silently.
    }
  }

  if (mdFiles.length === 0) {
    console.error(`No markdown files found under ${CONTENT_DIR}`);
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
  if (args.includes("--public")) {
    await buildPublic();
  } else if (args.includes("--all")) {
    await buildAll();
  } else if (args.includes("--special")) {
    await buildSpecial(source, resolve(OUTPUT_DIR, "it-cv-special.pdf"));
  } else {
    const inputPath = getFlag("input");
    if (!inputPath) {
      console.error(
        "Usage:\n" +
          "  tsx export-pdf/scripts/build.ts --input <path-to-md> [--template main|projects|freelance] [--out output.pdf]\n" +
          "  tsx export-pdf/scripts/build.ts --public        (4 PDFs → SITE_PUBLIC_CV_DIR)\n" +
          "  tsx export-pdf/scripts/build.ts --all           (every parser-known PDF → PRINTED_DIR/pdf)\n" +
          "  tsx export-pdf/scripts/build.ts --special       (private Italian special CV → PRINTED_DIR/pdf)",
      );
      process.exit(1);
    }
    await buildOne({
      inputPath,
      templateFlag: getFlag("template"),
      outPath: getFlag("out"),
    });
  }
}

main();
