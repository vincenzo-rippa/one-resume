# Plan: monorepo (packages/ + apps/), contract-first packages

## Context

The core-parser tech-debt refactor just landed (commits abc130b → 1f38f47 on
`rename-refactor`). It left an identity problem: one-resume was "a library
workspace with orchestration scripts bolted on" — neither a clean importable
library set nor a clean app. Symptoms: render packages weren't importable (no
`exports`), three near-identical `scripts/build.ts` that build nothing, three
naming schemes, and a `SourceResolver` abstraction earning nothing now that it
only does `read → string | null`.

The decisive lesson from this session: **the original pain came from never
fixing API contracts up front** — when contracts are fixed, only the
implementation can slip. So this plan is contract-first. We settled every
package's public API by discussion before any code. This plan file captures
those locked contracts plus the staged execution to reach them.

It supersedes the in-repo `REFACTOR.md` (delete it in S1).

## Locked decisions

1. **Monorepo: `packages/*` (reusable libs) + `apps/*` (concrete deliverables).**
2. **Drop `SourceResolver` and the loaders entirely.** Parser is `string → data`;
   apps do their own I/O.
3. **Renderers return `Promise<Uint8Array>`** and perform their own rendering I/O
   (typst spawn / docx packing) internally. Rendering *is* the job — no
   payload/transform ceremony.
4. **Shared `@one-resume/types`** holds domain types only (zero runtime; consumed
   with `import type`). Resolves the re-export question: one type hub.
5. **Labels stay per-tool** (`PdfLabels` ≠ `DocxLabels`, current wording kept →
   output stays byte-identical), but their **en/it values live in
   `@one-resume/localization`**, making renderers language-agnostic.
6. **`@one-resume/content` deals in serialized output** — `buildSiteContent`
   returns the canonical content.json **string**; no `SiteContent` TS object.
7. **`@one-resume/localization`** owns only label *values* + locale name-parsing
   (`detectLocale`). Targets/paths/config live in `apps/cli`.
8. **Scaffold `apps/api`** as a placeholder (README only).
9. **`private: true`, publish-ready** (proper `exports`, no install-dir writes).

## Package graph (acyclic)

```
@one-resume/types          (leaf; domain interfaces only, zero runtime)
   ▲      ▲      ▲      ▲
   │      │      │      └── @one-resume/content  → + parser
   │      │      └───────── @one-resume/docx     → + docx          (exports DocxLabels)
   │      └──────────────── @one-resume/pdf      → + yaml, typst   (exports PdfLabels)
   └─────────────────────── @one-resume/parser   → + marked
                            @one-resume/localization → types + pdf, docx (type-only)
                                                          provides PdfLabels/DocxLabels values
   apps/cli   → every package above (config, paths, TARGETS, fs I/O, orchestration, bin)
   apps/api   → placeholder
```

## Locked contracts

