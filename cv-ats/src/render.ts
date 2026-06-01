// ATS DOCX renderer.
//
// Pure functions from cv-parser types to `docx` Document. No I/O except
// `writeDocx`. Mirrors the cv-pdf/templates/ layout conceptually: one entry
// point per kind (CV, freelance CV, standalone projects).

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
  Period,
  Project,
} from "../../cv-parser/src/types.ts";
import type { Labels } from "./labels.ts";
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

function formatPeriod(p: Period, labels: Labels): string {
  const end = p.end === "ongoing" ? labels.ongoing : p.end;
  return `${p.start} – ${end}`;
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
 * Builds the contact block from parsed cvData. ATS-flavored: each contact
 * value goes on the contact line, prefixed by a capitalised key (except
 * `email`, which is rendered bare). Portfolio goes on its own line so a
 * recruiter can spot the URL at a glance.
 */
function buildContactLines(
  cv: ParsedCv["cvData"],
  labels: Labels,
): string[] {
  const lines: string[] = [];

  if (cv.location?.based) {
    const loc = cv.location.based;
    const avail = cv.location.availability;
    lines.push(avail ? `${loc} · ${avail}` : loc);
  }

  const bits: string[] = [];
  for (const [key, val] of Object.entries(cv.contacts ?? {})) {
    if (!val) continue;
    if (key.toLowerCase() === "email") {
      bits.push(val);
    } else {
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      bits.push(`${label}: ${val}`);
    }
  }
  if (bits.length > 0) lines.push(bits.join(" · "));

  if (cv.portfolio) {
    lines.push(`${labels.portfolio}: ${cv.portfolio}`);
  }

  return lines;
}

function appendProject(
  children: Paragraph[],
  p: Project,
  labels: Labels,
): void {
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
    body(formatPeriod(p.period, labels), {
      italics: true,
      after: SPACING.tightAfter,
      keepLines: true,
      keepNext: true,
    }),
  );
  if (p.associatedWith) {
    children.push(
      body(`${labels.associatedWith}: ${p.associatedWith}`, {
        after: SPACING.tightAfter,
        keepLines: true,
        keepNext: true,
      }),
    );
  }
  if (p.description) {
    children.push(body(p.description, { after: SPACING.bodyAfter }));
  }
  for (const h of p.highlights) {
    children.push(bullet(h));
  }
  if (p.technologies.length > 0) {
    children.push(
      body(`${labels.selectedTechnologies}: ${p.technologies.join(", ")}`, {
        after: SPACING.bodyAfter,
      }),
    );
  }
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

// ─── Public API ─────────────────────────────────────────────────────────────

export interface RenderCvOptions {
  labels: Labels;
  /** Append `parsed.projects` as a Selected Projects section. Use for freelance CVs. */
  includeProjects?: boolean;
}

/**
 * Renders a full CV (main / derived / freelance). When `includeProjects` is
 * true, the embedded `parsed.projects` array is rendered as a Selected
 * Projects section between Education and the end of the document.
 *
 * The GDPR footer (`cvData.footer`) is intentionally NOT rendered: ATS
 * documents are sent to recruiters and parsers, and the privacy notice is
 * irrelevant noise in that context.
 */
export function renderCv(parsed: ParsedCv, opts: RenderCvOptions): Document {
  const { labels, includeProjects = false } = opts;
  const { cvData, experiences, education, projects } = parsed;
  const children: Paragraph[] = [];

  if (cvData.name) {
    children.push(titleParagraph(cvData.name));
  }

  for (const line of buildContactLines(cvData, labels)) {
    children.push(body(line, { after: SPACING.contactAfter }));
  }

  if (cvData.headline) {
    children.push(sectionHeading(cvData.headline));
  }
  if (cvData.tagline) {
    children.push(
      body(cvData.tagline, { italics: true, after: SPACING.bodyAfter }),
    );
  }
  for (const p of cvData.aboutParagraphs ?? []) {
    children.push(body(p, { after: SPACING.bodyAfter }));
  }

  if (cvData.selectedTechnologies && cvData.selectedTechnologies.length > 0) {
    children.push(sectionHeading(labels.selectedTechnologies));
    for (const t of cvData.selectedTechnologies) {
      children.push(bullet(t));
    }
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
      metaParts.push(formatPeriod(job.period, labels));
      children.push(
        body(metaParts.join(" | "), {
          after: SPACING.tightAfter,
          keepLines: true,
          keepNext: job.description.length > 0,
        }),
      );
      for (const b of job.description) {
        children.push(bullet(b));
      }
    }
  }

  if (education.length > 0) {
    children.push(sectionHeading(labels.education));
    for (const e of education) {
      const titleLine = e.institution
        ? `${e.title} @ ${e.institution}`
        : e.title;
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
        children.push(
          body(e.subtitle, { italics: true, after: SPACING.bodyAfter }),
        );
      }
    }
  }

  if (includeProjects && projects.length > 0) {
    children.push(sectionHeading(labels.projects));
    for (const proj of projects) {
      appendProject(children, proj, labels);
    }
  }

  return buildDocument(children);
}

/**
 * Renders a standalone Selected Projects document (from content/projects/).
 * Used for `{lang}-projects-ats.docx` outputs.
 */
export function renderProjects(
  projects: Project[],
  labels: Labels,
): Document {
  const children: Paragraph[] = [];
  children.push(titleParagraph(labels.projects));
  for (const p of projects) {
    appendProject(children, p, labels);
  }
  return buildDocument(children);
}

// ─── I/O ────────────────────────────────────────────────────────────────────

export async function writeDocx(doc: Document, outPath: string): Promise<void> {
  const { writeFile, mkdir } = await import("node:fs/promises");
  const { dirname } = await import("node:path");
  const buffer = await Packer.toBuffer(doc);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, buffer);
}
