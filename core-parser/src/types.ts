// Parser-output types for CV / projects content. The parser is pure
// (markdown string → these types); see docs/CONTENT_CONTRACT.md for the
// source-format contract these mirror.

export interface Period {
  start: string;
  end: string | "ongoing";
}

/** Where the candidate is based and their availability (header location line). */
export interface Location {
  based: string;
  availability: string;
}

export interface Profile {
  name: string;
  location: Location;
  contacts: Record<string, string>;
  portfolio: string;
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

/** Project entry — used both standalone and embedded in freelance CVs. */
export interface Project {
  title: string;
  period: Period;
  associatedWith?: string;
  description: string;
  highlights: string[];
  technologies: string[];
}

export interface ParsedCv {
  profile: Profile;
  experiences: Experience[];
  education: Education[];
  /**
   * Selected projects embedded in the CV — only present in freelance CVs
   * (a `## Selected Projects` section after Education). Standard CVs emit
   * an empty array.
   */
  projects: Project[];
  /**
   * Footer text (e.g. GDPR notice), parsed from the quoted paragraph that
   * follows the Education section in every CV markdown source.
   */
  footer: string;
  /**
   * SEO/ATS keywords from the `<!-- keywords: a, b, c -->` markdown comment.
   * Extracted via readers/readMetadata.ts; `[]` when the comment is absent.
   */
  keywords: string[];
}

/**
 * Standalone projects parse result. A bare alias for now; kept as a named type
 * so a future `ParsedProjects` object carrying its own metadata is a
 * non-breaking change (YAGNI).
 */
export type ParsedProjects = Project[];
