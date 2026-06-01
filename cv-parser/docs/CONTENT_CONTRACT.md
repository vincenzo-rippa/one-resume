# Content contract and update workflow

This document defines:

- the required structure of markdown files in `content/`
- the canonical pipeline that turns them into PDFs and locale modules
- the constraints any agent must follow while performing updates

> **The AI sync workflow for CV is retired.** A deterministic TypeScript
> parser (`cv-parser/`) now reads every markdown file in `content/cv/**`,
> `content/projects/**`, and `content/freelance/**`. To regenerate the
> locale modules under `src/lib/locales/`, run `npm run cv:sync-locales`. To
> regenerate the 4 public PDFs under `public/cv/`, run
> `npm run cv:pdf:public` (the pre-push hook does this automatically). The
> structural rules in §1.3–1.4 are the parser's spec — if the markdown
> doesn't match, parsing fails with a `file:line` error rather than
> silently producing wrong output.
>
> Do **not** ask an agent to hand-edit `src/lib/locales/{en,it}/cv.ts` or
> `src/lib/locales/derived/cv/*.ts` — those modules are now a generated
> artifact. Edit the markdown, run the sync command, commit the
> regenerated locale alongside.

---

## 1. Content markdown contract

### 1.1 Files

- `content/cv/main/en-cv.md`
- `content/cv/main/it-cv.md`
- `content/cv/derived/{lang}-cv-{type}.md` (one file per language-and-variant;
  see §1.3.4)
- `content/projects/en-projects.md`
- `content/projects/it-projects.md`
- `content/freelance/{lang}-cv-freelance.md` (combined CV + embedded
  Selected Projects; see §1.5)

Optional sidecars sit next to the markdown they augment and carry data
that has no good place in prose (keywords, contact labels, the
cv-special extras). See §1.6 for the schemas.

### 1.2 Consistency

**CV files**

- files in `content/cv/main` and `content/cv/derived`
- **Main CV (`cv-main`):** all language variants must have the same number and
  order of experience entries, and the same number of education entries.
- **Derived CV (`cv-derived`):** there is no requirement that a variant exist in
  every language. A single file (for example only Italian) is valid. When two or
  more markdown files share the same `{type}` (for example `en-cv-mobile.md` and
  `it-cv-mobile.md`), they must align: same number and order of experience
  entries, and same number of education entries, as for main CV.

**Projects files**

- files in `content/projects`
- language files must have the same number and order of project entries
- entry titles should correspond, even if translations differ

### 1.3 CV files

#### 1.3.1 Structure

The CV files follow this structure in order:

1. `# Full Name`
1. A blank line (optional)
1. `Based · Availability` (location line: text before the first `·` is
   `location.based`, text after is `location.availability`)
1. A blank line (optional)
1. Contact line(s): first line is typically `email · LinkedIn: url`. Additional
   lines may follow (for example portfolio on its own line).
1. When the portfolio is on a separate line, it uses the form
   `Portfolio · value` (only `value` is stored in `CvData.portfolio`; the UI
   label comes from `base.hero.portfolio`). Portfolio may also appear on the
   same line as contacts when the source file uses a compact layout.
1. `## Headline`
1. **Taglines (see 1.3.2):** either one or two italic lines after the headline,
   optionally marked with HTML comments when there are two taglines (see below).
1. One or more plain paragraphs for the about section
1. `### Selected technologies` or `### Tecnologie selezionate` or another `###`
   heading for the technology list (for example `### Tecnologie principali` in a
   derived CV)
1. Comma-separated technologies, possibly wrapped across multiple lines
1. `---`
1. `## Professional Experience` or `## Esperienza Professionale`
1. Repeated experience blocks
1. `---`
1. `## Education` or `## Formazione`
1. One or more education entries (each: bold line, optionally followed by
   italic)

#### 1.3.2 Field rules

- **Name**: first line of the file, e.g. `# Vincenzo Rippa`.
- **Location**: the first line after the name block that matches the pattern
  `text · text` used for base location and availability (typically the first
  non-empty line that is not a contact/portfolio line). Parse the text before
  the first `·` into `location.based` and the text after it into
  `location.availability`.
