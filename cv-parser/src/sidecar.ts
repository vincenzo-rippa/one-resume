import { readFileSync, existsSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import type { ParsedSidecar } from "./types.ts";

// Looks for `<markdownPath>.meta.yaml` (and `.yml`) next to the markdown
// file. Returns an empty sidecar object when absent — the sidecar is
// optional by design.
export function loadSidecarFor(markdownPath: string): ParsedSidecar {
  for (const ext of [".meta.yaml", ".meta.yml"]) {
    const candidate = markdownPath.replace(/\.md$/, ext);
    if (existsSync(candidate)) {
      const raw = readFileSync(candidate, "utf8");
      const data = parseYaml(raw);
      return (data ?? {}) as ParsedSidecar;
    }
  }
  return {};
}
