import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parse, ParseError } from "../src/index.ts";

const CV = `# Jane Doe

Milan, Italy · Open to remote

jane@example.com · LinkedIn: linkedin.com/in/jane · Portfolio: jane.dev

## Senior Engineer

_Building reliable systems._

## About

I build backend services.

### Selected technologies

TypeScript, Node.js, PostgreSQL

---

## Professional Experience

### Acme — Backend Engineer

_Milan | 2020 – Present_

- Built the billing pipeline
- Cut p99 latency in half

---

## Education

**BSc Computer Science @ University of Milan**

_Graduated 2016_

---

"I authorize the processing of personal data pursuant to GDPR 679/2016."

<!-- keywords: backend, typescript, node -->
`;

describe("parse(cv) — content + captured labels", () => {
  const cv = parse(CV, "cv");

  it("captures profile content", () => {
    assert.equal(cv.profile.name, "Jane Doe");
    assert.deepEqual(cv.profile.location, {
      based: "Milan, Italy",
      availability: "Open to remote",
    });
    assert.deepEqual(cv.profile.contacts, [
      { label: "", value: "jane@example.com" },
      { label: "LinkedIn", value: "linkedin.com/in/jane" },
      { label: "Portfolio", value: "jane.dev" },
    ]);
    assert.equal(cv.profile.headline, "Senior Engineer");
    assert.equal(cv.profile.tagline, "Building reliable systems.");
    assert.equal(cv.profile.taglineShort, "");
    assert.deepEqual(cv.profile.aboutParagraphs, ["I build backend services."]);
    assert.deepEqual(cv.profile.selectedTechnologies, [
      "TypeScript",
      "Node.js",
      "PostgreSQL",
    ]);
  });

  it("captures the section labels from the headings", () => {
    assert.deepEqual(cv.labels, {
      about: "About",
      technologies: "Selected technologies",
      experience: "Professional Experience",
      education: "Education",
      projects: "",
    });
  });

  it("keeps the period end verbatim (no 'ongoing' sentinel)", () => {
    assert.deepEqual(cv.experiences[0].period, {
      start: "2020",
      end: "Present",
    });
    assert.equal(cv.experiences[0].company, "Acme");
    assert.equal(cv.experiences[0].role, "Backend Engineer");
    assert.equal(cv.experiences[0].location, "Milan");
    assert.equal(cv.experiences[0].description.length, 2);
  });

  it("parses education, footer, keywords; no embedded projects", () => {
    assert.deepEqual(cv.education[0], {
      title: "BSc Computer Science",
      institution: "University of Milan",
      subtitle: "Graduated 2016",
    });
    assert.match(cv.footer, /^I authorize/);
    assert.deepEqual(cv.keywords, ["backend", "typescript", "node"]);
    assert.deepEqual(cv.projects, []);
  });
});

const WITH_PROJECTS = CV.replace(
  '---\n\n"I authorize',
  `---

## Selected Projects

### Billing Platform

_2021 – 2022_

**Associated with:** Acme

A multi-tenant billing system.

**Highlights**

- Processed millions of invoices

**Selected technologies:** TypeScript, PostgreSQL

---

"I authorize`,
);

describe("parse(cv) — embedded projects", () => {
  const cv = parse(WITH_PROJECTS, "cv");

  it("captures the projects label + entries with ordered generic fields", () => {
    assert.equal(cv.labels.projects, "Selected Projects");
    assert.equal(cv.projects.length, 1);
    const p = cv.projects[0];
    assert.equal(p.title, "Billing Platform");
    assert.deepEqual(p.period, { start: "2021", end: "2022" });
    assert.equal(p.description, "A multi-tenant billing system.");
    assert.deepEqual(p.fields, [
      {
        key: "associated with",
        label: "Associated with",
        value: ["Acme"],
        inline: true,
      },
      {
        key: "highlights",
        label: "Highlights",
        value: ["Processed millions of invoices"],
        inline: false,
      },
      {
        key: "selected technologies",
        label: "Selected technologies",
        value: ["TypeScript", "PostgreSQL"],
        inline: true,
      },
    ]);
  });
});

describe("parse(cv) — structural errors", () => {
  it("throws when the first line is not an H1", () => {
    assert.throws(() => parse("## Nope\n", "cv"), ParseError);
  });
  it("throws when the About section heading is missing", () => {
    assert.throws(
      () => parse(CV.replace("## About\n\n", ""), "cv"),
      ParseError,
    );
  });
  it("throws when the footer is missing", () => {
    assert.throws(
      () => parse(CV.replace(/\n"I authorize[\s\S]*$/, "\n"), "cv"),
      ParseError,
    );
  });
});
