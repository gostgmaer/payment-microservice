# ═══════════════════════════════════════════════════════════════════════════
# Multi-stage build — NestJS Payment Microservice
# Package manager: pnpm (via corepack, built into Node.js 16.10+)
# ═══════════════════════════════════════════════════════════════════════════

# ── Stage 1: Install + Build ────────────────────────────────────────────────
FROM node:20-alpine AS builder

# openssl — Prisma engine target: linux-musl-openssl-3.0.x (Alpine)
# dumb-init — PID-1 signal handling in runner
RUN for i in 1 2 3; do \
    apk add --no-cache dumb-init openssl && break || \
    (echo "apk attempt $i failed, retrying..." && sleep 5); \
  done

# Enable corepack (ships with Node 16.10+) and activate pnpm@9.
# corepack enable creates shims; corepack prepare downloads + pins the version.
RUN corepack enable && \
    for i in 1 2 3; do \
      corepack prepare pnpm@9 --activate && break || \
      (echo "corepack prepare attempt $i failed, retrying..." && sleep 3); \
    done && pnpm --version

WORKDIR /app

# Disable hardware AES-NI — fixes ERR_SSL_CIPHER_OPERATION_FAILED inside
# Docker Desktop / WSL2 virtualized environments.
ENV OPENSSL_ia32cap="~0x200000200000000"
ENV CHECKPOINT_DISABLE=1

# Copy manifests first for layer-cache efficiency.
# Run `pnpm install` locally once to generate pnpm-lock.yaml and commit it.
COPY package.json ./
COPY prisma ./prisma/

# Install all deps (dev + prod). pnpm postinstall scripts download the
# @prisma/engines query engine binary for linux-musl-openssl-3.0.x (Alpine).
# Retry loop handles Docker Desktop TLS cipher failures on large downloads.
RUN for i in 1 2 3 4 5; do \
    pnpm install --no-frozen-lockfile && break || \
    (echo "pnpm install attempt $i failed, retrying in 10s..." && sleep 10); \
  done

# Generate Prisma TypeScript client against the downloaded engine binary.
RUN for i in 1 2 3; do \
    ./node_modules/.bin/prisma generate && break || \
    (echo "prisma generate attempt $i failed, retrying in 5s..." && sleep 5); \
  done

# Copy source and compile.
COPY . .
RUN pnpm run build

# Compile prisma/seed.ts to standalone JS so production images can run default seed
# without ts-node/devDependencies.
RUN node node_modules/typescript/bin/tsc \
  --outDir dist/seed \
  --module commonjs --target es2019 \
  --esModuleInterop true --skipLibCheck true \
  --strict false --noEmitOnError false \
  --rootDir . \
  prisma/seed.ts

# Strip dev deps — removes typescript, @nestjs/cli, jest, eslint, @types/*, etc.
# prisma CLI remains because it is listed in dependencies (needed for migrate deploy).
RUN pnpm prune --prod


# ── Stage 3: Production runner ─────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN for i in 1 2 3; do \
    apk add --no-cache dumb-init openssl && break || \
    (echo "apk attempt $i failed, retrying..." && sleep 5); \
  done

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nestjs

WORKDIR /app

# Runtime does not need package managers; remove them to reduce attack surface
# and avoid npm-bundled library CVEs in final image scans.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack && \
    rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

# Use --chown on COPY to avoid a slow `chown -R` on node_modules
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist         ./dist
COPY --from=builder --chown=nestjs:nodejs /app/prisma       ./prisma
COPY --chown=nestjs:nodejs package.json ./

USER nestjs

ENV CHECKPOINT_DISABLE=1

EXPOSE 3302

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider "http://localhost:${PORT:-3302}/api/v1/health" || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/main"]
