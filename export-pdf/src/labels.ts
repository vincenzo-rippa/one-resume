// Pure UI strings (section titles, "Present"/"Presente"). Content fields
// (footer text, languages, etc.) are NOT here — those come from the parser.

import { basename } from "node:path";

export const LABELS = {
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
} as const;

export type Lang = keyof typeof LABELS;

export function detectLang(mdPath: string): Lang {
  return basename(mdPath).startsWith("it-") ? "it" : "en";
}
