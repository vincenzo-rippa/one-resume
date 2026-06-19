# one-resume

A small, **language-agnostic** document pipeline: CV / projects markdown → typed
data → print-ready **PDF** (Typst), ATS-friendly **DOCX**, and the **content
JSON** a website consumes. One markdown source, three rendered outputs, no
per-language code.

The parser reads structure *positionally* — there are no keyword dictionaries or
anchors — so the same code parses an English, Italian, Spanish, or French CV and
**captures** the section titles and field labels from the markdown itself.

## Quickstart (zero config)

A fresh clone renders the bundled CC0 examples to `./out` with no setup:

```bash
npm install                                  # Node ≥ 22; installs the workspaces
npm run pdf  -- --all                        # examples/ → out/pdf/*.pdf   (needs Typst)
npm run doc  -- --all                        # examples/ → out/ats/**/*.docx
npm run sync                                 # examples/ → out/locales/{en,it}/content.json
npm run parse -- examples/cv/main/en-cv.md   # → ParsedCv JSON on stdout
```

PDF builds need the [Typst CLI](https://typst.app/docs/install)
(`winget install Typst.Typst` / `brew install typst`).

## Layout

An npm-workspaces monorepo. TypeScript runs straight from source via `tsx` — no
build step. Dependencies point one way; the domain model is the hub.

| Package | Role |
| --- | --- |
| [`@one-resume/domain`](packages/domain) | Zero-runtime domain model — the interfaces every other package shares. |
| [`@one-resume/parser`](packages/parser) | Markdown → `ParsedCv` / `ParsedProjects`. Positional, language-agnostic. |
| [`@one-resume/pdf`](packages/pdf) | `ParsedCv` → Typst PDF (bundled Inter fonts, pinned Typst). |
| [`@one-resume/docx`](packages/docx) | `ParsedCv` → ATS-friendly `.docx` bytes. |
| [`@one-resume/content`](packages/content) | `ParsedCv` → the site `content.json`; the `ContentSource` port. |

| App | Role |
| --- | --- |
| [`apps/cli`](apps/cli) | The `one-resume` CLI: `parse` / `pdf` / `docx` / `sync` / `check`. |
| [`apps/api`](apps/api) | Koa HTTP API serving parsed content from a GitHub source. |

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the design and
[the content contract](packages/parser/docs/CONTENT_CONTRACT.md) for the markdown
rules.

## Commands

| Command | What it does |
| --- | --- |
| `npm run parse -- <md>` | Parse one CV markdown to `ParsedCv` JSON (stdout, or `--out <file>`). |
| `npm run pdf -- --input <md> [--template cv\|projects] [--out <file>]` | Render one PDF. |
| `npm run pdf -- --public` | The site PDFs → `SITE_PUBLIC_CV_DIR`. |
| `npm run pdf -- --all` | Every CV/projects markdown under the content root → `out/pdf`. |
| `npm run doc -- --input <md>` · `npm run doc -- --all` | ATS DOCX, one or all. |
| `npm run sync [-- --dry-run]` | Per-language `content.json` → `SITE_LOCALES_DIR`. |
| `npm run check` | Fail if a committed `content.json` is stale. |
| `npm test` | Run the package test suites. |

(`pdf:public`, `pdf:all`, `doc:all`, `sync:check` are shortcuts for the forms above.)

## Configuration

Demo-first: with nothing set, the CLI reads the bundled `examples/` and writes to
`./out`. Override via `apps/cli/.env` (copy
[`apps/cli/.env.example`](apps/cli/.env.example)) — every var is optional:

| Var | Default | Purpose |
| --- | --- | --- |
| `CONTENT_DIR` | `examples` | Markdown source root (`cv/`, `projects/`). |
| `OUTPUT_DIR` | `out` | Base for all generated output. |
| `SITE_PUBLIC_CV_DIR` | `<out>/public` | Where `pdf --public` writes. |
| `SITE_LOCALES_DIR` | `<out>/locales` | Where `sync` writes `content.json`. |
| `TYPST_BIN` | `typst` | The Typst binary (resolved on PATH). |

The HTTP API ([`apps/api`](apps/api)) reads from a GitHub repo instead — see its
README and [`.env.example`](apps/api/.env.example).

## License

[AGPL-3.0-only](LICENSE). You may use, modify, and distribute this software —
including offering it over a network — provided derivative works stay under the
same license and their source remains available.
