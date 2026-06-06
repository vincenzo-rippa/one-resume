/**
 * export-json — writes (or checks) the pro-landing site's per-language
 * content.json from the CV + projects markdown in the content repo.
 *
 *   npm run sync-locales                 write content.json for every target
 *   npm run sync-locales -- --dry-run    print instead of writing
 *   npm run sync-locales -- --check      fail if a committed content.json is stale
 *
 * Source markdown is read from CONTENT_DIR and the JSON is written under
 * SITE_LOCALES_DIR — both env-configurable (.env at the repo root; see
 * .env.example). The parse→object transform and the staleness check live in
 * src/ (content.ts / check.ts); this file is just the CLI + path resolution.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { FileSystemSource, loadConfig } from "source-nodefs";
import { TARGETS, buildContent } from "../src/content.ts";
import { checkContent } from "../src/check.ts";

// The markdown sources (CONTENT_DIR) and the site we write content JSON into
// (SITE_LOCALES_DIR) live in SIBLING repos; their locations come from the
// shared config seam (env-driven, loaded from an optional .env at the repo root).
const config = loadConfig();
const { contentDir: CONTENT_DIR, siteLocalesDir: SITE_LOCALES_DIR } = config;
const source = new FileSystemSource(CONTENT_DIR, config);

async function runWrite(dryRun: boolean): Promise<void> {
  for (const target of TARGETS) {
    const json =
      JSON.stringify(await buildContent(source, target), null, 2) + "\n";

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

async function runCheck(): Promise<void> {
  let stale = false;
  for (const target of TARGETS) {
    const result = await checkContent(source, target, SITE_LOCALES_DIR);
    if (result.status === "ok") {
      console.log(`✓ ${result.out} up to date`);
    } else if (result.status === "missing") {
      stale = true;
      console.error(`✗ ${result.out} missing — run \`npm run sync-locales\``);
    } else {
      stale = true;
      console.error(
        `✗ ${result.out} STALE (differs in: ${result.staleKeys?.join(", ")}) — run \`npm run sync-locales\``,
      );
    }
  }
  if (stale) process.exit(1);
  console.log("All content.json are up to date.");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("--check")) {
    await runCheck();
    return;
  }
  await runWrite(args.includes("--dry-run"));
}

main();
