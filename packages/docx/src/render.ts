// ATS DOCX renderer.
//
// From @one-resume/domain to packed `.docx` bytes. `renderDocx` returns one
// `Uint8Array` per parsed document (a CV or a standalone projects doc) via
// `Packer` — no filesystem I/O, so the caller writes the bytes or streams them
// from an HTTP response. Section titles + field labels come from the parsed data
// (captured from the markdown); there are no injected label dictionaries.

import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import type {
  ParsedCv,
  ParsedProjects,
  Period,
  Profile,
  Project,
  ProjectField,
} from "@one-resume/domain";
import {
  FONT,
  LINE_BODY,
  PAGE_MARGIN,
  SIZE_BODY,
  SIZE_HEADING,
  SIZE_TITLE,
  SPACING,
} from "./style.ts";

// ─── Inline helpers ─────────────────────────────────────────────────────────

/** "start – end"; the end word is literal markdown text (no sentinel). */
function formatPeriod(p: Period): string {
  return `${p.start} – ${p.end}`;
}

interface BodyOpts {
  bold?: boolean;
  italics?: boolean;
  before?: number;
  after?: number;
  keepLines?: boolean;
  keepNext?: boolean;
}

function body(text: string, opts: BodyOpts = {}): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: opts.bold ?? false,
        italics: opts.italics ?? false,
      }),
    ],
    alignment: AlignmentType.LEFT,
    spacing: {
      before: opts.before ?? 0,
      after: opts.after ?? SPACING.bodyAfter,
      line: LINE_BODY,
    },
    keepLines: opts.keepLines ?? false,
    keepNext: opts.keepNext ?? false,
  });
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: {
      before: SPACING.sectionBefore,
      after: SPACING.sectionAfter,
    },
    thematicBreak: false,
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    text,
    bullet: { level: 0 },
    spacing: {
      before: 0,
      after: SPACING.bulletAfter,
      line: LINE_BODY,
    },
    keepLines: true,
  });
}

function titleParagraph(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.LEFT,
    spacing: { before: 0, after: SPACING.sectionAfter },
  });
}

// ─── Content assembly ───────────────────────────────────────────────────────

/**
 * The contact block from the parsed profile. The location goes on its own line;
 * the captured contacts go on one line, each rendered "Label: value" or, for a
 * bare (unlabelled) value such as an email, the value alone.
 */
function buildContactLines(cv: Profile): string[] {
  const lines: string[] = [];

  if (cv.location.based) {
    const { based, availability } = cv.location;
    lines.push(availability ? `${based} · ${availability}` : based);
  }

  const bits = cv.contacts.map((c) => (c.label ? `${c.label}: ${c.value}` : c.value));
  if (bits.length > 0) lines.push(bits.join(" · "));

  return lines;
}

/** A captured project field, rendered by its source: inline "Label: a, b" or a
 *  labelled bullet list (e.g. highlights). */
function appendField(children: Paragraph[], f: ProjectField): void {
  if (f.inline) {
    children.push(
      body(`${f.label}: ${f.value.join(", ")}`, { after: SPACING.bodyAfter }),
    );
    return;
  }
  children.push(
    body(f.label, {
      bold: true,
      after: SPACING.tightAfter,
      keepLines: true,
      keepNext: true,
    }),
  );
  for (const v of f.value) children.push(bullet(v));
}

function appendProject(children: Paragraph[], p: Project): void {
  children.push(
    body(p.title, {
      bold: true,
      before: SPACING.sectionAfter,
      after: SPACING.headerTight,
      keepLines: true,
      keepNext: true,
    }),
  );
  children.push(
    body(formatPeriod(p.period), {
      italics: true,
      after: SPACING.tightAfter,
      keepLines: true,
      keepNext: true,
    }),
  );
  if (p.description) {
    children.push(body(p.description, { after: SPACING.bodyAfter }));
  }
  for (const f of p.fields) appendField(children, f);
}

// ─── Document assembly ──────────────────────────────────────────────────────

