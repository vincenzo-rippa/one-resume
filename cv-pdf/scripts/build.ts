#!/usr/bin/env node
/**
 * CV / projects / special PDF build wrapper.
 *
 * Usage (via root package.json):
 *   npm run cv:pdf:public                       (4 PDFs → SITE_PUBLIC_CV_DIR)
 *   npm run cv:pdf:all                           (every parser-known PDF → PRINTED_DIR/pdf)
 *   npm run cv:pdf -- --input <path-to-md> [--template main|projects|special|freelance] [--out out.pdf]
 *
 * `--input`/`--out` are resolved against the current working dir. The bulk
 * targets (--public/--all/--special) resolve markdown from CONTENT_DIR and
 * write to SITE_PUBLIC_CV_DIR / PRINTED_DIR — all configurable via env (.env at
 * the repo root); see .env.example.
 *
 * Template is auto-selected from the input filename (`*projects*` → projects,
 * everything else → main CV) and can be overridden with --template.
 *
 * Architectural note: this script does NOT carry parsing logic. It calls the
 * cv-parser to obtain a typed payload per template and shells out to typst.
 * If the markdown / sidecar data fails to parse, the parser throws and the
 * build aborts — there's no fallback or coercion here.
 *
 * `special` is the private Italian CV variant. Its extras (city, headerExtra,
 * languages, otherSkills, photo) live in `${CONTENT_DIR}/special/{lang}-special.meta.yaml`
 * alongside the photo file.
 *
 * Requires the `typst` CLI on PATH.
 * Install: https://typst.app/docs/install  |  winget install Typst.Typst  |  brew install typst
 */

import {
  readFileSync,
  writeFileSync,
  copyFileSync,
  mkdirSync,
  rmSync,
  readdirSync,
  existsSync,
} from "node:fs";
import { resolve, dirname, basename, extname } from "node:path";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { parseCv } from "../../cv-parser/src/parse";
import { parseProjects } from "../../cv-parser/src/parseProjects";
import { loadSidecarFor } from "../../cv-parser/src/sidecar";
import { loadSpecialSidecar } from "../../cv-parser/src/loadSpecialSidecar";

const __dirname = dirname(__filename);

// ─── Paths ──────────────────────────────────────────────────────────────────
//
// Templates and fonts are bundled in this package. The markdown sources and the
// website that ships the public PDFs live in SIBLING repos, not inside this one,
// so their locations come from env vars (loaded from an optional .env at the
// repo root). Defaults assume the standard side-by-side layout under one parent
// dir: one-resume / pro-profile-source / pro-landing.
const PACKAGE_ROOT = resolve(__dirname, "..");
const TEMPLATES_DIR = resolve(PACKAGE_ROOT, "templates");
const CACHE_DIR = resolve(TEMPLATES_DIR, ".cache");
const FONTS_DIR = resolve(PACKAGE_ROOT, "fonts");
const TOOLS_ROOT = resolve(PACKAGE_ROOT, "..");

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
const PUBLIC_CV_DIR = envDir(
  "SITE_PUBLIC_CV_DIR",
  resolve(TOOLS_ROOT, "..", "pro-landing", "public", "cv"),
);
const PRINTED_DIR = envDir("PRINTED_DIR", resolve(TOOLS_ROOT, "printed"));
const OUTPUT_DIR = resolve(PRINTED_DIR, "pdf");
const SPECIAL_DIR = resolve(CONTENT_DIR, "special");

// ─── Section labels ─────────────────────────────────────────────────────────
//
// Pure UI strings (section titles, "Present"/"Presente"). Content fields
// (footer text, languages, etc.) are NOT here — those come from the parser.

