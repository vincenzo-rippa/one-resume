// Section labels for ATS DOCX output.
//
// These intentionally lean toward keywords ATS parsers expect to see in
// recruiter-facing documents ("Professional Experience", "Core Technologies"),
// which is slightly more verbose than the PDF labels. They're a sibling table
// to the one in export-pdf/scripts/build.ts — keep them in sync conceptually,
// but each tool owns its own wording.

export const LABELS = {
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
} as const;

export type Lang = keyof typeof LABELS;
export type Labels = (typeof LABELS)[Lang];
