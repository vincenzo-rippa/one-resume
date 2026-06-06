# Architecture & decisions

How the one-resume pipeline is structured and the decisions behind the current
shape. For the markdown source-format rules see
[`core-parser/docs/CONTENT_CONTRACT.md`](core-parser/docs/CONTENT_CONTRACT.md);
for commands and configuration see [`README.md`](README.md).

## Package graph

The pipeline is a single Node monolith built from modular workspace packages.
Dependencies point one way (acyclic):

```
core-parser        pure markdown → typed data. marked only; no node:*, no yaml.
  ▲                SourceResolver interface + read→parse loaders + the parsers.
  │
source-nodefs      the node I/O layer. FileSystemSource (the fs SourceResolver,
  ▲                plus write/copy/list + the resolved pipeline config),
  │                loadConfig, and the debug `core-parse` CLI.
  │
  ├── export-json   parser output → the site's per-language content.json.
  ├── export-doc    parser output → ATS-friendly DOCX (docx).
  └── export-pdf    parser output → Typst PDFs. Owns the only surviving YAML
                    sidecar (cv-special) in its src/special/ submodule.

  (api — future — gets its own SourceResolver impl and reuses export-json's
   buildContent; it depends on core-parser, not source-nodefs.)
```

Why the split: `core-parser` is the reusable, environment-free core — it can run
anywhere a string can be produced (a serverless function, a browser, a test). All
filesystem and pipeline-path concerns live one layer out in `source-nodefs`, so a
future remote source (GitHub, S3) is a new `SourceResolver` implementation, not a
change to the parser.

## core-parser is pure

`core-parser/src` imports **zero `node:*` modules** and no `yaml`. Its only
runtime dependency is `marked`. `@types/node` stays a devDependency for the test
runner only. Public API (named exports):

- `parseCv(markdown, { sourceName? }): ParsedCv`
- `parseProjects(markdown, { sourceName? }): ParsedProjects`
- `ParseError`, and the output types.

`sourceName` is a diagnostic label only (it appears in `ParseError` messages as
`sourceName:line: …`); the parser never reads from it.

### No context object

There is no `Ctx`. A `TokenStream(tokens, source, sourceName?)` owns the token
cursor, the original source text, and the diagnostic label, and exposes
`error(message, token?): ParseError` which computes the line number itself.
Readers raise errors with `throw stream.error(...)` — they never thread a context
or compute lines at the call site. `parsePeriod(text)` is pure and returns
`Period | null`; the calling reader turns `null` into a `stream.error`.

## SourceResolver

The seam between "where the bytes come from" and the pure parser is one method:

```ts
interface SourceResolver {
  read(sourceName: string): Promise<string | null>;
}
```

`read` returns `null` when the name does not resolve. The **caller** decides
whether that is fatal: the loaders (`loadParsedCv` / `loadParsedProjects` in
`core-parser/src/source`) treat the markdown as required and throw a clear error
on `null`.

`FileSystemSource` (in `source-nodefs`) is the filesystem implementation. It
resolves names against a `baseDir` (absolute names short-circuit), returns `null`
on `ENOENT`, and adds concrete extras beyond the interface for node consumers:
`write` (JSON/DOCX), `copy` (the special photo), `list` (the `--all` sweep), and a
read-only `config` (the resolved pipeline paths) so importers locate files without
re-resolving the environment. Only `read` is part of the `SourceResolver`
contract.

## Parser output shape

```ts
interface ParsedCv {
  profile: Profile;          // name, location, contacts, portfolio, headline,
                             // tagline, taglineShort, aboutParagraphs,
                             // selectedTechnologies
  experiences: Experience[];
  education: Education[];
  projects: Project[];       // embedded freelance projects; [] for standard CVs
  footer: string;            // GDPR/legal notice (root-level, not in profile)
  keywords: string[];        // from the markdown comment (see below)
}

type ParsedProjects = Project[];
```

`ParsedProjects` is a bare alias for now — a named placeholder so a future
projects object carrying its own metadata is a non-breaking change (YAGNI).

## Keywords live in the markdown

SEO/ATS keywords are part of the CV markdown, as an HTML comment that is never
rendered (consistent with the existing `<!-- Tagline -->` convention):

```md
<!-- keywords: technical lead, lead software engineer, API design -->
```

`readers/readMetadata.ts` extracts them — `readMetadata(markdown): Metadata`,
where `Metadata = { keywords: string[] }`. The comment may appear anywhere in the
file; the value is comma-separated and trimmed. `Metadata` is the stable
extension point: adding a second metadata field (or a general meta-block, or
per-project metadata) is an internal change behind this interface — deferred
until a real need appears.

This replaced per-CV `*.meta.yaml` keyword sidecars. The markdown is now the
single source of truth, and `core-parser` is yaml-free.

export-pdf threads `keywords` into the Typst payload and the CV templates
`set document(keywords: …)`, so the generated PDFs carry the keyword metadata.

## The one surviving sidecar

The private **cv-special** variant still uses a YAML sidecar
(`content/special/{lang}-special.meta.yaml`) for data that has no place in the CV
prose: street address, legal-status line, spoken languages, other skills, and the
headshot filename. That sidecar and its parser/validator live in
`export-pdf/src/special/` — not in `core-parser`. The photo (binary) is copied via
`FileSystemSource.copy`, never through `SourceResolver` (so `read`-only stays the
whole interface). export-pdf is the only package that depends on `yaml`.

## Behavior contract

The refactor preserved behavior end to end:

- Parser JSON output is unchanged except for the documented reshape
  (`cvData` → `profile`, `footer`/`keywords` moved to the root).
- `content.json` changes only by that reshape; keyword **values** are identical
  (re-sourced from the markdown comment).
- PDF and DOCX rendered content are unchanged. The single artifact addition is
  **PDF keyword metadata** (`/Keywords`), which the baseline PDFs did not carry.

PDFs and DOCX are not byte-reproducible (Typst embeds a build timestamp; docx
embeds dates), so behavior is verified by comparing extracted PDF text, DOCX
`document.xml`, and the parser/`content.json` output — all deterministic.

## Deferred / watch-items

- **Project-level metadata** and a **general meta-block** — deferred behind the
  `readMetadata` seam until needed.
- `loadConfig` (pipeline-specific output paths) shares `source-nodefs` with the
  generic `FileSystemSource`; split if that coupling grates.
- The debug CLI lives in `source-nodefs` as a `bin`; it can graduate to its own
  package if it grows.