const LABELS = {
  en: {
    about: "About",
    experience: "Experience",
    education: "Education",
    selectedTechnologies: "Selected Technologies",
    projects: "Selected Projects",
    technologies: "Technologies",
    portfolio: "Portfolio",
    ongoing: "Present",
    languages: "Languages",
    otherSkills: "Other skills",
  },
  it: {
    about: "About",
    experience: "Esperienza",
    education: "Formazione",
    selectedTechnologies: "Tecnologie Selezionate",
    projects: "Progetti Selezionati",
    technologies: "Tecnologie",
    portfolio: "Portfolio",
    ongoing: "Presente",
    languages: "Lingue",
    otherSkills: "Altre competenze",
  },
} as const;

type Lang = keyof typeof LABELS;

function detectLang(mdPath: string): Lang {
  return basename(mdPath).startsWith("it-") ? "it" : "en";
}

// ─── Build kind / template resolution ─────────────────────────────────────────

type Kind = "cv" | "cv-special" | "cv-freelance" | "projects";

function resolveBuild(
  mdPath: string,
  templateFlag?: string,
): { kind: Kind; template: string } {
  if (templateFlag === "special") {
    return { kind: "cv-special", template: "special" };
  }
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

// ─── cv-special data assembly ──────────────────────────────────────────────────

/**
 * Loads the special sidecar for `lang`, copies the referenced photo into the
 * Typst cache so `image()` can find it relative to the template, and returns
 * the JSON payload that the special.typ template expects. `tempFiles` collects
 * the cache paths so the caller can clean them up after compilation.
 */
function buildSpecialBlock(lang: Lang, tempFiles: string[]) {
  const sidecarPath = resolve(SPECIAL_DIR, `${lang}-special.meta.yaml`);
  const sidecar = loadSpecialSidecar(sidecarPath);

  // Photo lives next to the sidecar; copy into .cache for Typst path resolution.
  const photoSource = resolve(dirname(sidecarPath), sidecar.photo);
  const photoCache = resolve(CACHE_DIR, randomUUID() + extname(sidecar.photo));
  copyFileSync(photoSource, photoCache);
  tempFiles.push(photoCache);

  return {
    city: sidecar.city,
    headerExtra: sidecar.headerExtra,
    languages: sidecar.languages,
    otherSkills: sidecar.otherSkills,
    photo: ".cache/" + basename(photoCache),
  };
}

// ─── Build one PDF ───────────────────────────────────────────────────────────

function buildOne(opts: {
  inputPath: string;
  templateFlag?: string;
  outPath?: string;
}): void {
  const { inputPath, templateFlag, outPath } = opts;

  const mdPath = resolve(process.cwd(), inputPath);
  const mdName = basename(mdPath, extname(mdPath));
  const lang = detectLang(mdPath);
  const { kind, template } = resolveBuild(mdPath, templateFlag);

  const defaultOutName = kind === "cv-special" ? mdName + "-special" : mdName;
  const pdfOut = outPath
    ? resolve(process.cwd(), outPath)
    : resolve(OUTPUT_DIR, defaultOutName + ".pdf");

  console.log(
    `→ ${basename(mdPath)}  [${lang}/${kind}]  →  ${basename(pdfOut)}`,
  );

  const md = readFileSync(mdPath, "utf8");
  const tempFiles: string[] = [];
  mkdirSync(CACHE_DIR, { recursive: true });

  // Assemble the JSON payload for the chosen template.
  let payload: unknown;
  if (kind === "projects") {
    payload = {
      projects: parseProjects(md, { file: inputPath }),
      labels: LABELS[lang],
    };
  } else {
    const sidecar = loadSidecarFor(mdPath);
    const parsed = parseCv(md, { file: inputPath, sidecar });
    const cvPayload = {
      cvData: parsed.cvData,
      experiences: parsed.experiences,
      education: parsed.education,
      labels: LABELS[lang],
    };
    if (kind === "cv-special") {
      payload = {
        ...cvPayload,
        special: buildSpecialBlock(lang, tempFiles),
      };
    } else if (kind === "cv-freelance") {
      // Freelance CVs ship the embedded Selected Projects section too.
      payload = { ...cvPayload, projects: parsed.projects };
    } else {
      payload = cvPayload;
    }
  }

  // Write temp JSON (path relative to the template file).
  const cacheFile = resolve(CACHE_DIR, randomUUID() + ".json");
  tempFiles.push(cacheFile);
  const dataArg = ".cache/" + basename(cacheFile);
  writeFileSync(cacheFile, JSON.stringify(payload, null, 2), "utf8");

  mkdirSync(dirname(pdfOut), { recursive: true });

  // Compile via typst. On Windows, append `.exe` so spawn finds the binary
  // without going through a shell (avoids Node DEP0190).
  //
  // --font-path + --ignore-system-fonts pin rendering to the repo-bundled
  // Inter family, so the PDF is byte-identical across machines regardless of
  // which fonts each developer has installed.
  const templateFile = resolve(TEMPLATES_DIR, template + ".typ");
  const typstCmd = process.platform === "win32" ? "typst.exe" : "typst";
  const result = spawnSync(
    typstCmd,
    [
      "compile",
      "--font-path",
      FONTS_DIR,
      "--ignore-system-fonts",
      "--input",
      `data=${dataArg}`,
      templateFile,
      pdfOut,
    ],
    { stdio: "inherit", encoding: "utf8" },
  );

  // Clean up temp files (JSON + any copied photo) regardless of outcome.
  for (const f of tempFiles) {
    try {
      rmSync(f);
    } catch {}
  }

  if (result.error) {
    console.error(
      "typst not found — install from https://typst.app/docs/install",
    );
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

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

function buildPublic(): void {
  for (const t of PUBLIC_TARGETS) {
    buildOne({
      inputPath: resolve(CONTENT_DIR, t.input),
      outPath: resolve(PUBLIC_CV_DIR, t.out),
    });
  }
}

// ─── Build special assets ─────────────────────────────────────────────────────

const SPECIAL_TARGET: { input: string; out: string } = {
  input: "cv/main/it-cv.md",
  out: "it-cv-special.pdf",
};

function buildSpecial(): void {
  buildOne({
    inputPath: resolve(CONTENT_DIR, SPECIAL_TARGET.input),
    templateFlag: "special",
    outPath: resolve(OUTPUT_DIR, SPECIAL_TARGET.out),
  });
}

// ─── Build all ───────────────────────────────────────────────────────────────

/**
 * Builds every PDF the parser knows about: CV mains, CV derived variants,
 * projects, and freelance. cv-special is intentionally excluded (private;
 * needs sidecar + photo, must be invoked explicitly with --template special).
 */
function buildAll(): void {
  const dirs = [
    resolve(CONTENT_DIR, "cv", "main"),
    resolve(CONTENT_DIR, "cv", "derived"),
    resolve(CONTENT_DIR, "projects"),
    resolve(CONTENT_DIR, "freelance"),
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
    console.error(`No markdown files found under ${CONTENT_DIR}`);
    process.exit(1);
  }

  for (const mdPath of mdFiles) {
    buildOne({ inputPath: mdPath });
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

if (args.includes("--public")) {
  buildPublic();
} else if (args.includes("--all")) {
  buildAll();
} else if (args.includes("--special")) {
  buildSpecial();
} else {
  const inputPath = getFlag("input");
  if (!inputPath) {
    console.error(
      "Usage:\n" +
        "  tsx cv-pdf/scripts/build.ts --input <path-to-md> [--template main|projects|special|freelance] [--out output.pdf]\n" +
        "  tsx cv-pdf/scripts/build.ts --public        (4 PDFs → SITE_PUBLIC_CV_DIR)\n" +
        "  tsx cv-pdf/scripts/build.ts --all           (every parser-known PDF → PRINTED_DIR/pdf)\n" +
        "  tsx cv-pdf/scripts/build.ts --special       (only special CV → PRINTED_DIR/pdf)",
    );
    process.exit(1);
  }
  buildOne({
    inputPath,
    templateFlag: getFlag("template"),
    outPath: getFlag("out"),
  });
}
