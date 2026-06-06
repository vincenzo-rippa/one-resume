# one-resume

Deterministic document pipeline for CV / projects / freelance résumés. Turns
markdown sources into typed data, then into print-ready **PDFs** (Typst) and
ATS-friendly **DOCX** files, and regenerates the content JSON consumed by the
[`pro-landing`](../pro-landing) website.

This repo holds only the tooling. The markdown content lives in the
[`pro-profile-source`](../pro-profile-source) repo, and the generated public
assets are written back into the website. All three repos are expected to sit
side by side under a common parent directory; see **Configuration** to point
elsewhere.

## Packages

| Path            | Purpose                                                             |
| --------------- | ------------------------------------------------------------------ |
| `core-parser/`  | Markdown → typed `ParsedCv` (deterministic, fail-fast). Pure: `marked` only, no `node:*`, no `yaml`. |
| `source-nodefs/`| Node I/O layer: `FileSystemSource`, pipeline path config, and the `core-parse` debug CLI. |
| `export-pdf/`   | Typst templates + Node wrapper → CV / projects / freelance PDFs.   |
| `export-doc/`   | `docx` renderer → ATS-friendly DOCX exports.                       |
| `export-json/`  | core-parser → the per-language `content.json` the site consumes.   |

`core-parser` defines `parseCv` / `parseProjects` and a one-method
`SourceResolver` seam; `source-nodefs` is the filesystem implementation that the
exporters build on. See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the package graph
and design decisions, and `core-parser/docs/CONTENT_CONTRACT.md` for the markdown
structural rules. Keywords live in the markdown as a `<!-- keywords: … -->`
comment; the only YAML sidecar left is the private cv-special one (in
`export-pdf/src/special/`).

## Prerequisites

- Node.js ≥ 22
- [Typst CLI](https://typst.app/docs/install) for PDF builds —
  `winget install Typst.Typst` or `brew install typst`

## Install

```bash
npm install   # workspaces: installs all package deps (core-parser / source-nodefs / export-*) + tooling
```

## Configuration

External paths come from environment variables, loaded from an optional `.env`
at the repo root. Every var is optional and defaults to the side-by-side layout.
Copy `.env.example` to `.env` to override.

| Var                  | Default                          | Used by              |
| -------------------- | -------------------------------- | -------------------- |
| `CONTENT_DIR`        | `../pro-profile-source`          | all                  |
| `SITE_PUBLIC_CV_DIR` | `../pro-landing/public/cv`       | `pdf:public`         |
| `SITE_LOCALES_DIR`   | `../pro-landing/src/lib/locales` | `sync-locales`       |
| `PRINTED_DIR`        | `./printed`                      | `pdf:all`, `doc`     |

## Scripts

| Command                       | What it does                                                  |
| ----------------------------- | ------------------------------------------------------------ |
| `npm test`                    | Run the core-parser test suite                               |
| `npm run sync-locales`        | Regenerate the site's `locales/{en,it}/content.json`         |
| `npm run pdf:public`          | Build the 4 public PDFs into `SITE_PUBLIC_CV_DIR`            |
| `npm run pdf -- --input <md>` | Build one PDF (`--input`/`--out` resolve against cwd)        |
| `npm run pdf:all`             | Build every parser-known PDF into `PRINTED_DIR/pdf`          |
| `npm run pdf:special`         | Build the private cv-special PDF                             |
| `npm run doc -- --input <md>` | Build one ATS DOCX                                           |
| `npm run doc:all`             | Build every parser-known DOCX into `PRINTED_DIR/ats`         |
| `npm run parse -- <md>`       | Parse one markdown file to JSON on stdout                    |

## Content workflow

```bash
# Edit a markdown file in ../pro-profile-source, then:
npm run sync-locales           # regenerate the site's content JSON
npm run pdf:public             # regenerate the 4 public PDFs the site ships
```

Commit the markdown change in `pro-profile-source` and the regenerated
PDFs / content JSON in `pro-landing`.
