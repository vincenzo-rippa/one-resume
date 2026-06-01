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

| Path         | Purpose                                                            |
| ------------ | ------------------------------------------------------------------ |
| `cv-parser/` | Markdown → typed `ParsedCv` (deterministic, fail-fast).            |
| `cv-pdf/`    | Typst templates + Node wrapper → CV / projects / freelance PDFs.   |
| `cv-ats/`    | `docx` renderer → ATS-friendly DOCX exports.                       |
| `scripts/`   | `sync-locales-from-parser.ts` — regenerates the site's content JSON. |

See `cv-parser/docs/CONTENT_CONTRACT.md` for the markdown structural rules and
sidecar schemas.

## Prerequisites

- Node.js ≥ 22
- [Typst CLI](https://typst.app/docs/install) for PDF builds —
  `winget install Typst.Typst` or `brew install typst`

## Install

```bash
npm install   # workspaces: installs cv-parser / cv-pdf / cv-ats deps + tooling
```

## Configuration

External paths come from environment variables, loaded from an optional `.env`
at the repo root. Every var is optional and defaults to the side-by-side layout.
Copy `.env.example` to `.env` to override.

| Var                  | Default                          | Used by              |
| -------------------- | -------------------------------- | -------------------- |
| `CONTENT_DIR`        | `../pro-profile-source`          | all                  |
| `SITE_PUBLIC_CV_DIR` | `../pro-landing/public/cv`       | `cv:pdf:public`      |
| `SITE_LOCALES_DIR`   | `../pro-landing/src/lib/locales` | `cv:sync-locales`    |
| `PRINTED_DIR`        | `./printed`                      | `cv:pdf:all`, `cv:ats` |

## Scripts

| Command                          | What it does                                                  |
| -------------------------------- | ------------------------------------------------------------- |
| `npm run cv:test`                | Run the cv-parser test suite                                  |
| `npm run cv:sync-locales`        | Regenerate the site's `locales/{en,it}/content.json`         |
| `npm run cv:pdf:public`          | Build the 4 public PDFs into `SITE_PUBLIC_CV_DIR`             |
| `npm run cv:pdf -- --input <md>` | Build one PDF (`--input`/`--out` resolve against cwd)         |
| `npm run cv:pdf:all`             | Build every parser-known PDF into `PRINTED_DIR/pdf`           |
| `npm run cv:pdf:special`         | Build the private cv-special PDF                              |
| `npm run cv:ats -- --input <md>` | Build one ATS DOCX                                            |
| `npm run cv:ats:all`             | Build every parser-known DOCX into `PRINTED_DIR/ats`          |
| `npm run cv:parse -- <md>`       | Parse one markdown file to JSON on stdout                     |

## Content workflow

```bash
# Edit a markdown file in ../pro-profile-source, then:
npm run cv:sync-locales        # regenerate the site's content JSON
npm run cv:pdf:public          # regenerate the 4 public PDFs the site ships
```

Commit the markdown change in `pro-profile-source` and the regenerated
PDFs / content JSON in `pro-landing`.
