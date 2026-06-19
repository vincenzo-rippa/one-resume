# one-resume — language-agnostic, capture-based, manifest-driven redesign

Active plan. Branch `project-streamlining`. Supersedes the labels/i18n parts of
`REFACTOR.md` (which is retired in the final step). Content source root for the
CLI: `C:\Users\admin\Developer\profile-source`.

## Principles

1. **Job-centric.** Every operation transforms one declared input → one output.
   A **manifest** is a list of jobs (a single job is a list of one). The CLI's
   `buildOne`/`buildAll` collapse into one **manifest runner**.
2. **Language-agnostic.** No `en`/`it` anywhere in any package. The parser does
   the real parsing **positionally** and **captures** section titles + field
   labels from the markdown — there are no anchors and no localization package.
3. **No hardcoded paths/labels/locales.** Paths come from input: a single CLI
   job carries a full path; `--manifest <path>` reads a manifest. Manifests live
   **outside** the monorepo, in the content source, and reference root-relative
   paths. The content source is the root (a filesystem dir for the CLI, a GitHub
   repo for the API — mirrors the API's `GitHubConfig`); everything else is a
   parameter.
4. **A manifest is an API request payload.** Same shape drives the CLI and the
   HTTP API.
5. **Explicit, lean.** Required fields only; no god objects, no silent defaults
   where a value is genuinely required. The one principled exception: a missing
   *parse anchor* is impossible because there are no anchors — the parser falls
   back to structure by design.

## Locked contracts

### `@one-resume/domain`
Renamed from `@one-resume/types`. It is a zero-runtime *domain model* (interfaces
only) — not a TS `@types/*` shim, and deliberately not a `core`: there is no shared
runtime to gather (each package owns its own helpers), so `core` would promise logic
it doesn't hold. It is the dependency-free hub at the centre of the parse→render
pipeline; parser is the input adapter, pdf/docx/content the output adapters.
```ts
interface ParsedCv {
  profile: Profile;
  labels: SectionLabels;                 // captured from the markdown headings
  experiences: Experience[];
  education: Education[];
  projects: Project[];                   // embedded section; [] when absent
  footer: string;
}
// The single, mandatory Label object — captured, no overrides, no per-tool wording.
interface SectionLabels { about: string; experience: string; education: string; technologies: string; projects: string }

interface Project {
  title: string;
  period: Period;
  description: string;
  fields: ProjectField[];                // ordered; associated-with / technologies / highlights are all just fields
}
interface ProjectField { key: string; label: string; value: string[]; inline: boolean }  // key = normalize(label); inline = `**Label:** a,b` (one line) vs `**Label**` + bullet list
interface Period { start: string; end: string }                          // end is literal markdown text; no "ongoing" sentinel
interface Contact { label: string; value: string }   // header contact segment, captured verbatim & ordered; "" label = bare value (email)
// Profile.contacts: Contact[]. Portfolio is just a labelled contact — no separate field, no hardcoded service keys.
```

### `@one-resume/parser` — one command, strongly typed, positional, no anchors
```ts
function parse(markdown: string, type: "cv"): ParsedCv
function parse(markdown: string, type: "projects"): ParsedProjects
```
A CV with a projects section is still parsed as `"cv"` — there is no separate variant. Unsupported
types are a compile error (overloads), not a runtime branch. Sections are
identified by token depth/position; their titles and project field labels are
**captured**. Validation is structural (heading depth, section order/count),
not text-dictionary based.

### `@one-resume/pdf` / `@one-resume/docx` — job arrays, no label/ type params
```ts
renderPdf(jobs: { parsed: ParsedCv | ParsedProjects; out: string }[]): void
renderDocx(jobs: { parsed: ParsedCv | ParsedProjects }[]): Uint8Array[]
```
Labels come from `parsed.labels` (never passed in). The doc kind is read from
`parsed` (discriminant in the data, not a parameter). PDF uses one adaptive
template (the projects section renders only when present) + the projects template. DOCX adjusts to the
captured wording. **PDF and content are the outputs that must stay correct.**

### `@one-resume/content` (= "export json")
Owns multi-parse + locale grouping (reused by the API). Parses the cv (+ optional
projects) and emits `content.json` including the captured `labels`. The staleness
**`check` does not live here** — it moves to the CLI.

### Content source + manifests (JSON)
- Content source = a configured root. CLI: a filesystem dir (`profile-source`).
  API: a GitHub repo (`GitHubConfig`). Paths in jobs/manifests are root-relative.
- A **manifest** is a JSON array of jobs; each job is minimal now that labels are
  captured and anchors are gone:
  ```jsonc
  // { op: "json" | "pdf" | "docx", type: "cv" | "projects", input, output }
  [ { "op": "pdf",  "type": "cv",       "input": "cv/main/en-cv.md",      "output": "out/en.pdf" },
    { "op": "json", "type": "cv",       "input": "cv/main/en-cv.md",
      "projects": "projects/en-projects.md",                              "output": "en/content.json" } ]
  ```
- Manifests + example manifests live in the content source (`profile-source`),
  organized there. The API payload is the same job shape (output omitted →
  streamed/returned).

## Markdown contract changes
- **Mandatory `## About`** before the about paragraphs (captured as `labels.about`;
  consumers may ignore it).
- **Unified projects**: `## <Projects heading>` + `### <Title>` entries everywhere
  — standalone (`type:"projects"`) and embedded in a CV alike.
- **Project entry**: `### Title`, `_Period_`, prose (description), then labelled
  fields `**Label:** value` and `**Label**` + list (captured as `fields`,
  ordered; highlights included).
- **Header contacts**: the location line is `Based · Availability`; every other
  header line is a `·`-separated contact line whose segments are captured in
  order — `Label: value` keeps its label, a bare segment (email) has none.
  Portfolio is just a labelled contact (`Portfolio: …`), not a special field.
- **Current role**: the author writes whatever end word they want
  (`2021 – Present` / `– Presente` / `– Présent`); it renders verbatim.
- **No stray sections** between Education and the footer (the only optional
  trailing section is projects).

## Dropped
`@one-resume/localization` (whole package), all parser language dictionaries +
anchors, the `ongoing` normalization, per-tool label wording, every path/label/
locale constant (`BULK_DIRS`, `*_TARGETS`, `detectLocale`, `SUPPORTED_LOCALES`,
the `examples`/`out` defaults-as-logic). `Profile.portfolio` and the header's
hardcoded contact keys + url-scheme normalization (`mailto:`/`https://`/`strip-url`)
go too — contacts are captured verbatim. Hard golden/baseline gating is dropped
(product is not live). `special` leaves the monorepo (below).

## Phased plan
0. **Rename `@one-resume/types` → `@one-resume/domain`** (done before Phase 4, while
   only the parser was migrated so the blast radius was smallest): `git mv`, rewrite
   import specifiers, regenerate the lockfile (purged the stale `types` + leftover
   `fs` orphan nodes). Parser typechecks + 13/13 tests green.
1. **Extract `special` → `apps/special`** as a self-contained app that uses the
   workspace packages; gitignore it from the monorepo so it can be its own
   private repo (`git init` done by the maintainer). Remove special from
   `packages/pdf` / `apps/cli`.
2. **Parser rewrite** — positional capture, `parse(md, type)`, new `ParsedCv`
   shape; rewrite parser tests; **prove `es`/`fr` parse** alongside `en`/`it`.
3. **Markdown contract + `examples/`** updated to the new shape (+ the contract doc).
3b. **De-hardcode header contacts** (own commit, before the renderers): `Profile.contacts`
   becomes ordered `Contact[]` captured verbatim (label-if-present); the parser's
   hardcoded service keys, the `portfolio` field, and url-scheme normalization are
   removed; examples fold portfolio into the contact line. This is the last header
   hardcode, removed while the templates are already being rewritten.
4. **Renderers** — `renderPdf`/`renderDocx` read `parsed.labels`, job arrays,
   adaptive templates. Two commits: (a) rework + clean the typst templates to the
   new payload (behaviour-preserving cleanup: dedup, drop dead `special` code),
   (b) the renderers themselves. **Verify PDF** on the examples; DOCX adjusts.
5. **content `exportJson`** to the new shape; verify `content.json`.
6. **Content source** (DONE — split from the rest of 6): a shared
   `ContentSource { read(path) }` port in `@one-resume/content` + `loadContent`;
   the CLI's `FsContentSource` and the api's `GitHubRepository` are the two
   adapters; CLI reads route through it. **Deferred** (separate session, low
   priority): JSON manifests in `profile-source` + a manifest runner replacing
   `buildOne`/`buildAll` + deleting the CLI's `targets.ts` lists. The CLI keeping
   local target lists is acceptable; packages + api are fully de-hardcoded.
7. **Delete `@one-resume/localization`** (DONE): nothing imported it once labels
   were captured. Also removed the dead `PdfLabels`/`DocxLabels` + the api's
   `/v1/labels` endpoints.
8. **Revise package testing** as needed (packages are tested with inline,
   sibling-free fixtures; **apps are and remain test-free**).
9. **Docs (Step 7)** — rewrite `README.md` + `ARCHITECTURE.md` around `packages/*`
   (6) + `apps/{cli,api}` incl. a Licence section (AGPL-3.0); per-package READMEs;
   `apps/api/.env.example`; retire `REFACTOR.md` (distribute its still-relevant
   contracts into ARCHITECTURE/READMEs).

## External ripples (not done here)
- **`pro-landing`** is NOT updated now — it will move to consuming the content
  **API**, so its `content.json` coupling changes later, not in this refactor.
- **`special`** becomes its own private repo (nested in `apps/`, gitignored).

## Verification (lean — no golden byte-gating)
Per-package inline-fixture tests (incl. `es`/`fr` parse fixtures as the
language-agnostic proof) + the fresh-clone demo gate producing artifacts under
the configured output. PDF and content are the outputs that must stay correct.
