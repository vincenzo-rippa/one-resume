# one-resume (CLI)

The `one-resume` command-line app — `parse` / `pdf` / `docx` / `sync` / `check`.
It owns config, paths, target lists, and filesystem I/O, and orchestrates the
`@one-resume/*` libraries. Run it via the root `npm run` scripts (see the
[repo README](../../README.md)).

## Commands

| Command | Does |
| --- | --- |
| `parse <md> [--out <json>]` | Parse a CV markdown → `ParsedCv` JSON (stdout/`--out`). |
| `pdf --input <md> [--template cv\|projects] [--out <f>]` | Render one PDF. |
| `pdf --public` · `pdf --all` | The site PDFs / every markdown under the content root. |
| `docx --input <md>` · `docx --all` | ATS DOCX, one or all. |
| `sync [--dry-run]` | Per-language `content.json`. |
| `check` | Fail if a committed `content.json` is stale. |

## How it reads & writes

Markdown is read through `FsContentSource` (the filesystem `ContentSource`),
rooted at `CONTENT_DIR` (default `examples/`); output goes under `OUTPUT_DIR`
(default `out/`). Config is environment-only — see [`.env.example`](.env.example).
Demo-first: a fresh clone works with zero setup.

`src/targets.ts` holds the CLI-local build target lists (`BULK_DIRS`, the public
PDF set, the sync targets). That's fine for a local tool; a future manifest
runner would replace them for other consumers.
