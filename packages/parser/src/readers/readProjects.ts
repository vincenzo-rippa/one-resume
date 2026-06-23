import type { Tokens } from "marked";
import type { Project, ProjectField } from "@one-resume/domain";
import type { TokenStream } from "../classes/TokenStream.ts";
import { plainText } from "../helpers/inline.ts";
import { parsePeriod } from "../helpers/period.ts";

/**
 * The optional projects section between Education and the footer of a CV. By
 * contract the only thing that may appear there is the projects section, so ANY
 * H2 here is it (title captured); a paragraph means there is none (the footer).
 */
export function readOptionalProjectsSection(stream: TokenStream): {
  label: string;
  projects: Project[];
} {
  stream.skipHorizontalRule();
  const next = stream.peekMeaningful();
  if (next?.type !== "heading" || (next as Tokens.Heading).depth !== 2) {
    return { label: "", projects: [] };
  }
  const label = plainText(stream.consumeHeading([2], "## Projects").tokens);
  const projects = readProjectsBlock(stream, 3);
  stream.skipHorizontalRule();
  return { label, projects };
}

/**
 * Read consecutive project entries (each heading at `projectDepth`) until the
 * next HR / heading at a shallower-or-equal depth / EOF. Positional and
 * language-agnostic — no label dictionaries. A project body is prose
 * (description) plus ordered labelled fields: `**Label:** value` (inline) and
 * `**Label**` followed by a bullet list (list-valued).
 */
export function readProjectsBlock(
  stream: TokenStream,
  projectDepth: number,
): Project[] {
  const projects: Project[] = [];
  while (true) {
    const next = stream.peekMeaningful();
    if (!next) break;
    if (next.type === "hr") {
      stream.consumeMeaningful();
      continue;
    }
    if (next.type !== "heading") break;
    if ((next as Tokens.Heading).depth !== projectDepth) break;
    projects.push(readOneProject(stream, projectDepth));
  }
  return projects;
}

function readOneProject(stream: TokenStream, projectDepth: number): Project {
  const title = plainText(
    stream.consumeHeading([projectDepth], `an H${projectDepth} project title`)
      .tokens,
  );

  const meta = stream.consumeItalicParagraph();
  if (!meta) {
    throw stream.error(
      "expected an italic date-range line after the project heading",
    );
  }
  const period = parsePeriod(plainText(meta.tokens));
  if (!period) {
    throw stream.error(`unparseable date range "${plainText(meta.tokens)}"`);
  }

  const descriptionParts: string[] = [];
  const fields: ProjectField[] = [];

  while (true) {
    const next = stream.peekMeaningful();
    if (!next || next.type === "hr") break;
    if (
      next.type === "heading" &&
      (next as Tokens.Heading).depth <= projectDepth
    ) {
      break;
    }
    const token = stream.consumeMeaningful();

    if (token.type === "list") {
      // A list fills the value of the immediately-preceding label-only field
      // (e.g. `**Highlights**` then a bullet list).
      const last = fields[fields.length - 1];
      if (!last || last.value.length > 0) {
        throw stream.error(
          "a bullet list must follow a `**Label**` line in a project entry",
          token,
        );
      }
      last.value = (token as Tokens.List).items.map((it) =>
        plainText(it.tokens),
      );
      continue;
    }

    if (token.type === "paragraph") {
      const field = readLabelledParagraph(token as Tokens.Paragraph);
      if (field) fields.push(field);
      else descriptionParts.push(plainText((token as Tokens.Paragraph).tokens));
      continue;
    }

    throw stream.error(
      `unexpected token in project block: ${token.type}`,
      token,
    );
  }

  return { title, period, description: descriptionParts.join(" "), fields };
}

/**
 * A `**Label:** value` / `**Label**` paragraph → a ProjectField. Returns
 * undefined for plain prose. `key` is the normalized (lowercased) label; an
 * inline value is comma-split; a label-only paragraph yields an empty value
 * (filled by a following list).
 */
function readLabelledParagraph(
  para: Tokens.Paragraph,
): ProjectField | undefined {
  const tokens = para.tokens;
  if (!tokens || tokens.length === 0 || tokens[0].type !== "strong") {
    return undefined;
  }
  const label = plainText((tokens[0] as Tokens.Strong).tokens)
    .replace(/:$/, "")
    .trim();
  const rest = plainText(tokens.slice(1)).replace(/^:\s*/, "");
  // Inline text after the label (`**Label:** a, b`) → an inline, comma-split
  // field. A label-only paragraph (`**Label**`) is a list field whose value a
  // following bullet list fills.
  const inline = rest.length > 0;
  const value = inline
    ? rest
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    : [];
  return { key: label.toLowerCase(), label, value, inline };
}