- **Contacts**: parsed from the contact line(s) after the location line. The
  first token is the email address. The optional LinkedIn value is parsed as a
  URL and stored in `CvData.contacts` as a `Record<string, LinkItem>` (see
  `src/lib/types.ts`). The parser only includes contacts that are present in the
  markdown.
- **Portfolio**: the value after `Portfolio ·` when that pattern appears; only
  the value is stored in `CvData.portfolio`.
- **Headline**: the first `##` heading after the header block (after location,
  contacts, and portfolio lines).
- **Tagline (`CvData.tagline`)** and **short tagline (`CvData.taglineShort`)**:
  - **Two taglines in the markdown** (long + short): use HTML comments so the
    sections are explicit—`<!-- Tagline -->` immediately before the first italic
    line (long tagline, used for SEO and metadata where applicable), and
    `<!-- Short tagline -->` immediately before the second italic line. The
    second line maps to `CvData.taglineShort`.
  - **One tagline in the markdown**: do **not** use HTML comments for taglines.
    The single italic line after the headline maps to `CvData.tagline`. Set
    `CvData.taglineShort` to the empty string `""` (the key must remain
    present).
  - **No tagline in the markdown**: Set both `CvData.tagline` and
    `CvData.taglineShort` to an empty string `""` (the keys must remain
    present).
- **About**: all normal paragraphs until the next `###` heading. Each paragraph
  becomes one entry in `aboutParagraphs`.
- **Selected technologies**: the comma-separated list under the `###` heading
  for technologies. The parser trims items, splits on commas, and stores them in
  `selectedTechnologies`.
- **Separator**: `---`.
- **Experience**: the `## Professional Experience` /
  `## Esperienza Professionale` section contains repeated blocks made of:
  - `### Company — Role`
  - One italic line with `Location | Date range`
  - One or more bullet points
- **Location and period**: parse the text before `|` as the experience location
  and the text after it as the period display string. When updating locales, map
  the period to `period: { start, end }`. Use `end: "ongoing"` when the markdown
  says `Present` or `Presente`.
- **Description**: bullet items become plain strings in `description[]`.
  Continuation lines must be indented so they stay part of the same bullet.
- **Education**: under `## Education` / `## Formazione`, each entry is one or
  two lines. The first line is **bold**: if it contains `@`, the part before `@`
  is the title and the part after is the institution; otherwise the whole bold
  text is the title. An optional second line in _italics_ is the subtitle.
  Entries are stored as `Education[]` in the locale module (see `src/lib/types.ts`:
  `Education { title, subtitle?, institution? }`). Education is exported
  separately from `CvData` (as `education` in each locale’s `cv.ts`;
  locale-keyed names such as `enCvMainEducation` are re-exported from
  `src/lib/locales/index.ts` only) and is included in locale data and printed in the
  CV/PDF; it is not shown on the website. If source markdown incorrectly merges
  two entries on one line, fix the markdown so each education entry starts with
  its own **bold** line (see `content/cv/derived/it-cv-mobile.md` for the
  expected layout).
- **Footer (`CvData.footer`)**: the final block of the CV is a
  blockquote-style paragraph (single line, wrapped in straight or curly
  quotes) carrying the GDPR / authorization-to-process notice. The parser
  strips the wrapping quotes and stores the result as `cvData.footer`.
  This field is required — CVs without a footer line fail to parse.

#### 1.3.3 Types

- CV content is organized by category (currently `main` and `derived`).
- All CV source files share the same markdown structure (sections 1.3.1–1.3.2).
- The destination locale module depends on category:
  - **Main:** `content/cv/main/{lang}-cv.md` → `src/lib/locales/{lang}/cv.ts`
  - **Derived:** `content/cv/derived/{lang}-cv-{type}.md` →
    `src/lib/locales/derived/cv/{lang}-{type}.ts` (see section 1.3.4)
- The exported data shape matches the main CV module (`CvData`, experiences,
  education): same structure as `src/lib/locales/{lang}/cv.ts`.

#### 1.3.4 CV derived (`content/cv/derived`)

- **Markdown filename:** `{lang}-cv-{type}.md`
  - `{lang}` is the language code (for example `en`, `it`), consistent with
    `src/lib/locales` language folders.
  - `{type}` distinguishes the variant (for example `mobile`, `print`).
- **One markdown file → one locale module.** There is no requirement to add a
  second language; derived CVs may exist in a single language only.
