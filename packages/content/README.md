# @one-resume/content

Builds the site **`content.json`** from CV (+ optional standalone projects)
markdown, and defines the `ContentSource` port the delivery apps implement.

```ts
import { loadContent, buildContent, type ContentSource } from "@one-resume/content";

// from strings:
buildContent({ cvMarkdown, projectsMarkdown });   // → ParsedCv

// from a source (read-then-build) — shared by the CLI and the API:
await loadContent(source, { cv: "cv/main/en-cv.md", projects: "projects/en-projects.md" });
```

`ContentOutput` is the parsed CV itself (`= ParsedCv`), so `content.json` carries
the captured `labels` the site needs. When standalone projects markdown is given,
its entries — and its captured section label — replace the CV's embedded ones.

- `ContentSource { read(path): Promise<string> }` — the read port. The CLI's
  `FsContentSource` and the API's `GitHubRepository` are the two adapters.
- `checkContent(a, b)` — structural staleness check (per top-level key), used by
  the CLI `check` command.
