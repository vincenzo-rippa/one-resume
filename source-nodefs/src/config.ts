import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/** Repo root (one-resume), derived from this file's location (src/ in source-nodefs). */
export const REPO_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

let envLoaded = false;

/** Load the repo-root `.env` once (idempotent; a no-op when absent). */
export function loadEnv(): void {
  if (envLoaded) return;
  const envFile = resolve(REPO_ROOT, ".env");
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  envLoaded = true;
}

/** Resolve an env var to an absolute dir, else the fallback. Loads `.env` first. */
export function envDir(name: string, fallback: string): string {
  loadEnv();
  const value = process.env[name];
  return value ? resolve(value) : fallback;
}

/**
 * Resolved external locations for the pipeline — the single seam for every
 * env-configurable path. Defaults assume the side-by-side repo layout
 * (one-resume / pro-profile-source / pro-landing); override via `.env` at the
 * repo root (see .env.example).
 */
export interface PipelineConfig {
  repoRoot: string;
  /** Markdown sources (CONTENT_DIR). */
  contentDir: string;
  /** Where the 4 public PDFs are written (SITE_PUBLIC_CV_DIR). */
  sitePublicCvDir: string;
  /** Where the site's content.json is written (SITE_LOCALES_DIR). */
  siteLocalesDir: string;
  /** Base dir for private outputs — printed/pdf, printed/ats (PRINTED_DIR). */
  printedDir: string;
}

export function loadConfig(): PipelineConfig {
  loadEnv();
  return {
    repoRoot: REPO_ROOT,
    contentDir: envDir(
      "CONTENT_DIR",
      resolve(REPO_ROOT, "..", "pro-profile-source"),
    ),
    sitePublicCvDir: envDir(
      "SITE_PUBLIC_CV_DIR",
      resolve(REPO_ROOT, "..", "pro-landing", "public", "cv"),
    ),
    siteLocalesDir: envDir(
      "SITE_LOCALES_DIR",
      resolve(REPO_ROOT, "..", "pro-landing", "src", "lib", "locales"),
    ),
    printedDir: envDir("PRINTED_DIR", resolve(REPO_ROOT, "printed")),
  };
}
