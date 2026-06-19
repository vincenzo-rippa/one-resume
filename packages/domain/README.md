# @one-resume/domain

The zero-runtime **domain model** for the one-resume pipeline — the interfaces
every other package shares. No runtime code, no dependencies; consumed with
`import type` only (the workspace sets `verbatimModuleSyntax`).

It is the dependency-free hub of a ports-and-adapters design: the parser maps
markdown *into* these types, the renderers map them *out* to PDF / DOCX / JSON.
Deliberately not a TS `@types/*` shim and not a `core` — there is no shared
runtime to gather, because each package owns its own helpers.

## Exports

- `ParsedCv` — `{ profile, labels, experiences, education, projects, footer, keywords }`.
- `ParsedProjects` — a standalone projects document: `{ label, projects }`.
- `Profile` — name, `location`, `contacts: Contact[]`, headline, tagline(s),
  `aboutParagraphs`, `selectedTechnologies`.
- `Contact` — `{ label, value }`; `label` is `""` for a bare value (e.g. an email).
- `SectionLabels` — the captured section titles (`about`, `experience`,
  `education`, `technologies`, `projects`).
- `Experience`, `Education`, `Project`, `ProjectField`, `Period`, `Location`.

`Period.end` is literal markdown text (e.g. `"Present"`) — no sentinel.
`ProjectField.inline` records whether the field was authored inline
(`**Label:** a, b`) or as a `**Label**` + bullet list.
