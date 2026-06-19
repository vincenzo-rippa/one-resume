# @one-resume/pdf

Renders a parsed CV / projects document to a **Typst PDF**.

```ts
import { TypstPdf } from "@one-resume/pdf";

const typst = new TypstPdf();                 // constructor = typst preflight
typst.renderPdf([{ parsed, out: "cv.pdf" }]);
```

`renderPdf(jobs)` writes one PDF per `{ parsed, out }`. The parsed *shape* selects
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
