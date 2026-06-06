import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseCv } from "../src/parseCv.ts";
import ParseError from "../src/classes/ParseError.ts";

// A minimal CV that satisfies the full content contract (docs/CONTENT_CONTRACT.md).
// Inline so the suite is self-contained — no sibling content repos required.
const VALID_CV = `# Jane Doe

Milan, Italy · Open to remote

jane@example.com · LinkedIn: linkedin.com/in/jane

## Senior Engineer

_Building reliable systems._

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
`;

describe("parseCv — contract", () => {
  it("parses a minimal valid CV", () => {
    const cv = parseCv(VALID_CV, { sourceName: "valid.md" });

    assert.equal(cv.profile.name, "Jane Doe");
    assert.deepEqual(cv.profile.location, {
      based: "Milan, Italy",
      availability: "Open to remote",
    });
    assert.equal(cv.profile.contacts.email, "mailto:jane@example.com");
    assert.equal(cv.profile.contacts.linkedin, "https://linkedin.com/in/jane");
    assert.equal(cv.profile.headline, "Senior Engineer");
    assert.equal(cv.profile.tagline, "Building reliable systems.");
    assert.equal(cv.profile.taglineShort, "");
    assert.deepEqual(cv.profile.aboutParagraphs, ["I build backend services."]);
    assert.deepEqual(cv.profile.selectedTechnologies, [
      "TypeScript",
      "Node.js",
      "PostgreSQL",
    ]);

    assert.equal(cv.experiences.length, 1);
    assert.deepEqual(cv.experiences[0], {
      company: "Acme",
      role: "Backend Engineer",
      location: "Milan",
      period: { start: "2020", end: "ongoing" },
      description: ["Built the billing pipeline", "Cut p99 latency in half"],
    });

    assert.equal(cv.education.length, 1);
    assert.deepEqual(cv.education[0], {
      title: "BSc Computer Science",
      subtitle: "Graduated 2016",
      institution: "University of Milan",
    });

    assert.match(cv.footer, /GDPR 679\/2016/);
    // A standard CV carries no embedded Selected Projects section.
    assert.deepEqual(cv.projects, []);
  });

  it("reads two taglines as long + short", () => {
    const md = VALID_CV.replace(
      "_Building reliable systems._\n",
      "_Building reliable systems._\n\n_Reliability-first engineer._\n",
    );
    const cv = parseCv(md, { sourceName: "two-taglines.md" });
    assert.equal(cv.profile.tagline, "Building reliable systems.");
    assert.equal(cv.profile.taglineShort, "Reliability-first engineer.");
  });

  it("treats a CV with no tagline as empty taglines", () => {
    const md = VALID_CV.replace("_Building reliable systems._\n\n", "");
    const cv = parseCv(md, { sourceName: "no-tagline.md" });
    assert.equal(cv.profile.tagline, "");
    assert.equal(cv.profile.taglineShort, "");
  });

  it("reads keywords from the markdown comment", () => {
    const md = VALID_CV.replace(
      "# Jane Doe\n",
      "# Jane Doe\n\n<!-- keywords: lead engineer, backend -->\n",
    );
    const cv = parseCv(md, { sourceName: "keywords.md" });
    assert.deepEqual(cv.keywords, ["lead engineer", "backend"]);
  });

  it("defaults keywords to [] with no keywords comment", () => {
    const cv = parseCv(VALID_CV, { sourceName: "valid.md" });
    assert.deepEqual(cv.keywords, []);
  });

  it("throws ParseError when the footer is missing", () => {
    const md = VALID_CV.replace(
      '"I authorize the processing of personal data pursuant to GDPR 679/2016."\n',
      "",
    );
    assert.throws(() => parseCv(md, { sourceName: "no-footer.md" }), ParseError);
  });

  it("throws ParseError when the first line is not an H1 name", () => {
    const md = VALID_CV.replace("# Jane Doe", "## Jane Doe");
    assert.throws(() => parseCv(md, { sourceName: "no-h1.md" }), ParseError);
  });

  it("throws ParseError when the contacts line is missing", () => {
    const md = VALID_CV.replace(
      "jane@example.com · LinkedIn: linkedin.com/in/jane\n\n",
      "",
    );
    assert.throws(
      () => parseCv(md, { sourceName: "no-contacts.md" }),
      ParseError,
    );
  });
});
