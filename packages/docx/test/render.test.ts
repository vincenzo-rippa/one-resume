import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { ParsedCv, ParsedProjects } from "@one-resume/domain";
import { renderDocx } from "../src/index.ts";

const CV: ParsedCv = {
  profile: {
    name: "Jane Doe",
    location: { based: "Milan", availability: "Open to remote" },
    contacts: [
      { label: "", value: "jane@example.com" },
      { label: "LinkedIn", value: "linkedin.com/in/jane" },
    ],
    headline: "Senior Engineer",
    tagline: "Building things.",
    taglineShort: "",
    aboutParagraphs: ["I build backend services."],
    selectedTechnologies: ["TypeScript"],
  },
  labels: {
    about: "About",
    experience: "Professional Experience",
    education: "Education",
    technologies: "Selected technologies",
    projects: "Selected Projects",
  },
  experiences: [
    {
      company: "Acme",
      role: "Engineer",
      period: { start: "2020", end: "Present" },
      description: ["Did things"],
    },
  ],
  education: [{ title: "BSc", institution: "Uni" }],
  projects: [
    {
      title: "Billing",
      period: { start: "2021", end: "2022" },
      description: "A system.",
      fields: [
        { key: "highlights", label: "Highlights", value: ["x"], inline: false },
        {
          key: "selected technologies",
          label: "Selected technologies",
          value: ["TypeScript"],
          inline: true,
        },
      ],
    },
  ],
  footer: "GDPR.",
  keywords: [],
};

const PROJECTS: ParsedProjects = {
  label: "Selected Projects",
  projects: CV.projects,
};

/** .docx is a zip — the bytes must start with the "PK" local-file signature. */
function isDocx(b: Uint8Array): boolean {
  return b.length > 0 && b[0] === 0x50 && b[1] === 0x4b;
}

describe("renderDocx", () => {
  it("renders a CV (with embedded projects) to .docx bytes", async () => {
    const [b] = await renderDocx([CV]);
    assert.ok(b instanceof Uint8Array);
    assert.ok(isDocx(b));
  });

  it("renders a standalone projects document", async () => {
    const [b] = await renderDocx([PROJECTS]);
    assert.ok(isDocx(b));
  });

  it("renders multiple documents in order", async () => {
    const bytes = await renderDocx([CV, PROJECTS]);
    assert.equal(bytes.length, 2);
    assert.ok(bytes.every(isDocx));
  });
});
