import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { ParsedCv } from "@one-resume/types";
import type { DocxLabels } from "../src/index.ts";
import { renderCv, renderFreelanceCv, renderProjects } from "../src/index.ts";

const LABELS: DocxLabels = {
  selectedTechnologies: "Core Technologies",
  experience: "Professional Experience",
  education: "Education",
  projects: "Selected Projects",
  ongoing: "Present",
  associatedWith: "Associated with",
  portfolio: "Portfolio",
};

const CV: ParsedCv = {
  profile: {
    name: "Jane Doe",
    location: { based: "Milan", availability: "Open to remote" },
    contacts: { email: "jane@example.com" },
    portfolio: "",
    headline: "Senior Engineer",
    tagline: "Building things.",
    taglineShort: "",
    aboutParagraphs: ["I build backend services."],
    selectedTechnologies: ["TypeScript"],
  },
  experiences: [
    {
      company: "Acme",
      role: "Engineer",
      period: { start: "2020", end: "ongoing" },
      description: ["Did things"],
    },
  ],
  education: [{ title: "BSc", institution: "Uni" }],
  projects: [
    {
      title: "Billing",
      period: { start: "2021", end: "2022" },
      description: "A system.",
      highlights: ["x"],
      technologies: ["TypeScript"],
    },
  ],
  footer: "GDPR.",
  keywords: [],
};

/** .docx is a zip — the bytes must start with the "PK" local-file signature. */
function isDocx(b: Uint8Array): boolean {
  return b.length > 0 && b[0] === 0x50 && b[1] === 0x4b;
}

describe("docx renderers", () => {
  it("renderCv returns non-empty .docx bytes", async () => {
    const b = await renderCv(CV, LABELS);
    assert.ok(b instanceof Uint8Array);
    assert.ok(isDocx(b));
  });

  it("renderFreelanceCv returns .docx bytes", async () => {
    assert.ok(isDocx(await renderFreelanceCv(CV, LABELS)));
  });

  it("renderProjects returns .docx bytes", async () => {
    assert.ok(isDocx(await renderProjects(CV.projects, LABELS)));
  });
});
