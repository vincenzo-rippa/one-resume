# one-resume-api

HTTP API (Koa) that serves parsed CV **content** and per-locale **labels**,
sourcing markdown from a GitHub repo via `octokit`. Built on the `@one-resume/*`
libraries.

## Endpoints

| Method | Path                      | Description                                              |
| ------ | ------------------------- | ------------------------------------------------------- |
| `ALL`  | `/health`                 | Liveness probe (`{ uptime, message, timestamp }`).      |
| `GET`  | `/v1/content?cv=<path>&projects=<path>` | Parsed content JSON for the given markdown path(s). `cv` is required; both must be relative `.md` paths. |
| `GET`  | `/v1/labels/pdf/:locale`  | PDF label set for `en` / `it`.                          |
| `GET`  | `/v1/labels/docx/:locale` | DOCX label set for `en` / `it`.                         |

All routes except `/health` require an `X-API-KEY` header matching `API_KEY`.

## Configuration (environment)

Injected by the platform (or `apps/api/.env` locally, loaded by the `api`
script). See `.env` / set these in your host:

| Var           | Required | Purpose                                             |
| ------------- | -------- | --------------------------------------------------- |
| `GITHUB_PAT`  | yes      | GitHub token used by `octokit` to read the content repo. |
| `GITHUB_OWNER`| yes      | Repo owner.                                         |
| `GITHUB_ROOT` | yes      | Repo name.                                          |
| `GITHUB_REF`  | no       | Branch/tag/sha (default branch if unset).           |
| `API_KEY`     | yes      | Shared secret for `X-API-KEY` (must be > 16 chars). |
| `PORT`        | no       | Listen port (default `3000`).                       |

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
matching the local toolchain so any future PDF rendering is byte-identical to the
CLI. The current API serves JSON only and constructs no `TypstPdf` — typst is
baked ahead of rendering endpoints being added (which would re-add the
`@one-resume/pdf` dependency).
