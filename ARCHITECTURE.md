# Architecture

`one-resume` is a small **ports-and-adapters** pipeline. A zero-runtime domain
model sits at the centre; everything else adapts _into_ it (parsing) or _out of_
it (rendering), and two thin delivery mechanisms (a CLI and an HTTP API) wire it
to the outside world.

For the markdown source rules see
[the content contract](packages/parser/docs/CONTENT_CONTRACT.md); for commands
and configuration see [`README.md`](README.md).

## The shape

```
                         markdown
                            │
             parse(md,type) │  input adapter  →  @one-resume/parser
                            ▼
                 ┌────────────────────┐
                 │  @one-resume/domain │   ParsedCv / ParsedProjects —
                 │  (interfaces only,  │   the model every package shares;
                 │   zero runtime)     │   depends on nothing.
                 └────────────────────┘
                            │  output adapters
              ┌─────────────┴─────────────┐
              ▼                           ▼
        @one-resume/pdf            @one-resume/docx
         Typst → PDF                → .docx bytes
              └─────────────┬─────────────┘
                            ▼  delivery
              apps/cli                  apps/api
        (FsDocumentSource)    (GitHubRepository; also content JSON)
```

Dependencies are acyclic and point inward: every package depends on
`@one-resume/domain` and on nothing else of ours. The renderers don't even import
the parser — they take the already-parsed data.

## Packages

- **`@one-resume/domain`** — the interfaces (`ParsedCv`, `Profile`, `Contact`,
  `Experience`, `Education`, `Project`, `ProjectField`, `Period`, `SectionLabels`,
  `Location`). Zero runtime: consumed with `import type` only. Deliberately _not_
  a TS `@types/*` shim and _not_ a `core` — there is no shared runtime to gather,
  because each package owns its own helpers.
- **`@one-resume/parser`** — the input adapter: `parse(md, "cv" | "projects")`
  (strongly-typed overloads). Reads structure positionally and **captures** the
  section titles + project-field labels from the markdown. No anchors, no
  dictionaries, no per-language branches.
- **`@one-resume/pdf` / `@one-resume/docx`** — output adapters. They take the
  parsed document and read its captured labels; no labels or `type` parameter is
  passed in.

The site's **content JSON** is no longer its own package — the API's `/v1/content`
controller builds it (CV + optional standalone projects, merged) from the parsed
data.

## Language-agnostic by construction

The earlier design injected `en`/`it` label dictionaries into the parser and
renderers. This one doesn't — the parser captures whatever the markdown says:

- **Section titles** (`## About`, `## Esperienza Professionale`, …) are captured
  into `ParsedCv.labels` (one `SectionLabels` object). Renderers read
  `parsed.labels`; they carry no wording of their own.
- **Contacts** are captured verbatim and in order as `Contact[]`
  (`{ label, value }`): `LinkedIn: …` keeps its label, a bare email has none. No
  service is special-cased.
- **Project fields** are captured generically as `ProjectField[]` with an
  `inline` flag recording how the author wrote them — `**Label:** a, b` (one line)
  vs `**Label**` + a bullet list — so a renderer honours intent without guessing
  from the value count.
- **The period end is literal** — the author writes `Present` / `Presente` /
  `Présent`; it renders verbatim, with no sentinel.

The proof: Spanish and French CV fixtures parse with _no_ parser change (see the
`@one-resume/parser` tests).

## Reading from anywhere: the `DocumentSource` port

`@one-resume/domain` defines the one seam between "where the bytes live" and the
pure pipeline:

```ts
interface DocumentSource {
  read(path: string): Promise<string>;
}
```

The CLI implements it with `FsDocumentSource` (a filesystem root); the API
implements it with `GitHubRepository` (octokit over a repo). Reads route through
`parseFrom` (read-then-parse). The site's merged content JSON — a CV with a
standalone projects doc folded in — is built by the API's `/v1/content` controller
(`GET /v1/content?cv=…&projects=…`); the CLI's `parse` handles a single CV.

## Rendering

- **PDF** (`@one-resume/pdf`): a `PdfRenderer` instance shells out to the Typst CLI,
  pinned to the repo-bundled Inter fonts with `--ignore-system-fonts`, so output
  is reproducible across machines. `renderPdf(jobs)` writes one PDF per
  `{ parsed, out }`; the parsed _shape_ selects the template — a CV uses the one
  adaptive `cv` template (it renders an embedded projects section only when
  present), a standalone projects document uses `projects`. There is no separate
  "freelance" variant.
- **DOCX** (`@one-resume/docx`): `renderDocx(docs)` returns `.docx` bytes per
  document — no filesystem I/O, so the caller writes them or streams them from an
  HTTP response. The GDPR footer is intentionally omitted (ATS noise).

Neither format is byte-reproducible (Typst embeds a build timestamp; docx embeds
dates), so behaviour is verified by rendering and inspecting, plus the parser and
content test suites.

## Conventions

- **TypeScript as source — no build step.** `tsx` runs `.ts` directly;
  `moduleResolution: bundler`, `allowImportingTsExtensions`,
  `verbatimModuleSyntax`. Cross-package imports use the package name; the
  workspace symlinks resolve them.
- **`import type` discipline.** `@one-resume/domain` has zero runtime exports;
  every consumer imports its interfaces with `import type`.
- **Apps stay test-free.** Logic lives in the packages (tested with inline,
  sibling-free fixtures); the CLI and API are thin wiring.

## Document metadata

SEO/ATS keywords live in the CV markdown as a never-rendered comment —
`<!-- keywords: a, b, c -->` — read by the parser into `ParsedCv.keywords` and
threaded into the PDF's `set document(keywords: …)`.

## Not in this repo

- The **markdown content** is private — a separate `profile-source` repo, or any
  GitHub repo the API points at. The bundled `examples/` are CC0 stand-ins.
- The **`special`** Italian photo-CV variant is its own private app, nested under
  `apps/` and gitignored, reusing `@one-resume/parser` + `@one-resume/domain`.

## Deferred

- A **manifest runner** — JSON job manifests (`{ op, type, input, output }`) in
  the content source, replacing the CLI's hardcoded target lists
  (`apps/cli/src/targets.ts`). The `DocumentSource` it needs already exists; the
  manifest _is_ the API request shape.
