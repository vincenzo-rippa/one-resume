# Content contract

The markdown structure `@one-resume/parser` accepts. The parser is **positional**
— it identifies sections by order and heading depth, not by matching known words —
so titles and labels are **captured** from the markdown, and the same rules hold
in any language. Validation is structural: a violation throws a `ParseError` with
a line number.

Two document types, selected by the call:

```ts
parse(markdown, "cv");        // → ParsedCv
parse(markdown, "projects");  // → ParsedProjects
```

## CV (`type: "cv"`)

In order:

1. **Name** — the first line, an `# H1`. → `profile.name`.
2. **Header** — the paragraphs between the name and the headline (any order):
   - **Location line**: `Based · Availability` — two `·`-separated phrases, with
     no `@` and no `Label:` segment. → `profile.location { based, availability }`.
   - **Contact line(s)**: `·`-separated segments, captured in order as
     `Contact[]`. A `Label: value` segment (a colon **followed by a space**)
     keeps its label; a bare segment — e.g. an email — has `label: ""`. Portfolio
     is just a labelled contact (`Portfolio: example.dev`); no service is
     special-cased. A URL scheme (`https://…`) is *not* mistaken for a label
     (its colon has no following space).
3. **Headline** — the first `## H2` after the header. → `profile.headline`.
4. **Taglines** — zero, one, or two italic paragraphs (`_…_`). First →
   `profile.tagline`, second → `profile.taglineShort`.
5. **About** — a mandatory `## About` heading, then paragraphs up to the next
   heading. → `labels.about` (captured) + `profile.aboutParagraphs`.
6. **Technologies** — a heading (`##` or `###`) then either a comma-separated
   paragraph or a bullet list. → `labels.technologies` + `profile.selectedTechnologies`.
7. **Experience** — a `## H2` (→ `labels.experience`), then `### Company — Role`
   entries. Each: an italic meta line `_Location | Period_` (location optional),
   then `-` bullet items. → `experiences[]`.
8. **Education** — a `## H2` (→ `labels.education`), then `**Title**` entries.
   `**Title @ Institution**` captures the institution; an optional subtitle may
   follow as a trailing `_italic_` / `— text` on the same line, or as the next
   italic paragraph.
9. **Projects** *(optional)* — an embedded projects section: a `## <label>`
   heading + `###` entries (see below). Omit it for a CV without projects.
10. **Footer** — the final quoted paragraph (e.g. the GDPR notice). **Required**;
    wrapping quotes and a trailing comma are stripped. → `footer`.

Anywhere in the file, an optional keyword comment:

```md
<!-- keywords: technical lead, api design, typescript -->
```

→ `keywords[]` (comma-separated, trimmed). Other `<!-- … -->` comments are ignored.

## Projects (`type: "projects"`)

A standalone projects document — the same shape as an embedded projects section:

- A `## <label>` heading → `ParsedProjects.label`.
- One or more `### Title` entries. Each entry has, in order:
  - an italic period line `_Start – End_`;
  - prose paragraph(s) → the project `description`;
  - labelled **fields**, captured in order as `ProjectField[]`:
    - `**Label:** a, b, c` → an **inline** field (values comma-split, `inline: true`);
    - `**Label**` followed by a `-` bullet list → a **list** field (`inline: false`).

`key` is the normalized (lowercased) label. A renderer keys off `inline` to
decide one-line vs bulleted, so authorial intent is preserved without guessing.

## Field-level rules

- **Period** — `Start – End`, separated by an en-dash (` – `), em-dash (` — `), or
  hyphen (` - `). The end is **literal text** rendered verbatim — write `Present`
  / `Presente` / `Présent`; there is no "ongoing" sentinel.
- **Separators** — `·` between location/contact segments, `|` between an
  experience entry's location and period, `@` before an education institution.
- **Whitespace / quotes** are normalized (curly quotes → ASCII, non-breaking
  spaces collapsed).

## Minimal CV

```md
# Jane Doe

Milan, Italy · Open to remote

jane@example.com · LinkedIn: linkedin.com/in/jane · Portfolio: jane.dev

## Senior Engineer

_Building reliable systems._

## About

I design and operate backend services.

### Selected technologies

TypeScript, Node.js, PostgreSQL

---

## Professional Experience

### Acme — Backend Engineer

_Milan | 2020 – Present_

- Built the billing pipeline
- Cut p99 latency in half

---

## Education

**BSc Computer Science @ University of Milan**

_Graduated 2016_

---

"I authorize the processing of personal data pursuant to GDPR 679/2016."

<!-- keywords: backend, typescript, node -->
```

The `---` rules are presentational separators — they're skipped. See
[`examples/`](../../../examples) for full CV / projects samples in English and
Italian (and the `es`/`fr` fixtures in the parser tests that prove the rules are
language-agnostic).
