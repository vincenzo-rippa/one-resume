# one-resume (CLI)

The `one-resume` command-line app — `parse` / `pdf` / `docx`. It owns config,
paths, and filesystem I/O, and orchestrates the `@one-resume/*` libraries. Run it
via the root `npm run` scripts (see the [repo README](../../README.md)).

## Commands

| Command                                                  | Does                                                    |
| -------------------------------------------------------- | ------------------------------------------------------- |
| `parse <md> [--out <json>] [--check <json>]`             | Parse a CV markdown → `ParsedCv` JSON (stdout/`--out`); `--check <json>` exits 1 if stale. |
| `pdf --input <md> [--template cv\|projects] [--out <f>]` | Render one PDF.                                         |
| `docx --input <md>`                                      | Render one ATS DOCX.                                    |
| `pdf --all` · `docx --all`                               | Every markdown under `CONTENT_DIR`, one at a time.      |

## How it reads & writes

Markdown is read through `FsDocumentSource` (the filesystem `DocumentSource`),
rooted at `CONTENT_DIR` (default `examples/`); output goes under `OUTPUT_DIR`
(default `out/`). Config is environment-only — see [`.env.example`](.env.example).
Demo-first: a fresh clone works with zero setup.

`src/targets.ts` holds two small CLI-local helpers — `resolveKind` (filename →
`cv`/`projects`) and `defaultDocxOut` (DOCX output-path naming). `--all` walks
`CONTENT_DIR` for `*.md`; there are no hardcoded target lists.
