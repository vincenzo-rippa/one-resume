// Section-label shape for ATS DOCX output.
//
// These intentionally lean toward keywords ATS parsers expect ("Professional
// Experience", "Core Technologies"), slightly more verbose than the PDF labels —
// each tool owns its own wording. The en/it *values* live in
// @one-resume/localization; this package owns only the shape.

export interface DocxLabels {
  selectedTechnologies: string;
  experience: string;
  education: string;
  projects: string;
  ongoing: string;
  associatedWith: string;
  portfolio: string;
}
