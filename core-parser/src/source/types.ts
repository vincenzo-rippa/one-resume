/**
 * Resolves a logical source name to its text content. This is the single seam
 * that decouples the pure parser ("string → data") from "where the bytes come
 * from": the local filesystem today (see the `source-nodefs` package), a GitHub
 * repo or object bucket later.
 *
 * `read` returns `null` when the name does not resolve to anything, so the
 * caller decides whether a missing source is fatal (required markdown → throw)
 * or fine (optional sidecar → fall back). A `sourceName` is an
 * implementation-relative identifier (a fs path, a DB key, a URL).
 */
export interface SourceResolver {
  /** Read a source's UTF-8 text, or `null` when it does not exist. */
  read(sourceName: string): Promise<string | null>;
}