```ts
// @one-resume/types — zero runtime; import type only (set verbatimModuleSyntax)
export interface Profile { /* name, location, contacts, portfolio, headline,
  tagline, taglineShort, aboutParagraphs, selectedTechnologies */ }
export interface Location { based: string; availability: string }
export interface Period { start: string; end: string | "ongoing" }
export interface Experience { /* … */ }
export interface Education { /* … */ }
export interface Project { /* … */ }
export interface ParsedCv {
  profile: Profile; experiences: Experience[]; education: Education[];
  projects: Project[]; footer: string; keywords: string[];
}
export type ParsedProjects = Project[];

// @one-resume/parser — dep: types, marked
export function parseCv(markdown: string, options?: { sourceName?: string }): ParsedCv;
export function parseProjects(markdown: string, options?: { sourceName?: string }): ParsedProjects;
export class ParseError extends Error { sourceName?: string; line?: number }

// @one-resume/pdf — dep: types, yaml; spawns typst internally
export interface PdfLabels {
  about: string; experience: string; education: string;
  selectedTechnologies: string; projects: string; technologies: string;
  portfolio: string; ongoing: string; languages: string; otherSkills: string;
}
export interface SpecialPayload {
  yamlText: string;            // special sidecar YAML (parsed + validated here)
  photo: Uint8Array;           // caller-read bytes; renderer writes to its typst scratch
  options?: { sourceName?: string };
}
// TypstPdf is the one sanctioned class: its constructor IS the typst preflight
// (runs `typst --version`). A successfully-constructed instance proves typst is
// present and reachable. Render methods shell out (typst → output FILE, its
// native mode — no stdout capture) and resolve when the file is written.
export class TypstPdf {
  constructor(options?: { bin?: string });  // bin: the app passes resolved TYPST_BIN; throws PdfError if unreachable
  renderCv(parsed: ParsedCv, labels: PdfLabels, outPath: string): Promise<void>;
  renderFreelanceCv(parsed: ParsedCv, labels: PdfLabels, outPath: string): Promise<void>;
  renderProjects(projects: ParsedProjects, labels: PdfLabels, outPath: string): Promise<void>;
  renderSpecialCv(parsed: ParsedCv, labels: PdfLabels, payload: SpecialPayload, outPath: string): Promise<void>;
}
export class PdfError extends Error {
  sourceName?: string; field?: string;  // sidecar validation
  cause?: unknown;                       // typst not reachable (ctor) / non-zero compile exit
}

// @one-resume/docx — dep: types, docx
export interface DocxLabels {
  selectedTechnologies: string; experience: string; education: string;
  projects: string; ongoing: string; associatedWith: string; portfolio: string;
}
export function renderCv(parsed: ParsedCv, labels: DocxLabels): Promise<Uint8Array>;
export function renderFreelanceCv(parsed: ParsedCv, labels: DocxLabels): Promise<Uint8Array>;
export function renderProjects(projects: ParsedProjects, labels: DocxLabels): Promise<Uint8Array>;

// @one-resume/content — dep: types, parser
export function buildSiteContent(cvMarkdown: string, projectsMarkdown?: string): string; // canonical JSON text (2-space + \n)
export type CheckStatus = "ok" | "stale" | "error";
export interface CheckResult { status: CheckStatus; staleKeys?: string[]; error?: ContentError }
export function checkContent(cvMarkdown: string, projectsMarkdown: string | undefined, current: string): CheckResult; // never throws
export class ContentError extends Error { sourceName?: string; line?: number }

// @one-resume/localization — dep: types; pdf + docx (type-only for the label shapes)
export type Locale = "en" | "it";
export function detectLocale(fileName: string): Locale;   // "it-cv.md" → "it"
export function pdfLabels(locale: Locale): PdfLabels;
export function docxLabels(locale: Locale): DocxLabels;
```

### Contract notes / resolved pitfalls

- **`buildSiteContent` returns a string** → content owns the canonical format;
  byte-stable on disk by construction. `checkContent` compares **structurally**
  (parse both, deep-equal per top-level key → `staleKeys`), so reformatting
  noise never reads as stale. `checkContent` never throws — bad markdown or
  invalid `current` JSON → `status:"error"` with `error`. `buildSiteContent`
  *does* throw `ParseError` on bad markdown.
- **Special photo** travels as `Uint8Array` in `SpecialPayload` — the renderer
  never resolves paths; the app reads the bytes and the renderer writes them into
  its typst scratch.
