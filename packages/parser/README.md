# @one-resume/parser

Markdown → typed data: the **input adapter** of the pipeline. One command,
strongly typed:

```ts
import { parse } from "@one-resume/parser";

parse(markdown, "cv");        // → ParsedCv
parse(markdown, "projects");  // → ParsedProjects
```

Unsupported `type`s are a compile error (overloads), not a runtime branch.

## Positional & language-agnostic

The parser reads structure by position and token depth — there are **no anchors
and no keyword dictionaries**. Section titles and project-field labels are
*captured* from the markdown, so the same code parses `en` / `it` / `es` / `fr`
CVs unchanged (the tests prove `es`/`fr`). Validation is structural (heading
depth, section order/count); `ParseError` carries a line number.

The only runtime dependency is `marked` (the tokenizer). The markdown rules live
in [`docs/CONTENT_CONTRACT.md`](docs/CONTENT_CONTRACT.md).

## Internals

`TokenStream` (a cursor over the marked tokens) owns token-shape recognition and
`error()`; the readers under `src/readers/` consume it (`readHeader`,
`readSummary`, `readExperiences`, `readEducation`, `readProjects`, `readFooter`,
`readMetadata`), and `src/parse.ts` assembles them.

`npm test` runs the positional/contract tests plus the `es`/`fr` proof.
