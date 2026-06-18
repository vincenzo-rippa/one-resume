// Section-label shape for Typst PDF output (UI strings only — section titles,
// "Present"/"Presente"). Content fields (footer text, languages, …) come from
// the parser, NOT from here. The en/it *values* live in @one-resume/localization;
// this package owns only the shape.

export interface PdfLabels {
  about: string;
  experience: string;
  education: string;
  selectedTechnologies: string;
  projects: string;
  technologies: string;
  portfolio: string;
  ongoing: string;
  languages: string;
  otherSkills: string;
}
