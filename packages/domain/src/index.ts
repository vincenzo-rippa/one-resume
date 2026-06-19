// The one-resume domain model — the dependency-free hub every package builds on.
// The parser maps markdown → these interfaces (input adapter); pdf/docx/content
// map them → bytes/JSON (output adapters); nothing here depends on those.
// Zero runtime: every consumer imports these with `import type` (the workspace
// sets verbatimModuleSyntax). The parser captures BOTH content and labels from
// the markdown positionally — there are no anchors and no localization.

/** A date range. `end` is the literal markdown text (e.g. "2022", "Present"). */
export interface Period {
  start: string;
  end: string;
}

/** Where the candidate is based and their availability (header location line). */
export interface Location {
  based: string;
  availability: string;
}

/**
 * A header contact-line segment, captured verbatim and in order. `label` is the
 * author's wording (e.g. "LinkedIn", "Portfolio") or "" for an unlabelled value
 * such as a bare email. No service is special-cased — the markdown is the source
 * of every label.
 */
export interface Contact {
  label: string;
  value: string;
}

export interface Profile {
  name: string;
  location: Location;
  contacts: Contact[];
  headline: string;
  tagline: string;
  taglineShort: string;
  aboutParagraphs: string[];
  selectedTechnologies: string[];
}

export interface Experience {
  company: string;
  role: string;
  location?: string;
  period: Period;
  description: string[];
}

export interface Education {
  title: string;
  subtitle?: string;
  institution?: string;
}

/**
 * A labelled field inside a project entry (e.g. `**Associated with:** Acme`,
 * `**Selected technologies:** a, b`, `**Highlights**` + a list). Captured
 * generically and in order — the parser does not classify them. `key` is the
 * normalized label (lowercased, language-specific); `value` is always a list.
 * `inline` records how the author wrote it: a `**Label:** value` paragraph is
 * inline (rendered on one line), a `**Label**` + bullet list is not (rendered
 * as a list). It carries the author's rendering intent without the renderer
 * having to guess from the value count.
 */
export interface ProjectField {
  key: string;
  label: string;
  value: string[];
  inline: boolean;
}

/** Project entry — used both standalone and embedded in a CV. */
export interface Project {
  title: string;
  period: Period;
  description: string;
  fields: ProjectField[];
}

/**
 * Section titles captured from the markdown headings — the single, mandatory
 * label object. No per-tool wording, no overrides. `projects` is "" when the CV
 * has no embedded projects section.
 */
export interface SectionLabels {
  about: string;
  experience: string;
  education: string;
  technologies: string;
  projects: string;
}

export interface ParsedCv {
  profile: Profile;
  labels: SectionLabels;
  experiences: Experience[];
  education: Education[];
  /** Embedded projects section; `[]` when the CV has none. */
  projects: Project[];
  /** Footer text (e.g. GDPR notice) — the quoted paragraph after the sections. */
  footer: string;
  /** SEO/ATS keywords from `<!-- keywords: a, b, c -->`; `[]` when absent. */
  keywords: string[];
}

/** Standalone projects parse result: the captured section label + the entries. */
export interface ParsedProjects {
  label: string;
  projects: Project[];
}
