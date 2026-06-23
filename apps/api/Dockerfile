# syntax=docker/dockerfile:1
#
# Build from the REPO ROOT (the API imports @one-resume/* via npm workspaces):
#   docker build -f apps/api/Dockerfile -t one-resume-api .
#
# Runtime env (injected by the platform, e.g. Render — NOT baked in):
#   GITHUB_PAT, GITHUB_OWNER, GITHUB_ROOT, [GITHUB_REF], API_KEY, [PORT]

# ── typst: pinned static binary ───────────────────────────────────────────────
# Pinned to 0.14.2 to match the local toolchain, so the /v1/pdf endpoint's output
# in the container is byte-identical to the CLI.
FROM debian:bookworm-slim AS typst
ARG TYPST_VERSION=0.14.2
ARG TYPST_TARGET=x86_64-unknown-linux-musl
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates xz-utils \
 && rm -rf /var/lib/apt/lists/*
ADD https://github.com/typst/typst/releases/download/v${TYPST_VERSION}/typst-${TYPST_TARGET}.tar.xz /tmp/typst.tar.xz
RUN tar -xJf /tmp/typst.tar.xz -C /tmp \
 && install -m 0755 "/tmp/typst-${TYPST_TARGET}/typst" /usr/local/bin/typst \
 && /usr/local/bin/typst --version

# ── runtime ───────────────────────────────────────────────────────────────────
FROM node:22-slim AS runtime
WORKDIR /app

# Pinned typst, baked in. The app builds a PdfRenderer({ bin: TYPST_BIN }) once at
# boot; if typst were unreachable it logs and leaves the renderer null (the app
# still starts; /v1/pdf → 503).
COPY --from=typst /usr/local/bin/typst /usr/local/bin/typst
ENV TYPST_BIN=/usr/local/bin/typst

# The API runs TS-as-source via tsx and resolves @one-resume/* through npm
# workspaces, so the whole monorepo is installed. tsx is a devDependency, hence
# --include=dev (NODE_ENV=production would otherwise omit it).
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps
RUN npm ci --include=dev

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["npx", "tsx", "apps/api/src/app.ts"]
