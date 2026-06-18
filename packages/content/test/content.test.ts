import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildContent, checkContent } from "../src/index.ts";

// A minimal CV that satisfies the parser contract (sibling-free, inline).
const CV = `# Jane Doe

Milan, Italy · Open to remote

jane@example.com

## Senior Engineer

_Building reliable systems._

I build backend services.

### Selected technologies

TypeScript, Node.js

---

## Professional Experience

### Acme — Backend Engineer

_Milan | 2020 – Present_

- Built the billing pipeline

---

## Education

**BSc Computer Science @ University of Milan**

_Graduated 2016_

---

"I authorize the processing of personal data pursuant to GDPR 679/2016."
`;

const PROJECTS = `# Projects

## Billing Platform

_2021 – 2022_

A multi-tenant billing system.

**Selected technologies:** TypeScript, PostgreSQL
`;

describe("buildContent", () => {
  it("returns an object with the expected top-level keys", () => {
    const out = buildContent({ cvMarkdown: CV, projectsMarkdown: PROJECTS });
    assert.deepEqual(Object.keys(out), [
      "profile",
      "experiences",
      "education",
      "projects",
      "footer",
      "keywords",
    ]);
  });

  it("uses standalone projects markdown when provided", () => {
    const out = buildContent({ cvMarkdown: CV, projectsMarkdown: PROJECTS });
    assert.equal(out.projects[0].title, "Billing Platform");
  });

  it("falls back to the CV's own projects when none is given", () => {
    const out = buildContent({ cvMarkdown: CV });
    assert.deepEqual(out.projects, []);
  });
});

describe("checkContent", () => {
  it("reports not stale when outputs are equal", () => {
    const a = buildContent({ cvMarkdown: CV, projectsMarkdown: PROJECTS });
    const b = buildContent({ cvMarkdown: CV, projectsMarkdown: PROJECTS });
    assert.equal(checkContent(a, b).isStale, false);
  });

  it("reports stale with the differing keys", () => {
    const a = buildContent({ cvMarkdown: CV, projectsMarkdown: PROJECTS });
    const b = { ...a, footer: "changed" };
    const r = checkContent(a, b);
    assert.equal(r.isStale, true);
    assert.deepEqual(r.staleKeys, ["footer"]);
  });

  it("reports not stale for structurally equal objects with different references", () => {
    const a = buildContent({ cvMarkdown: CV, projectsMarkdown: PROJECTS });
    const b = JSON.parse(JSON.stringify(a));
    assert.equal(checkContent(a, b).isStale, false);
  });
});
