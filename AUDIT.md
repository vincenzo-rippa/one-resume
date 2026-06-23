# Pre-go-live audit & publication plan

Working doc for the final pass before publishing **one-resume** as a public
repository. It states the project's purpose (so the audit is shaped around intent,
not just code) and the topics to work through. **Retire this file once published.**

---

## Purpose — the north star

one-resume is a **single source of truth for a professional résumé**. You keep your
CV (and projects) as plain **markdown in one place**; the system derives every
format you need from that one source:

- a **print-ready PDF** (Typst) for sharing/printing,
- an **ATS-friendly DOCX** for job applications (recruiter parsers), and
- structured **content JSON** for a personal website.

…in **any language**, with no per-language code and no duplicated content — the
parser reads structure positionally and *captures* section titles/labels from the
markdown itself (an EN/IT/ES/FR CV all work with the same code).

Two ways to drive the same core:

- **CLI** — renders locally from a filesystem content dir (`parse` / `pdf` / `docx`).
- **HTTP API** — renders on demand from a **GitHub** content repo, so a static
  personal-site build can fetch its content JSON + PDF/DOCX at build time. Edit the
  markdown once → every output updates everywhere.

### Why the shape is what it is

- **Language-agnostic by capture** — no dictionaries, no anchors, no `en`/`it` branches.
- **Ports & adapters** — a zero-runtime domain model at the centre; `@one-resume/parser`
  is the input adapter; `pdf`/`docx` are output adapters; a `DocumentSource` port has
  two adapters (filesystem for the CLI, GitHub for the API). One core serves both a
  local tool and a network service.
- **TS-as-source, no build** — packages run straight from `.ts` via `tsx`; deployment
  carries the whole workspace. Simplicity over packaging ceremony (trade-off: you ship
  source, not a built lib — see Topic 3).
- **AGPL-3.0** — copyleft including the network-use clause.

**The goal now:** go public as a clonable, **demo-first** open-source project — a fresh
clone renders the bundled CC0 examples to `./out` with zero config — that is also a
usable tool and a portfolio piece.

> **Confirm/refine this purpose at the very start of the audit** — it is the lens for
> every decision below.

## Settle this first: who is the audience?

The single decision that shapes Topics 3 and 4:

- **(a) My tool, open-sourced** — primarily the owner's résumé tooling, public for
  transparency/portfolio. → "good enough" docs, no npm publish, minimal contributor
  ceremony.
- **(b) A tool for others to adopt and run** — others clone/deploy it. → quickstart +
  API-contract stability matter more; consider npm packages, CONTRIBUTING, issue
  templates, CI.

My read: it sits closer to (a) with (b) aspirations (the "edit once, publish everywhere"
+ demo-first framing). Pick a point on that line before doing Topic 3/4.

---

## Audit topics

### 1. The `@one-resume/docx` package (the under-scrutinised one)

- `src/render.ts` is one ~335-line file (helpers → builders → public API). Decide whether
  to split for parity with the parser's `readers/` structure, or leave it (it's cohesive).
- Confirm it reads `parsed.labels` only — **no** dead label-dictionary code (DocxLabels was dropped).
- `src/style.ts`: review the spacing/size constants (magic numbers, naming, are they justified?).
- Coverage: `test/render.test.ts` (3) — are the cases enough? (CV w/ embedded projects;
  standalone projects; inline-field vs bullet-list field; contact-line rendering; the
  **deliberately omitted** GDPR footer for ATS).
- Output determinism: `docx` `Packer` likely embeds timestamps → output is **not** byte-stable.
  Reconcile with any "reproducible/byte-identical" claims (see Topic 10).
- README accuracy + the ATS rationale (simple styles, no footer) documented.

### 2. Naming & project structure (reorder/rename only — no behaviour change)

- **Adapter-name asymmetry**: `FsDocumentSource` (CLI) vs `GitHubRepository` (API) both
  implement `DocumentSource` but read as "Source" vs "Repository". Unify? (e.g. `GitHubDocumentSource`).
- `apps/cli/src/targets.ts` now holds only `resolveKind` + `defaultDocxOut`. Rename
  (e.g. `kinds.ts`) and/or move `defaultDocxOut` next to the docx command?
- `apps/cli/src/io.ts`: prune dead helpers left from the `special` era (`readBytes` —
  "the special photo" — and possibly `copyFile`); confirm each remaining export is used.
- Filename convention: kebab (`github-repo.ts`, `github-config.ts`) vs the rest — make consistent.
- Confirm the final `packages/*` + `apps/*` layout; `apps/special` is intentionally **external**
  (its own private repo) — make sure docs say so and nothing references missing code.
- Names worth a second look: `PipelineConfig`, `models.ts` (API zod), the `one-resume-cli` /
  `one-resume-api` app names.

