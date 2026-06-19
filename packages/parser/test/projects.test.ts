import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parse, ParseError } from "../src/index.ts";

// Standalone projects: same shape as embedded — a `## <heading>` (captured as
// the label) + `### entries`.
const PROJECTS = `## Selected Projects

### Billing Platform

_2021 – 2022_

**Associated with:** Acme

A multi-tenant billing system.

**Highlights**

- Processed millions of invoices
- 99.99% uptime

**Selected technologies:** TypeScript, PostgreSQL, Kafka

---

### CLI Toolkit

_2020 – 2021_

A developer CLI with no extra fields.
`;

describe("parse(projects)", () => {
  const result = parse(PROJECTS, "projects");

  it("captures the section label", () => {
    assert.equal(result.label, "Selected Projects");
  });

  it("parses entries with ordered generic fields", () => {
    assert.equal(result.projects.length, 2);
    const [a, b] = result.projects;
    assert.equal(a.title, "Billing Platform");
    assert.deepEqual(a.period, { start: "2021", end: "2022" });
    assert.equal(a.description, "A multi-tenant billing system.");
    assert.deepEqual(a.fields.map((f) => f.key), [
      "associated with",
      "highlights",
      "selected technologies",
    ]);
    // `inline` follows the source: `**Label:** value` is inline, `**Label**` +
    // bullet list is not — so the renderer never guesses from the value count.
    assert.deepEqual(a.fields.map((f) => f.inline), [true, false, true]);
    assert.deepEqual(a.fields[1].value, [
      "Processed millions of invoices",
      "99.99% uptime",
    ]);
    assert.deepEqual(a.fields[2].value, ["TypeScript", "PostgreSQL", "Kafka"]);

    assert.equal(b.title, "CLI Toolkit");
    assert.equal(b.description, "A developer CLI with no extra fields.");
    assert.deepEqual(b.fields, []);
  });

  it("throws when there are no project entries", () => {
    assert.throws(() => parse("## Projects\n", "projects"), ParseError);
  });
});
