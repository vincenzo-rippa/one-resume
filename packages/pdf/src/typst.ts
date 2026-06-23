// Low-level Typst invocation: writes the JSON payload into the template's .cache
// dir and shells out to the `typst` CLI, pinned to the repo-bundled Inter fonts.
// The `PdfRenderer` class (renderer.ts) is the only public entry point; this module
// is its mechanism.

import { mkdir, writeFile, rm } from "node:fs/promises";
import { resolve, dirname, basename } from "node:path";
import { spawn, spawnSync } from "node:child_process";
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
 * Reachability probe: `typst --version`. A clean exit proves the binary is
 * present and runnable. Throws `PdfError` otherwise — this is the constructor
 * gate for `PdfRenderer`.
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
 * Typst's own diagnostics go to inherited stdio; a non-zero exit rejects with
 * PdfError. Async (non-blocking `spawn`) so a server can drive the renderer
 * without stalling its event loop while Typst runs.
 */
export async function compile(
  bin: string,
  opts: {
    payload: unknown;
    template: string;
    pdfOut: string;
    extraTempFiles?: string[];
  },
): Promise<void> {
  const { payload, template, pdfOut, extraTempFiles = [] } = opts;

  await mkdir(CACHE_DIR, { recursive: true });
  const cacheFile = resolve(CACHE_DIR, randomUUID() + ".json");
  const tempFiles = [cacheFile, ...extraTempFiles];
  const dataArg = ".cache/" + basename(cacheFile);
  await writeFile(cacheFile, JSON.stringify(payload, null, 2), "utf8");

  await mkdir(dirname(pdfOut), { recursive: true });

  const templateFile = resolve(TEMPLATES_DIR, template + ".typ");
  try {
    await runTypst(
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
      template,
    );
  } finally {
    // Clean up temp files (JSON + any written photo) regardless of outcome.
    await Promise.all(
      tempFiles.map((f) => rm(f, { force: true }).catch(() => {})),
    );
  }
}

/**
 * Spawn `typst` and resolve on a clean exit. Uses async `spawn` (not
 * `spawnSync`) so the Node event loop stays free while Typst runs — essential
 * when the renderer is driven by a server handling concurrent requests. A spawn
 * failure (e.g. a missing binary) or a non-zero exit rejects with `PdfError`.
 */
function runTypst(
  bin: string,
  args: string[],
  template: string,
): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(bin, args, { stdio: "inherit" });
    child.once("error", (err) =>
      reject(
        new PdfError(`typst invocation failed for ${template}`, { cause: err }),
      ),
    );
    child.once("close", (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(
          new PdfError(`typst exited with code ${code} for ${template}`, {
            cause: code,
          }),
        );
      }
    });
  });
}
