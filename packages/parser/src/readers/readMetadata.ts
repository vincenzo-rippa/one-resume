// Document metadata extracted from the markdown itself, via HTML comments that
// are part of the source but never rendered (consistent with the existing
// `<!-- Tagline -->` markers). Today this is just the SEO/ATS keyword list; the
// `Metadata` shape is the stable extension point for future fields (a general
// meta-block, per-project metadata) without touching call sites.

export interface Metadata {
  /** From `<!-- keywords: a, b, c -->`; `[]` when the comment is absent. */
  keywords: string[];
}

// Matches `<!-- keywords: a, b, c -->` anywhere in the source. The value runs
// to the comment close; it may span lines. Case-insensitive on the label.
const KEYWORDS_COMMENT = /<!--\s*keywords:\s*([\s\S]*?)-->/i;

/**
 * Read document metadata from raw markdown. Pure string scan — independent of
 * the token stream, so the comment may appear anywhere in the file.
 */
export function readMetadata(markdown: string): Metadata {
  const match = markdown.match(KEYWORDS_COMMENT);
  if (!match) return { keywords: [] };
  const keywords = match[1]
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return { keywords };
}
