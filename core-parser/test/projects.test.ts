import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseProjects } from "../src/parseProjects.ts";
import ParseError from "../src/classes/ParseError.ts";

// Inline standalone-projects fixture (docs/CONTENT_CONTRACT.md §1.4).
const VALID_PROJECTS = `# Projects

## Billing Platform

_2021 – 2022_

**Associated with:** Acme

A multi-tenant billing system.

**Highlights**

- Processed millions of invoices
- 99.99% uptime

**Selected technologies:** TypeScript, PostgreSQL, Kafka

---

## CLI Toolkit

_2020 – 2021_

A developer CLI with no highlights listed.

**Selected technologies:** Go
`;

describe("parseProjects — contract", () => {
  it("parses standalone projects", () => {
    const projects = parseProjects(VALID_PROJECTS, { sourceName: "projects.md" });
    assert.equal(projects.length, 2);
    assert.deepEqual(projects[0], {
      title: "Billing Platform",
      period: { start: "2021", end: "2022" },
      associatedWith: "Acme",
      description: "A multi-tenant billing system.",
      highlights: ["Processed millions of invoices", "99.99% uptime"],
      technologies: ["TypeScript", "PostgreSQL", "Kafka"],
    });
  });

  it("treats a project without highlights as an empty array", () => {
    const projects = parseProjects(VALID_PROJECTS, { sourceName: "projects.md" });
    assert.deepEqual(projects[1].highlights, []);
    assert.deepEqual(projects[1].technologies, ["Go"]);
    assert.equal(projects[1].associatedWith, undefined);
  });

  it("throws ParseError when the H1 title is missing", () => {
    const md = VALID_PROJECTS.replace("# Projects\n", "");
    assert.throws(
      () => parseProjects(md, { sourceName: "no-h1.md" }),
      ParseError,
    );
  });

  it("throws ParseError when there are no project entries", () => {
    assert.throws(
      () => parseProjects("# Projects\n", { sourceName: "empty.md" }),
      ParseError,
    );
  });
});