- **Language module path:** `src/lib/locales/derived/cv/{lang}-{type}.ts`
  - Example: `content/cv/derived/it-cv-mobile.md` syncs to
    `src/lib/locales/derived/cv/it-mobile.ts`.
- **Module contents:** same as main CV—exports for CV data, experiences, and
  education (see `src/lib/types.ts` and existing `src/lib/locales/{lang}/cv.ts`), not a
  reduced or alternate object shape.
- **Barrel `src/lib/locales/derived/cv/index.ts`:** when you add a new derived
  locale module (`{lang}-{type}.ts`), update this index so the new module is
  exported. Follow the same idea as `src/lib/locales/{lang}/index.ts`: re-export
  `cvData`, `experiences`, and `education` from the new file. If more than one
  derived module exists in the folder, use **prefixed export names** (for
  example `cvData as itMobileCvData`, `experiences as itMobileExperiences`,
  `education as itMobileEducation`) so names do not collide—mirroring how
  `src/lib/locales/index.ts` exposes `enCvMainData`, `itCvMainData`, etc. When only
  one derived module is present, you may use unprefixed `cvData`, `experiences`,
  and `education` from that module, plus a `CV_TYPE` constant analogous to
  `src/lib/locales/{lang}/index.ts`, if useful for consumers.

### 1.4 Projects files

- The first line is `# Projects` or `# Progetti`. It is the document title and
  is ignored for data.
- Entries are split by `---`. Each entry follows this order:
  1. `## Project Title`
  1. `_Date range_`
  1. `**Associated with:** CompanyName` or `**Associato a:** CompanyName`
  1. An optional blank line
  1. One or more plain-text paragraphs for the description
  1. Optional bullet highlights
  1. `**Selected technologies:** ...` or `**Tecnologie selezionate:** ...`
- There is no separate `Role` field.
- Highlights are optional. If no bullet list is present, the parser should use
  an empty array.
- Technologies are split by comma, stored in the same order as the markdown

### 1.5 Freelance CV (`content/freelance/`)

The freelance variant is a standard CV (per §1.3) followed — between
Education and the GDPR footer — by an embedded **Selected Projects**
section:

```
## Selected Projects        ← H2 heading (EN: "Selected Projects",
                              IT: "Progetti Selezionati")
### <Project title>         ← H3 per entry (note: H3, not H2 like the
                              standalone projects files in §1.4)
_<Start> – <End>_
**Associated with:** <value>          ← optional
<description paragraph(s)>
**Highlights**                         ← optional header before bullets
- <highlight>                          ← optional bullet list
**Selected technologies:** a, b, c     ← optional
---                                    ← optional separator
```

Entries follow the same field rules as standalone projects (§1.4). The
parser exposes them on `ParsedCv.projects`; standard CVs return an empty
array on that field.

The freelance CV is rendered with the `freelance` Typst template
(`cv-pdf/templates/freelance.typ`), which inserts the Selected Projects
section between Education and the footer.

### 1.6 Sidecars (`*.meta.yaml`)

Sidecars are optional YAML files that sit next to the markdown they
augment. They carry data that doesn't belong in prose.

**Per-CV sidecar — `content/cv/**/<name>.meta.yaml`:\*\*

```yaml
keywords:
  - technical lead
  - lead software engineer
contacts:
  linkedin:
    label: LinkedIn
    ariaLabel: Visit LinkedIn profile
  email:
    ariaLabel: Send email
```

All fields are optional. When absent the parser emits `keywords: []` and
no contact overrides; site components and Typst templates each carry
their own fallback labels for the common hosts.

**cv-special sidecar — `content/special/{lang}-special.meta.yaml`:**

```yaml
city: "Cernusco sul Naviglio, 20063,"
headerExtra: |-
  Appartenente alle categorie protette in base alla legge 68 del 1999, con un
  grado di invalidità del 60%.
languages:
  - label: "Italiano"
    level: "Madrelingua"
  - label: "Inglese"
    level: "Professionale (livello avanzato, utilizzo quotidiano in ambito tecnico)"
otherSkills: "Patente di guida di tipo B"
photo: "164001.jpg"
```

