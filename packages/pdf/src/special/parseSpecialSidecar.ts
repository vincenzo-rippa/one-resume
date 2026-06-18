import { parse as parseYaml } from "yaml";
import { PdfError } from "../errors.ts";

/**
 * Contents of the cv-special sidecar (content/special/{lang}-special.meta.yaml).
 *
 * All fields are required — the `special` template treats this as the source of
 * truth for everything that's not part of the base CV markdown. Missing fields
 * are a fail-fast `PdfError` (with `field`). This is the only surviving YAML
 * sidecar; it lives here in @one-resume/pdf (not the parser), which keeps the
 * parser yaml-free.
 */
export interface SpecialSidecar {
  /** Street/postal address prefix, concatenated before `profile.location.based`. */
  city: string;
  /** Uppercase line shown under the contact block (legal status, etc.). */
  headerExtra: string;
  /** Spoken languages with proficiency level. */
  languages: { label: string; level: string }[];
  /** Free-form extra-skills line (driving license, certifications, …). */
  otherSkills: string;
  /** Headshot file name, resolved relative to the sidecar's directory. */
  photo: string;
}

/**
 * Parses and validates cv-special sidecar YAML text. `sourceName` is used only
 * for error messages (the bytes are read by the caller through a SourceResolver).
 *
 * The `photo` filename is returned as-is; resolving it to an absolute path is
 * the caller's responsibility (it's relative to the sidecar's directory).
 */
export function parseSpecialSidecar(
  raw: string,
  sourceName: string,
): SpecialSidecar {
  let data: unknown;
  try {
    data = parseYaml(raw);
  } catch (e) {
    throw new PdfError(`failed to parse ${sourceName}`, {
      sourceName,
      cause: e,
    });
  }
  return validate(data, sourceName);
}

function validate(data: unknown, file: string): SpecialSidecar {
  if (data === null || typeof data !== "object") {
    throw new PdfError(`${file}: top level must be a YAML mapping`, {
      sourceName: file,
    });
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
    throw new PdfError(
      `${file}: \`${key}\` is required and must be a non-empty string`,
      { sourceName: file, field: key },
    );
  }
  return v.trim();
}

function requireLanguages(
  o: Record<string, unknown>,
  file: string,
): { label: string; level: string }[] {
  const langs = o.languages;
  if (!Array.isArray(langs) || langs.length === 0) {
    throw new PdfError(
      `${file}: \`languages\` is required and must be a non-empty list`,
      { sourceName: file, field: "languages" },
    );
  }
  return langs.map((item, idx) => {
    if (!item || typeof item !== "object") {
      throw new PdfError(`${file}: languages[${idx}] must be a mapping`, {
        sourceName: file,
        field: `languages[${idx}]`,
      });
    }
    const m = item as Record<string, unknown>;
    const label = m.label;
    const level = m.level;
    if (typeof label !== "string" || typeof level !== "string") {
      throw new PdfError(
        `${file}: languages[${idx}] must have string \`label\` and \`level\``,
        { sourceName: file, field: `languages[${idx}]` },
      );
    }
    return { label: label.trim(), level: level.trim() };
  });
}
