// Shared Typst compilation: writes the JSON payload into the template's .cache
// dir and shells out to the `typst` CLI. Both the main build (scripts/build.ts)
// and the isolated special build (src/special/build.ts) go through here.

import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Templates and fonts are bundled in this package (src/ → package root).
export const PACKAGE_ROOT = resolve(__dirname, "..");
export const TEMPLATES_DIR = resolve(PACKAGE_ROOT, "templates");
export const CACHE_DIR = resolve(TEMPLATES_DIR, ".cache");
export const FONTS_DIR = resolve(PACKAGE_ROOT, "fonts");

/**
 * A cache path under the Typst template dir, addressable from a template as
 * `.cache/<name>`. Used for the photo copied next to the special template.
 */
export function cachePath(ext: string): { abs: string; templateRel: string } {
  mkdirSync(CACHE_DIR, { recursive: true });
  const name = randomUUID() + ext;
  return { abs: resolve(CACHE_DIR, name), templateRel: ".cache/" + name };
}

/**
 * Compile `template`.typ with `payload` injected as `data`, writing `pdfOut`.
 *
 * The payload is written to a temp JSON in the template's .cache dir (Typst
 * reads it via `--input data=.cache/<uuid>.json`). `extraTempFiles` (e.g. a
 * copied photo) are removed alongside the JSON after compilation.
 *
 * --font-path + --ignore-system-fonts pin rendering to the repo-bundled Inter
 * family, so the PDF is identical across machines regardless of installed fonts.
 */
export function compileTypst(opts: {
  payload: unknown;
  template: string;
  pdfOut: string;
  extraTempFiles?: string[];
}): void {
  const { payload, template, pdfOut, extraTempFiles = [] } = opts;

  mkdirSync(CACHE_DIR, { recursive: true });
  const cacheFile = resolve(CACHE_DIR, randomUUID() + ".json");
  const tempFiles = [cacheFile, ...extraTempFiles];
  const dataArg = ".cache/" + basename(cacheFile);
  writeFileSync(cacheFile, JSON.stringify(payload, null, 2), "utf8");

  mkdirSync(dirname(pdfOut), { recursive: true });

  const templateFile = resolve(TEMPLATES_DIR, template + ".typ");
  // On Windows append `.exe` so spawn finds the binary without a shell
  // (avoids Node DEP0190).
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
}
