// `one-resume sync` / `one-resume check` — the per-language content.json the
// pro-landing site consumes, built from CV + projects markdown.
//
//   one-resume sync [--dry-run]    write (or print) content.json for every target
//   one-resume check               fail if a committed content.json is stale

import { resolve } from "node:path";
import { buildContent } from "@one-resume/content";
import { checkStringifiedContent } from "./sync-check.ts";
import type { PipelineConfig } from "../config.ts";
import { readText, readTextRequired, write } from "../io.ts";
import { SYNC_TARGETS } from "../manifest.ts";
import { has } from "../args.ts";

export async function runSync(
  config: PipelineConfig,
  args: string[],
): Promise<void> {
  // `sync --check` is an alias for the `check` command, so the historical
  // `npm run sync-locales -- --check` keeps working.
  if (has(args, "check")) {
    await runCheck(config);
    return;
  }
  const dryRun = has(args, "dry-run");
  for (const t of SYNC_TARGETS) {
    const cv = await readTextRequired(resolve(config.contentDir, t.cv));
    const projects = await readTextRequired(
      resolve(config.contentDir, t.projects),
    );
    const built = buildContent({ cvMarkdown: cv, projectsMarkdown: projects });
    const json = JSON.stringify(built, null, 2) + "\n";

    if (dryRun) {
      console.log(`--- ${t.out} ---`);
      console.log(json);
      continue;
    }

    const outPath = resolve(config.siteLocalesDir, t.out);
    await write(outPath, json);
    console.log(`✓ ${outPath}`);
  }
}

export async function runCheck(config: PipelineConfig): Promise<void> {
  let stale = false;
  for (const t of SYNC_TARGETS) {
    const cv = await readTextRequired(resolve(config.contentDir, t.cv));
    const projects = await readTextRequired(
      resolve(config.contentDir, t.projects),
    );
    const current = await readText(resolve(config.siteLocalesDir, t.out));

    if (current === null) {
      stale = true;
      console.error(`✗ ${t.out} missing — run \`one-resume sync\``);
      continue;
    }

    const result = checkStringifiedContent(current, cv, projects);
    if (result.status === "ok") {
      console.log(`✓ ${t.out} up to date`);
    } else if (result.status === "stale") {
      stale = true;
      console.error(
        `✗ ${t.out} STALE (differs in: ${result.staleKeys?.join(", ")}) — run \`one-resume sync\``,
      );
    } else {
      stale = true;
      console.error(`✗ ${t.out} ERROR — ${result.error?.message}`);
    }
  }
  if (stale) process.exit(1);
  console.log("All content.json are up to date.");
}
