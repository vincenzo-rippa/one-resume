# AGENTS.md

Context for humans and coding agents working in this repository.

## What this is

one-resume turns one markdown source — a CV, optionally with a projects section —
into a print-ready **PDF**, an ATS-friendly **DOCX**, and the **content JSON** a
website consumes, in any language. See [README.md](README.md) for usage and
[ARCHITECTURE.md](ARCHITECTURE.md) for the design.

## Run it

- `npm install` — Node ≥ 22; installs the workspaces.
- `npm test` — runs every package and app test suite.
- `npm run pdf -- --all` · `npm run doc -- --all` · `npm run parse -- <md>` — see the README.
- Typecheck one workspace: `npx tsc -p <workspace>/tsconfig.json --noEmit`.

PDF rendering needs the Typst CLI (see the README).

## Conventions (please keep them)

- **TypeScript as source — no build step.** `tsx` runs `.ts` directly
  (`moduleResolution: bundler`, `allowImportingTsExtensions`,
  `verbatimModuleSyntax`). Don't add a compile/`dist` step; cross-package imports
  use the package name and resolve through the workspace.
- **`import type` discipline.** `@one-resume/domain` is interfaces only (zero
  runtime); import its types with `import type`.
- **Dependencies point inward.** `domain` depends on nothing of ours; the parser
  and renderers depend only on `domain`; the apps wire everything together. Keep
  that graph acyclic.
- **Ports & adapters.** External I/O lives behind a port (`DocumentSource`:
  filesystem for the CLI, GitHub for the API). Put new I/O behind a port too.
- **Tests live with the logic.** Packages carry the substantive suites (inline,
  sibling-free fixtures); apps add focused unit tests for their own guards.
- **Run `npm test` and `tsc` before calling a change done.**

## Provenance

This is an openly AI-assisted project, built with a three-tier method:

- **AI-driven** — generated under direction.
- **AI-assisted** — generated, then reworked by hand.
- **AI-audited** — hand-written, with AI restricted to comments, renames, and
  test coverage (no logic changes).

The author owns the architecture, the decisions, and the review; the tiers
describe _how_ the code was produced, not a claim that any of it wrote itself.
Agents: the design is intentional — prefer small, reversible changes and keep to
the conventions above.
