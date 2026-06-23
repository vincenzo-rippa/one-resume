import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getContent } from "../src/controllers/content.ts";
import { AppError } from "../src/lib/error.ts";

// The /v1/content use-case: read CV (+ optional standalone projects) and merge.
// Driven through a minimal fake ctx + in-memory DocumentSource — no router, no
// server, no GitHub.

const CV = `# Jane Doe

Milan, Italy · Open to remote

jane@example.com

## Senior Engineer

_Building reliable systems._

## About

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

const PROJECTS = `## Selected Projects

### Billing Platform

_2021 – 2022_

A multi-tenant billing system.

**Selected technologies:** TypeScript, PostgreSQL
`;

interface CtxLike {
  query: Record<string, unknown>;
  documentSource: { read(path: string): Promise<string> };
  body?: unknown;
}

function makeCtx(
  query: Record<string, unknown>,
  files: Record<string, string>,
): CtxLike {
  return {
    query,
    documentSource: {
      read: async (p: string) => {
        const md = files[p];
        if (md === undefined) {
          const e = new Error(`not found: ${p}`) as Error & { status: number };
          e.status = 404;
          throw e;
        }
        return md;
      },
    },
  };
}

const FILES = { "cv.md": CV, "projects.md": PROJECTS };

describe("getContent", () => {
  it("returns the parsed CV with empty projects when only cv is given", async () => {
    const ctx = makeCtx({ cv: "cv.md" }, FILES);
    await getContent(ctx as never);
    const body = ctx.body as {
      profile: { name: string };
      projects: unknown[];
      labels: { projects: string };
    };
    assert.equal(body.profile.name, "Jane Doe");
    assert.deepEqual(body.projects, []);
    assert.equal(body.labels.projects, "");
  });

  it("merges a standalone projects doc — its entries and section label win", async () => {
    const ctx = makeCtx({ cv: "cv.md", projects: "projects.md" }, FILES);
    await getContent(ctx as never);
    const body = ctx.body as {
      projects: { title: string }[];
      labels: { projects: string };
    };
    assert.equal(body.projects.length, 1);
    assert.equal(body.projects[0].title, "Billing Platform");
    assert.equal(body.labels.projects, "Selected Projects");
  });

  it("maps a parse failure to a 422 AppError", async () => {
    // A projects doc parsed as a CV fails the structural contract.
    const ctx = makeCtx({ cv: "projects.md" }, FILES);
    await assert.rejects(
      getContent(ctx as never),
      (e) => e instanceof AppError && e.status === 422,
    );
  });

  it("propagates a source read error (e.g. 404) unchanged", async () => {
    const ctx = makeCtx({ cv: "missing.md" }, FILES);
    await assert.rejects(
      getContent(ctx as never),
      (e) => (e as { status?: number }).status === 404,
    );
  });
});
