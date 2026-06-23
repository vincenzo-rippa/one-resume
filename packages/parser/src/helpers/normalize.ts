// Normalize the strings the parser emits: curly quotes -> ASCII, non-breaking
// spaces -> regular spaces, and collapsed runs of horizontal whitespace, so
// parsed output is stable regardless of how the markdown was typed.

const REPLACEMENTS: Array<[RegExp, string]> = [
  // Curly single quotes → ASCII apostrophe
  [/[‘’‚‛]/g, "'"],
  // Curly double quotes → ASCII double quote
  [/[“”„‟]/g, '"'],
  // Non-breaking space → regular space
  [/ /g, " "],
  // Collapse runs of horizontal whitespace
  [/[ \t]+/g, " "],
];

// `inline` keeps leading/trailing whitespace (used when joining multi-line
// paragraph fragments); otherwise the result is trimmed.
export function normalizeText(input: string, inline: boolean = false): string {
  let out = input;
  for (const [pattern, replacement] of REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return inline ? out : out.trim();
}
