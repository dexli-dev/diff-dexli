# Multi-stage build: tiny final image, full devDeps only during build.
#
# diff.dexli.dev (D4 venture-4 cycle 1) — consumes the @dexli/family
# library at vendored/dexli-family via git submodule. Per CEO Q1 outcome
# (2026-05-29), item 7's "production parser path, not a stub" requires
# code-path-audit verifiable shared dependency — submodule consumer is
# the validated structural shape.

# ---- Stage 0: fetch dexli-family library at pinned SHA -------------------
# We can't `git submodule update --init` inside the main build stage
# because `.dockerignore` excludes `.git/` (intentional — keeps the
# runtime image slim) and node:22-alpine doesn't ship `git`. A tiny
# alpine stage with `git` does the clone + checkout, and the build
# stage COPYs the result in.
#
# Why git-clone instead of curl tarball: per tinywebhook cycle-3
# observation, GitHub's archive tarball endpoint returns 404 in some
# cases despite anonymous git-clone working fine. git-clone is the
# working path for fetching the snapshot in a Dockerfile without
# `.git/` in the parent context.
#
# The SHA is duplicated between this Dockerfile and .gitmodules /
# git submodule pin. **CTO discipline: when bumping the submodule pin,
# bump DEXLI_FAMILY_SHA in lockstep.** Drift causes a build failure
# (SHA doesn't exist) or behavioral divergence between local-tested
# code and deployed code. Catch at code review.
FROM alpine:3.20 AS submodules
ARG DEXLI_FAMILY_SHA=5ababddec33531cd02361f7abb48b864ce185769
RUN apk add --no-cache git
RUN git clone https://github.com/dexli-dev/dexli-family.git /vendored-dexli-family \
    && cd /vendored-dexli-family \
    && git checkout ${DEXLI_FAMILY_SHA} \
    && rm -rf .git

# ---- Stage 1: build the app -----------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Install all deps. `--ignore-scripts` skips any postinstall hooks that
# rely on `git submodule update` (which requires git + .git/, neither
# present in this build context). The submodule content arrives from
# stage 0 instead (next COPY block).
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --ignore-scripts

# Copy the rest of the repo (everything except .dockerignore exclusions).
COPY . .
COPY --from=submodules /vendored-dexli-family ./vendored/dexli-family

# Produce the adapter-node build output at /app/build.
RUN npm run build

# Drop dev dependencies so we copy only runtime deps into the final stage.
RUN npm prune --omit=dev

# ---- Stage 2: runtime -----------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app

LABEL org.opencontainers.image.title="diff" \
      org.opencontainers.image.description="diff.dexli.dev — paste two pieces of text, see what changed, share the comparison via URL. Part of the dexli.dev tiny-tools family." \
      org.opencontainers.image.source="https://github.com/dexli-dev/diff-dexli" \
      org.opencontainers.image.licenses="UNLICENSED"

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

EXPOSE 3000

USER node

CMD ["node", "build"]
