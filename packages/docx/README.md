# @one-resume/docx

Renders a parsed CV / projects document to **ATS-friendly `.docx` bytes**.

```ts
import { renderDocx } from "@one-resume/docx";

const [bytes] = await renderDocx([parsed]);   // Uint8Array; caller writes/streams
```

`renderDocx(docs)` returns one `Uint8Array` per document — no filesystem I/O, so
the caller writes the file or streams it from an HTTP response. A `ParsedCv`
becomes a CV document (with its embedded projects when present); a
`ParsedProjects` becomes a standalone projects document. Section titles and field
labels come from the parsed data.

The GDPR footer is intentionally **not** rendered — ATS documents go to
recruiters and parsers, where the privacy notice is noise. Built on the `docx`
npm package; style tokens live in `src/style.ts`.
