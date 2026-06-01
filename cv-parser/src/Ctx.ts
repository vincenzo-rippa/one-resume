import type { ParsedSidecar } from "./types.ts";

/**
 * Internal parser context — read-only state passed to readers and helpers.
 *
 * Structural type (no behavior, no class invariants), so callers may build
 * it as an object literal. `classes/` reserves itself for types with real
 * runtime behavior (TokenStream, ParseError).
 */
interface Ctx {
  file?: string;
  sidecar: ParsedSidecar;
  source: string;
}

export default Ctx;
