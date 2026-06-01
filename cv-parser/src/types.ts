// Mirror of lib/types.ts (CV-relevant subset). Kept in sync by hand until the
// site is refactored to import from this package directly (Phase 6+).

export interface Period {
  start: string;
  end: string | "ongoing";
}

export interface CvData {
  name: string;
  location: {
    based: string;
    availability: string;
  };
  contacts: Record<string, string>;
  portfolio: string;
  headline: string;
  tagline: string;
  taglineShort: string;
  aboutParagraphs: string[];
  selectedTechnologies: string[];
  keywords: string[];
  /**
   * Footer text (e.g. GDPR notice), parsed from the quoted paragraph that
   * follows the Education section in every CV markdown source.
   */
  footer: string;
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

export interface ParsedCv {
  cvData: CvData;
  experiences: Experience[];
  education: Education[];
  /**
   * Selected projects embedded in the CV — only present in freelance CVs
   * (a `## Selected Projects` section after Education). Standard CVs emit
   * an empty array.
   */
  projects: Project[];
}

/** Project entry — mirrors `Project` in lib/types.ts. */
export interface Project {
  title: string;
  period: Period;
  associatedWith?: string;
  description: string;
  highlights: string[];
  technologies: string[];
}

// Optional sidecar contents (content/cv/**/*.meta.yaml).
export interface ParsedSidecar {
  keywords?: string[];
}

/**
 * Contents of the cv-special sidecar (content/special/{lang}-special.meta.yaml).
 *
 * All fields are required — the renderer (cv-pdf `special` template) treats
 * this as the source of truth for everything that's not part of the base CV
 * markdown. Missing fields are a fail-fast parse error.
 */
export interface SpecialSidecar {
  /** Street/postal address prefix, concatenated before `cvData.location.based`. */
  city: string;
  /** Uppercase line shown under the contact block (legal status, etc.). */
  headerExtra: string;
  /** Spoken languages with proficiency level. */
  languages: { label: string; level: string }[];
  /** Free-form extra-skills line (driving license, certifications, …). */
  otherSkills: string;
  /** Headshot file name, resolved relative to the sidecar's directory. */
  photo: string;
}