### 3. Publishing decisions

- **Current locked decision** (from earlier sessions): publish **nothing** to npm; all
  packages stay `private: true`; ship via **public GitHub repo + Docker**; keep **TS-as-source**
  (no `dist` build). Re-confirm or revisit.
- If any package *should* be a reusable npm lib (candidate: `@one-resume/parser`), that needs a
  build step + `exports`/`dist` + `.ts`-specifier removal + a version policy — a real change. Decide.
- Keep `private: true` on packages even for a public repo (it blocks accidental `npm publish`).
- Versioning: packages are `0.x`. Pick a scheme + whether to cut tagged releases.
- Docker image: build-on-Render vs publish to a registry (e.g. GHCR)?

### 4. Overall audit & docs consolidation

- **`DESIGN.md`** is a now-completed *refactor plan* ("Active plan. Branch project-streamlining…").
  Retire it (like `REFACTOR.md`) or distil the durable parts into `ARCHITECTURE.md`.
- README publish polish: crisp value prop, the demo-first quickstart, prerequisites (Typst),
  license. Consider a screenshot/sample-output.
- Decide what public-repo meta-docs are wanted: `CONTRIBUTING.md`, `SECURITY.md`,
  `CODE_OF_CONDUCT.md`, issue/PR templates — **scope by the audience decision above**.
- **`AGENTS.md` / `CLAUDE.md`** — this repo has heavy agent-driven history; a short agent-context
  file (architecture, conventions, "run `npm test`", the TS-as-source rule) pays off and signals the workflow.
- Per-package READMEs + `packages/parser/docs/CONTENT_CONTRACT.md` (the markdown rules) —
  consistency + discoverability from the root README.
- Verify every doc matches the current code (maintained through the build-out, but a fresh pass).

### 5. Publish as a public repo (owner does this) — pre-publish safety

- **`apps/special` must not ship.** It's a separate private repo embedded locally; now added to
  `.gitignore` (this commit). Verify it's not in git history.
- **Secrets**: `.env` is gitignored (✓ — `apps/cli/.env` / `apps/api/.env` hold real tokens).
  Scan the **git history** for any committed PAT/API key before going public.
- No private content (the `examples/` are CC0 — ✓). `LICENSE` present (AGPL-3.0 — ✓).
- Final `git status` clean; the working tree is what you intend to publish.

---

## Added topics (beyond the five)

### 6. Security pass (before public)

- API: `X-API-KEY` (timing-safe compare ✓), path-traversal validators (now unit-tested ✓),
  PAT redaction in `IoError.data` (✓), 5xx messages collapse to generic (✓). Re-verify holistically.
- No CORS is configured — confirm that's right (build-time/server-to-server consumer, not a browser).
- `npm audit` (a known dev-only esbuild low-sev via tsx). Triage.
- Quick threat-model note: the API renders attacker-controllable markdown via typst — confirm the
  sandbox/blast-radius is acceptable (typst runs with `--ignore-system-fonts`, fixed templates).

### 7. Docker / Render build verification (important — never done)

The API image has **never been built** (the engine was down when it was authored). Before go-live:
build `apps/api/Dockerfile` from the repo root, run it, and confirm `npm ci` succeeds (the
`@koa/bodyparser` dep gap that would have broken it is now fixed), typst renders in-container, and
`/health` + `/v1/content` + `/v1/pdf` + `/v1/docx` respond. This is the API's only deploy path and is unproven.

### 8. Dependency hygiene

- Remove the **dead `yaml` dependency** from `apps/cli/package.json` (the sidecar that used it left
  for `apps/special`). Re-scan all packages/apps for unused deps.
- The lockfile was hand-edited once (to drop the extraneous `content` node) — re-validate integrity
  (`npm ci` in a clean checkout).

### 9. CI

- Add GitHub Actions: `tsc` across workspaces + `npm test` + the fresh-clone smoke gate
  (`scripts/smoke-fresh-clone.sh`). Proves the build for every PR and guards the public repo.

### 10. Reproducibility-claim accuracy

- typst embeds a timestamp/`/ID`, so PDFs are **content/text-identical** run-to-run, not
  **byte**-identical (docx likely the same). Reword the "byte-identical" claims in the pdf README,
  ARCHITECTURE, and the api Dockerfile comment — or pin `SOURCE_DATE_EPOCH`/`--creation-timestamp`
  if true byte-stability is actually wanted.

---

## Suggested execution

Topics **1 (docx)**, **6 (security)**, and **2 (structure)** are good candidates for parallel
multi-agent review (each a focused, read-mostly pass that converges on findings). **7 (Docker)** is
a single must-do verification. Settle the **audience question** and **Topic 3** first — they gate the
docs scope in Topic 4.
