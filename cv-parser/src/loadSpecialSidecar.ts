import { readFileSync, existsSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import type { SpecialSidecar } from "./types.ts";

/**
 * Loads and validates a cv-special sidecar YAML
 * (e.g. `content/special/it-special.meta.yaml`).
 *
 * Every field is required; the loader throws a descriptive error when any is
 * missing or has the wrong type. The renderer never derives this data — it's
 * the source of truth for everything the `special` template needs beyond the
 * base CV markdown.
 *
 * The `photo` filename is returned as-is. Resolving it to an absolute path is
 * the caller's responsibility (it's relative to the sidecar's directory).
 */
export function loadSpecialSidecar(sidecarPath: string): SpecialSidecar {
  if (!existsSync(sidecarPath)) {
    throw new Error(
      `cv-special sidecar not found: ${sidecarPath}\n` +
        "Expected at content/special/{lang}-special.meta.yaml.",
    );
  }

  let data: unknown;
  try {
    data = parseYaml(readFileSync(sidecarPath, "utf8"));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`failed to parse ${sidecarPath}: ${msg}`);
  }

  return validate(data, sidecarPath);
}

function validate(data: unknown, file: string): SpecialSidecar {
  if (data === null || typeof data !== "object") {
    throw new Error(`${file}: top level must be a YAML mapping`);
  }
  const o = data as Record<string, unknown>;

  const city = requireString(o, "city", file);
  const headerExtra = requireString(o, "headerExtra", file);
  const otherSkills = requireString(o, "otherSkills", file);
  const photo = requireString(o, "photo", file);
  const languages = requireLanguages(o, file);

  return { city, headerExtra, languages, otherSkills, photo };
}

function requireString(
  o: Record<string, unknown>,
  key: string,
  file: string,
): string {
  const v = o[key];
  if (typeof v !== "string" || v.trim().length === 0) {
    throw new Error(`${file}: \`${key}\` is required and must be a non-empty string`);
  }
  return v.trim();
}

function requireLanguages(
  o: Record<string, unknown>,
  file: string,
): { label: string; level: string }[] {
  const langs = o.languages;
  if (!Array.isArray(langs) || langs.length === 0) {
    throw new Error(`${file}: \`languages\` is required and must be a non-empty list`);
  }
  return langs.map((item, idx) => {
    if (!item || typeof item !== "object") {
      throw new Error(`${file}: languages[${idx}] must be a mapping`);
    }
    const m = item as Record<string, unknown>;
    const label = m.label;
    const level = m.level;
    if (typeof label !== "string" || typeof level !== "string") {
      throw new Error(
        `${file}: languages[${idx}] must have string \`label\` and \`level\``,
      );
    }
    return { label: label.trim(), level: level.trim() };
  });
}