All fields are required for cv-special — the `special` Typst template
treats this sidecar as the source of truth for everything that isn't
part of the base CV markdown. The `photo` value is resolved relative to
the sidecar's directory. Missing or malformed fields fail fast with a
descriptive error.

**cv-special is Italian-only.** There is no current need for an English
variant, so only `it-special.meta.yaml` exists. Calling
`cv:pdf -- --template special --input content/cv/main/en-cv.md` will
fail with an ENOENT on `en-special.meta.yaml` — that is the intended
behavior, not a bug. If an English variant becomes necessary later,
authoring `en-special.meta.yaml` next to its Italian sibling is the
only change required; the rest of the pipeline is locale-agnostic.

---

## 2. Pipeline: from `content/*` to PDFs and locale modules

```
content/cv/**/*.md            ──┐
content/cv/**/*.meta.yaml      ─┤
content/projects/*.md          ─┤   cv-parser/      → typed ParsedCv
content/freelance/*.md         ─┤   (TypeScript)
content/special/*.meta.yaml    ─┘
                                              │
                                              ├──→ cv-pdf/  (Typst)  → PDFs
                                              │      ├─ public/cv/ (4)
                                              │      └─ printed/pdf/ (private)
                                              │
                                              ├──→ cv-ats/  (docx)   → ATS DOCX
                                              │      └─ printed/ats/  (private)
                                              │
                                              └──→ scripts/sync-locales-from-parser.ts
                                                     └─ src/lib/locales/**/cv.ts
```

### 2.1 Commands

| Command                          | What it does                                                                                                                                         |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run cv:sync-locales`        | Regenerates every `src/lib/locales/**/cv.ts` from the markdown sources. Run after editing any CV markdown.                                           |
| `npm run cv:pdf:public`          | Builds the 4 public PDFs (en/it main CV, en/it projects) into `public/cv/`. The pre-push hook calls this automatically.                              |
| `npm run cv:pdf -- --input <md>` | Builds one PDF (default printed: `printed/pdf/`). Template is auto-selected by filename or set with `--template main\|projects\|freelance\|special`. |
| `npm run cv:pdf:all`             | Builds every parser-known PDF into `printed/pdf/`. cv-special is excluded (private; explicit `--template special` only).                             |
| `npm run cv:ats -- --input <md>` | Builds one ATS-friendly DOCX. Template auto-selected by filename (`main`, `freelance`, `projects`).                                                  |
| `npm run cv:ats:all`             | Builds every parser-known DOCX into `printed/ats/`. cv-special is excluded (print-only variant).                                                     |

### 2.2 Authoring flow

1. Edit a file under `content/` (markdown or sidecar).
2. Run `npm run cv:pdf:public` (or invoke `cv:pdf` directly for a single
   file) and inspect the resulting PDF.
3. Run `npm run cv:sync-locales` if the site needs to reflect the change.
4. Commit markdown + regenerated locale + regenerated PDF together.

The pre-push hook regenerates `public/cv/` on push to `develop`/`main`
so you can't ship a stale PDF, but locale regeneration is on you — the
hook won't touch `src/lib/locales/`.

### 2.3 Locale modules are generated artifacts

`src/lib/locales/{en,it}/cv.ts` and `src/lib/locales/derived/cv/*.ts` are written
by `scripts/sync-locales-from-parser.ts`. Do not hand-edit them. Do not
ask an agent to hand-edit them. If something is wrong in the locale,
either:

- the parser has a bug (fix it in `cv-parser/src/`), or
- the markdown doesn't match the structural rules in §1.3 (fix the
  markdown).

`src/lib/locales/{en,it}/base.ts` is _not_ generated — it carries UI strings
that have no markdown source. Edit it directly when a UI label needs to
change.

### 2.4 Global constraints

- The shape of `src/lib/locales/**/cv.ts` is owned by `cv-parser/src/types.ts`
  and the serializer in `scripts/sync-locales-from-parser.ts`. Do not
  add or rename fields in the locale modules — change the parser
  instead.
- `CvData.taglineShort` is always present; when the markdown has no
  short tagline the parser emits `""`.
- `CvData.contacts` is `Record<string, LinkItem>`.
- `CvData.footer` is required.
- Cross-language consistency (same number of experiences / education
  entries across `en`/`it` for the same CV type) is the author's
  responsibility — the parser is per-file and language-agnostic.
