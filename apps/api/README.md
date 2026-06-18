# one-resume-api (placeholder)

Not yet implemented. This package is a scaffold for the future HTTP API that
renders CV PDFs / DOCX on demand from the `@one-resume/*` libraries.

## Planned shape

- Reuse the same libraries as `apps/cli`: `@one-resume/parser`,
  `@one-resume/pdf` (the `TypstPdf` class), `@one-resume/docx`,
  `@one-resume/content`, `@one-resume/localization`.
- Construct **one** `TypstPdf` at container start — its constructor runs the
  typst preflight, so a missing/broken binary fails fast at boot rather than
  per request.
- DOCX renders return `Uint8Array` and stream straight to the HTTP response.
  PDF renders write a per-request temp file (typst → file) and stream it back.

## Deployment (planned)

Docker service on Render.com with a **pinned** typst (0.14.2) baked into the
image — copied from `ghcr.io/typst/typst` or the static release — so the
container renders byte-identically to the local CLI. `TYPST_BIN` points at the
baked-in binary.

See the repo `REFACTOR.md` (step 6) for the full deployment plan.
