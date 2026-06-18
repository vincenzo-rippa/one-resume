// Locale detection + label values. The per-tool label *shapes* (PdfLabels,
// DocxLabels) live in their renderers; this package owns only their en/it
// values, keeping the renderers language-agnostic. The imports below are
// type-only (erased at runtime), so this is an acyclic, runtime-free edge.

import type { PdfLabels } from "@one-resume/pdf";
import type { DocxLabels } from "@one-resume/docx";
import { basename } from "node:path";

export const SUPPORTED_LOCALES: string[] = ["en", "it"];
export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** Detect the locale from a markdown file name: `it-cv.md` → `"it"`, else `"en"`. */
export function detectLocale(fileName: string): Locale {
  return basename(fileName).startsWith("it-") ? "it" : "en";
}

const PDF_LABELS: Record<Locale, PdfLabels> = {
  en: {
    about: "About",
    experience: "Experience",
    education: "Education",
    selectedTechnologies: "Selected Technologies",
    projects: "Selected Projects",
    technologies: "Technologies",
    portfolio: "Portfolio",
    ongoing: "Present",
    languages: "Languages",
    otherSkills: "Other skills",
  },
  it: {
    about: "About",
    experience: "Esperienza",
    education: "Formazione",
    selectedTechnologies: "Tecnologie Selezionate",
    projects: "Progetti Selezionati",
    technologies: "Tecnologie",
    portfolio: "Portfolio",
    ongoing: "Presente",
    languages: "Lingue",
    otherSkills: "Altre competenze",
  },
};

const DOCX_LABELS: Record<Locale, DocxLabels> = {
  en: {
    selectedTechnologies: "Core Technologies",
    experience: "Professional Experience",
    education: "Education",
    projects: "Selected Projects",
    ongoing: "Present",
    associatedWith: "Associated with",
    portfolio: "Portfolio",
  },
  it: {
    selectedTechnologies: "Tecnologie principali",
    experience: "Esperienza professionale",
    education: "Formazione",
    projects: "Progetti selezionati",
    ongoing: "Presente",
    associatedWith: "Associato a",
    portfolio: "Portfolio",
  },
};

export function pdfLabels(locale: Locale): PdfLabels {
  return PDF_LABELS[locale];
}

export function docxLabels(locale: Locale): DocxLabels {
  return DOCX_LABELS[locale];
}
