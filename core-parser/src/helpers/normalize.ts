// String normalization matching what the AI-driven locale-sync workflow
// historically produced. Applied to every string the parser emits so the
// output is byte-equivalent to the current hand-maintained locale modules.

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

export function normalizeText(input: string): string {
  let out = input;
  for (const [pattern, replacement] of REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out.trim();
}

// Like normalizeText but does NOT trim — used when joining multi-line
// paragraph fragments where leading/trailing whitespace matters during the
// join step.
export function normalizeInline(input: string): string {
  let out = input;
  for (const [pattern, replacement] of REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}
