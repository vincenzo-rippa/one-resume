# one-resume-api

HTTP API (Koa) that serves parsed CV **content** and renders it to **PDF & DOCX**,
sourcing markdown from a GitHub repo via `octokit`. Built on the `@one-resume/*`
libraries.

## Endpoints

| Method | Path                                    | Description                                                                                              |
| ------ | --------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `GET`  | `/health`                               | Liveness probe (`{ uptime, message, timestamp }`).                                                       |
| `GET`  | `/v1/content?cv=<path>&projects=<path>` | Parsed content JSON for the given markdown path(s). `cv` is required; both must be relative `.md` paths. |
| `POST` | `/v1/pdf`                               | Render one document to PDF and stream it (`application/pdf`, attachment). Body: `{ "type": "cv" \| "projects", "input": "<relative .md path>" }`. Needs typst — returns `503` if it is unreachable. |
| `POST` | `/v1/docx`                              | Render one document to an ATS `.docx` and stream it (attachment). Same body as `/v1/pdf`. In-process (no typst). |

All routes except `/health` require an `X-API-KEY` header matching `API_KEY`.

## Configuration (environment)

Injected by the platform (or `apps/api/.env` locally, loaded by the `api`
script). See `.env` / set these in your host:

| Var            | Required | Purpose                                                  |
| -------------- | -------- | -------------------------------------------------------- |
| `GITHUB_PAT`   | yes      | GitHub token used by `octokit` to read the content repo. |
| `GITHUB_OWNER` | yes      | Repo owner.                                              |
| `GITHUB_ROOT`  | yes      | Repo name.                                               |
| `GITHUB_REF`   | no       | Branch/tag/sha (default branch if unset).                |
| `API_KEY`      | yes      | Shared secret for `X-API-KEY` (must be > 16 chars).      |
| `PORT`         | no       | Listen port (default `3000`).                            |

## Run locally

```bash
npm run api        # tsx --env-file=apps/api/.env apps/api/src/app.ts
npm run api:dev    # same, with watch
```

## Deployment (Docker / Render)

`apps/api/Dockerfile` is a multi-stage build (build from the **repo root** so the
`@one-resume/*` workspaces resolve):

```bash
docker build -f apps/api/Dockerfile -t one-resume-api .
docker run -p 3000:3000 --env-file apps/api/.env one-resume-api
```

It bakes in a **pinned typst 0.14.2** static binary (`TYPST_BIN=/usr/local/bin/typst`),
matching the local toolchain so `/v1/pdf` output is content-identical to the CLI
(typst embeds a build timestamp, so it is not byte-for-byte identical). The
`PdfRenderer` is built once at startup; if typst is unreachable the app still boots
(logging the failure) and `/v1/pdf` returns `503`, while `/health` and
`/v1/content` keep working.

## Operational notes

Deliberate choices for a service consumed by a single authenticated static-site
build:

- **Bounded work.** Every request has a 30s deadline (`TimeoutMiddleware` →
  `504`); a typst compile is killed after 25s and a GitHub read aborts after 10s
  (both surface as errors, not hangs); the JSON body is capped at 16kb. No single
  request can hang or balloon.
- **No response caching.** `HeadersMiddleware` sets `Cache-Control: no-store`
  (and `X-Content-Type-Options: nosniff`) on every response: the content reflects
  a mutable source and the build wants fresh data, and without an explicit header
  a 200 GET would be _heuristically_ cacheable.
- **No render concurrency cap.** Nothing limits how many typst processes run at
  once; the `X-API-KEY` gate is the safeguard (auth runs before the controller, so
  no valid key → no typst spawned beyond the boot preflight), and the per-request
  timeout bounds any single one.
