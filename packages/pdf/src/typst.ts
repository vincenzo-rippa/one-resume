// Low-level Typst invocation: writes the JSON payload into the template's .cache
// dir and shells out to the `typst` CLI, pinned to the repo-bundled Inter fonts.
// The `TypstPdf` class (typstPdf.ts) is the only public entry point; this module
// is its mechanism.

import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { PdfError } from "./errors.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Templates and fonts are bundled in this package (src/ → package root).
export const PACKAGE_ROOT = resolve(__dirname, "..");
export const TEMPLATES_DIR = resolve(PACKAGE_ROOT, "templates");
export const CACHE_DIR = resolve(TEMPLATES_DIR, ".cache");
export const FONTS_DIR = resolve(PACKAGE_ROOT, "fonts");

/**
 * A cache path under the Typst template dir, addressable from a template as
 * `.cache/<name>`. Used for the photo written next to the special template.
 */
export function cachePath(ext: string): { abs: string; templateRel: string } {
  mkdirSync(CACHE_DIR, { recursive: true });
  const name = randomUUID() + ext;
  return { abs: resolve(CACHE_DIR, name), templateRel: ".cache/" + name };
}

/**
 * Reachability probe: `typst --version`. A clean exit proves the binary is
 * present and runnable. Throws `PdfError` otherwise — this is the constructor
 * gate for `TypstPdf`.
 */
export function preflight(bin: string): void {
  const result = spawnSync(bin, ["--version"], { stdio: "ignore" });
  if (result.error || result.status !== 0) {
    throw new PdfError(
      `typst not reachable via \`${bin}\` — install from https://typst.app/docs/install`,
      { cause: result.error ?? result.status },
    );
  }
}

/**
 * Compile `template`.typ with `payload` injected as `data`, writing `pdfOut`.
 *
 * The payload is written to a temp JSON in the template's .cache dir (Typst
 * reads it via `--input data=.cache/<uuid>.json`). `extraTempFiles` (e.g. a
 * written photo) are removed alongside the JSON after compilation.
 *
 * --font-path + --ignore-system-fonts pin rendering to the repo-bundled Inter
 * family, so the PDF is identical across machines regardless of installed fonts.
 * Typst's own diagnostics go to inherited stdio; a non-zero exit throws PdfError.
 */
export function compile(
  bin: string,
  opts: {
    payload: unknown;
    template: string;
    pdfOut: string;
    extraTempFiles?: string[];
  },
): void {
  const { payload, template, pdfOut, extraTempFiles = [] } = opts;

  mkdirSync(CACHE_DIR, { recursive: true });
  const cacheFile = resolve(CACHE_DIR, randomUUID() + ".json");
  const tempFiles = [cacheFile, ...extraTempFiles];
  const dataArg = ".cache/" + basename(cacheFile);
  writeFileSync(cacheFile, JSON.stringify(payload, null, 2), "utf8");

  mkdirSync(dirname(pdfOut), { recursive: true });

  const templateFile = resolve(TEMPLATES_DIR, template + ".typ");
  const result = spawnSync(
    bin,
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

  // Clean up temp files (JSON + any written photo) regardless of outcome.
  for (const f of tempFiles) {
    try {
      rmSync(f);
    } catch {}
  }

  if (result.error) {
    throw new PdfError(`typst invocation failed for ${template}`, {
      cause: result.error,
    });
  }
  if (result.status !== 0) {
    throw new PdfError(
      `typst exited with code ${result.status} for ${template}`,
      { cause: result.status },
    );
  }
}
