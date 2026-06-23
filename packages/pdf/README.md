# @one-resume/pdf

Renders a parsed CV / projects document to a **Typst PDF**.

```ts
import { PdfRenderer } from "@one-resume/pdf";

const typst = new PdfRenderer(); // constructor = typst preflight
await typst.renderPdf([{ parsed, out: "cv.pdf" }]);
```

`renderPdf(jobs)` returns a `Promise<void>` and writes one PDF per
`{ parsed, out }`. Typst runs via async `spawn`, so awaiting it never blocks the
event loop — a server can render concurrently. The parsed _shape_ selects
the template: a `ParsedCv` renders the adaptive `cv` template (its Selected
Projects section appears only when `parsed.projects` is non-empty), a
`ParsedProjects` renders `projects`. Section titles and field labels come from
`parsed.labels` — nothing is passed in, and there is no separate "freelance"
variant.

## Reproducible output

The renderer shells out to the Typst CLI (resolved via `TYPST_BIN`, default
`typst`) with `--font-path` pointing at the repo-bundled **Inter** fonts and
`--ignore-system-fonts`, so a given input renders identically on any machine.
Templates live in `templates/` (`cv.typ`, `projects.typ`, shared `lib/`).
Requires the [Typst CLI](https://typst.app/docs/install).