- **PDF is fire-to-file, not fire-to-bytes.** Dropping `Uint8Array` removes the
  stdout-capture impl risk entirely: `TypstPdf` tells typst to compile to
  `outPath` (typst's native file output — the mechanism already in use today).
  Scratch (data JSON + photo) keeps the current working layout under the typst
  `--root`; no new sandbox gymnastics. The earlier "validate stdout/sandbox"
  spike is **dropped** — there's nothing risky left to spike.
- **`TypstPdf` constructor = the single typst-availability gate.** The app builds
  one instance at startup; if typst is missing the app fails fast with a clear
  `PdfError` at boot (on the server: at container start, not per-request).
- **`PdfError`** covers sidecar validation (`field`) and typst failures
  (`cause`); no captured `stderr` (typst's own errors go to inherited stdio).
- **docx stays `Promise<Uint8Array>`** (in-process `Packer`, no external tool, no
  risk; returning bytes lets the api stream to an HTTP response). Only pdf shells
  out, so only pdf is file-output + class. The app writes docx bytes itself.
- **Behavior is preserved**: per-tool labels keep their exact current wording, so
  PDF text / DOCX `document.xml` stay byte-identical to baseline. The only thing
  that moves is *where label values live*.
- **`import type` discipline**: `@one-resume/types` has zero runtime exports;
  under tsx/esbuild a value-style import of a type throws at runtime. Set
  `verbatimModuleSyntax: true` workspace-wide so the compiler forces `import type`.

## Stages

**Verification policy (decided):** do **not** run tests / tsc / e2e smokes after
each phase — it's too costly per turn. Each stage instead ends with a **recap →
commit (on approval)**. The full **golden-harness verification runs once**, as the
final stage (S5), after the whole refactor — *before* resuming the original
demo/docs plan. (Stages are still ordered so the app stays runnable between them,
but proving it is deferred to the single S5 gate.)

> **Sequencing note for the executor:** in S1, move `source-nodefs` to a
> **package** (`packages/fs`, scoped `@one-resume/fs`), not into `apps/cli` yet —
> the exporters still import it until S3, and a `packages → apps` import would
> invert the layering. Fold `@one-resume/fs` into `apps/cli` in S4 once the
> exporters no longer need it.

- **S1 — Monorepo layout + `@one-resume` scope.** `git mv`:
  `core-parser`→`packages/parser`, `export-pdf`→`packages/pdf`,
  `export-doc`→`packages/docx`, `export-json`→`packages/content`,
  `source-nodefs`→`packages/fs` (interim; folds into `apps/cli` at S4). Rename
  `package.json` names to `@one-resume/*` (the future apps go unscoped, e.g.
  `one-resume-cli`). Root `workspaces` → `["packages/*","apps/*"]`. Fix by-name
  imports, regenerate lockfile. Pure ripple, zero behavior change. Recap → commit.
- **S2 — Extract `@one-resume/types`.** New package; move the domain interfaces
  out of `packages/parser/src/types.ts` into it; parser + everyone import them
  with `import type`. Enable `verbatimModuleSyntax: true` across tsconfigs. No
  behavior change.
- **S3 — Lock the library contracts.** Rewrite pdf/docx/content public APIs to
  the contracts above. **pdf:** introduce the `TypstPdf` class (constructor runs
  the `typst --version` preflight; render methods shell out to typst → `outPath`,
  `Promise<void>`); keep the *current* file-output + `.cache` scratch mechanism
  (no stdout capture — the prior impl risk is designed out, no spike needed).
  **docx:** `renderCv`/etc. return `Promise<Uint8Array>` via `Packer`; drop
  `writeDocx`/`Document` from the public API. **content:** parse markdown →
  canonical JSON string; `checkContent` returns a verdict; drop `SiteContent`.
  Drop `SourceResolver` + loaders from parser. Create `@one-resume/localization`
  (label values + `detectLocale`). Update the existing per-package
  `scripts/build.ts` *in place* to call the new APIs so the app stays runnable
  (they move to `apps/cli` in S4). Recap → commit.
- **S4 — Consolidate delivery into `apps/cli`.** One `one-resume` bin with
  subcommands (`parse|pdf|docx|sync|check|special`); single argv parser, single
  `config.ts` (`loadConfig`, including resolving `TYPST_BIN`), single
  `TARGETS`/manifest + output naming, fs reads/writes. The app constructs ONE
  `new TypstPdf({ bin: config.typstBin })` at startup (the typst preflight lives
  there now — no separate cli preflight) and writes docx bytes itself. Delete the
  three `scripts/build.ts`, the old `fs` bin, and fold `@one-resume/fs` in (now
  plain `fs.readFile`/`writeFile`/`copyFile` in cli). Repoint root scripts to
  `one-resume <cmd>`. Scaffold `apps/api/` (README + minimal package.json).
  Recap → commit.
- **S5 — Single verification gate (the only test run).** Re-capture the golden
  baseline first (it was **not** captured this session — capture from the current
  `rename-refactor` HEAD before starting S1, or reconstruct from the committed
  `content.json` + a clean build). Then once: `npm test`, per-package
  `tsc --noEmit`, and the golden harness — parser JSON for the 5 real markdown
  files, extracted PDF text (`pdftotext -layout`), DOCX `word/document.xml`, and
  `content.json` must be byte-identical to baseline (pure restructuring; PDFs/DOCX
  aren't byte-reproducible — compare extracted text/xml, not raw bytes). Add a few
  inline-fixture per-package smokes (pdf/docx render non-empty; content
  build/check; localization detect) and promote the harness to
  `scripts/verify-baseline.sh`. Recap → commit. **This is the hand-off point.**

## After the refactor — resume the original 7-step plan

Once S5 is green, the remaining work is the *original* plan (see the
`refactor-plan` memory), now unblocked by the clean packages/apps base:

- **Step 6 — Demo readiness + api deployment shell.** Bundle `examples/` (CC0
  dummy CV + projects + freelance, each with a `<!-- keywords -->` comment;
  exclude special). Flip `apps/cli` config defaults to **demo-first**
  (`contentDir` → `examples/`, outputs → `./out/`; `.env` overrides). Friendly
  file-not-found errors naming the file + `CONTENT_DIR` (the `TypstPdf` ctor
  already fails fast when typst is absent). Fresh-clone smoke gate (no `.env`, no
  siblings → `npm install` → exports produce `./out/` artifacts) goes green.
  **apps/api Dockerfile**: base image with the **pinned** typst 0.14.2 binary
  baked in (copy from `ghcr.io/typst/typst` or download the static release) so the
  container's `TypstPdf` constructs at boot and renders byte-identically to the
  local CLI; `TYPST_BIN` points at the baked-in path. (Render.com Docker service.)
- **Step 7 — Public docs.** Rewrite `ARCHITECTURE.md` around the packages/apps
  layers + the contracts; per-package `README.md`; fresh-clone quickstart in the
  root README; prerequisites (Typst = Apache-2.0); roadmap (the future
  `apps/api`); a root `CLAUDE.md` agent-context file. Retire `REFACTOR.md` once
  its content is distributed.

> **Doc staleness during the refactor is expected and accepted:** `ARCHITECTURE.md`
> / `README.md` describe the pre-refactor (`core-parser`/`export-*`) layout and
> are intentionally left stale until step 7. Don't fix them piecemeal mid-refactor.

## Critical patterns to reuse (don't reinvent)

- **Golden-harness verification** (this session's node-tsx snippet: parser JSON ×5,
  `pdftotext -layout`, unzip DOCX `document.xml`, deep-equal vs baseline) →
  `scripts/verify-baseline.sh` in S5.
- **Inline-fixture, sibling-free tests** — pattern in
  `packages/parser/test/*.test.ts`. Reuse for the new package tests.
- **typst invocation** with `--font-path <fontsDir> --ignore-system-fonts` and
  **file output** — keep the current working mechanism verbatim (it already
  compiles to a path with `.cache` scratch under the typst root). Wrapping it in
  `TypstPdf` + making the binary path configurable is the only change.
- **`TokenStream.error(message, token?)`** ergonomics — keep.
- **`docx` style tokens** (`packages/docx/src/style.ts`) — move as-is.
- **yaml stays only in `packages/pdf`** (special sidecar); parser/content stay
  yaml-free.

## Verification — runs ONCE, at S5 (not per stage)

Between stages: only a recap + commit. The full check below runs a single time at
S5 (and again at the end of step 6's fresh-clone gate). **Re-capture the baseline
first** — it was not captured this session.

```bash
# typecheck every workspace
for p in packages/* apps/*; do
  [ -f "$p/tsconfig.json" ] && npx tsc --noEmit -p "$p/tsconfig.json"
done
npm test

# golden e2e smokes against the maintainer's real content
C=/c/Users/admin/Developer/pro-profile-source
npm run pdf  -- --input $C/cv/main/en-cv.md --out /tmp/v-en.pdf
npm run pdf  -- --input $C/projects/en-projects.md --out /tmp/v-proj.pdf
npm run pdf  -- --input $C/freelance/en-cv-freelance.md --out /tmp/v-free.pdf
npm run pdf:special
npm run doc  -- --input $C/cv/main/en-cv.md --out /tmp/v-en.docx
npm run sync-locales -- --check
# byte-equivalence: PDF text + DOCX document.xml + content.json vs baseline
```

After S6: fresh-clone smoke from a tmp clone with no `.env`, no siblings —
`npm install && npm run pdf:public && npm run sync` must produce real artifacts
under `./out/`.

## Open watch-items

- `localization → pdf/docx` is a type-only edge (it imports the label shapes it
  provides values for). Acyclic and erased at runtime; revisit only if it grates.
- The api writes a per-request temp PDF (typst → file) then streams it back —
  fine, but if profiling ever shows it hurts, that's the trigger to revisit a
  bytes-returning path (and only then weigh `typst-ts-node-compiler`, accepting
  possible output divergence from the pinned binary).
- `TypstPdf` is the single sanctioned class (constructor invariant = typst
  reachable). If a second external-tool boundary ever appears, reuse this shape.
- If `apps/api` becomes real, reassess whether `TARGETS`/manifest graduates from
  `apps/cli` into a shared package.
- The `printed/` private-output convention may migrate to `./out/` for
  consistency with the demo defaults (decide in S6).