function buildDocument(children: Paragraph[]): Document {
  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: PAGE_MARGIN,
              right: PAGE_MARGIN,
              bottom: PAGE_MARGIN,
              left: PAGE_MARGIN,
            },
          },
        },
        children,
      },
    ],
    styles: {
      paragraphStyles: [
        {
          id: "Normal",
          name: "Normal",
          run: { size: SIZE_BODY, font: FONT },
          paragraph: { spacing: { line: LINE_BODY, after: SPACING.bodyAfter } },
        },
        {
          id: "Title",
          name: "Title",
          basedOn: "Normal",
          next: "Normal",
          run: { size: SIZE_TITLE, bold: true, font: FONT },
          paragraph: { spacing: { after: SPACING.sectionAfter } },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          run: { size: SIZE_HEADING, bold: true, font: FONT },
          paragraph: {
            spacing: {
              before: SPACING.sectionBefore,
              after: SPACING.sectionAfter,
            },
          },
        },
      ],
    },
  });
}

/**
 * A full CV document. The Selected Projects section is rendered only when
 * `projects` is non-empty — one builder whether or not the CV embeds projects.
 *
 * The GDPR footer (`parsed.footer`) is intentionally NOT rendered: ATS
 * documents go to recruiters and parsers, where the privacy notice is noise.
 */
function buildCvDocument(parsed: ParsedCv): Document {
  const { profile, labels, experiences, education, projects } = parsed;
  const children: Paragraph[] = [];

  if (profile.name) children.push(titleParagraph(profile.name));

  for (const line of buildContactLines(profile)) {
    children.push(body(line, { after: SPACING.contactAfter }));
  }

  if (profile.headline) children.push(sectionHeading(profile.headline));
  if (profile.tagline) {
    children.push(body(profile.tagline, { italics: true, after: SPACING.bodyAfter }));
  }
  for (const p of profile.aboutParagraphs) {
    children.push(body(p, { after: SPACING.bodyAfter }));
  }

  if (profile.selectedTechnologies.length > 0) {
    children.push(sectionHeading(labels.technologies));
    for (const t of profile.selectedTechnologies) children.push(bullet(t));
  }

  if (experiences.length > 0) {
    children.push(sectionHeading(labels.experience));
    for (const job of experiences) {
      children.push(
        body(`${job.company} — ${job.role}`, {
          bold: true,
          before: SPACING.sectionAfter,
          after: SPACING.headerTight,
          keepLines: true,
          keepNext: true,
        }),
      );
      const metaParts: string[] = [];
      if (job.location) metaParts.push(job.location);
      metaParts.push(formatPeriod(job.period));
      children.push(
        body(metaParts.join(" | "), {
          after: SPACING.tightAfter,
          keepLines: true,
          keepNext: job.description.length > 0,
        }),
      );
      for (const b of job.description) children.push(bullet(b));
    }
  }

  if (education.length > 0) {
    children.push(sectionHeading(labels.education));
    for (const e of education) {
      const titleLine = e.institution ? `${e.title} @ ${e.institution}` : e.title;
      children.push(
        body(titleLine, {
          bold: true,
          before: SPACING.sectionAfter,
          after: SPACING.headerTight,
          keepLines: true,
          keepNext: Boolean(e.subtitle),
        }),
      );
      if (e.subtitle) {
        children.push(body(e.subtitle, { italics: true, after: SPACING.bodyAfter }));
      }
    }
  }

  if (projects.length > 0) {
    children.push(sectionHeading(labels.projects));
    for (const proj of projects) appendProject(children, proj);
  }

  return buildDocument(children);
}

/** A standalone Selected Projects document. */
function buildProjectsDocument(parsed: ParsedProjects): Document {
  const children: Paragraph[] = [];
  children.push(titleParagraph(parsed.label));
  for (const p of parsed.projects) appendProject(children, p);
  return buildDocument(children);
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Pack a built document into `.docx` bytes. */
function pack(doc: Document): Promise<Uint8Array> {
  return Packer.toBuffer(doc);
}

/**
 * Render each parsed document to `.docx` bytes, in order. A ParsedCv becomes a
 * CV document (with embedded projects when present); a ParsedProjects becomes a
 * standalone projects document.
 */
export function renderDocx(
  docs: (ParsedCv | ParsedProjects)[],
): Promise<Uint8Array[]> {
  return Promise.all(
    docs.map((d) =>
      pack("profile" in d ? buildCvDocument(d) : buildProjectsDocument(d)),
    ),
  );
}
