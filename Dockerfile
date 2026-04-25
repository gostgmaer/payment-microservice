# ═══════════════════════════════════════════════════════════════════════════
# Multi-stage build for production-grade NestJS Payment Microservice
# ═══════════════════════════════════════════════════════════════════════════

# ── Stage 1: Install dependencies ──────────────────────────────────────────
FROM node:20-alpine AS deps

RUN for i in 1 2 3; do \
    apk add --no-cache dumb-init && break || \
    (echo "apk attempt $i failed, retrying..." && sleep 5); \
  done

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# npm install (not ci) to tolerate lockfile version differences
# Retry loop handles Docker Desktop TLS cipher failures on large downloads
RUN for i in 1 2 3 4 5; do \
    npm install && break || \
    (echo "npm install attempt $i failed, retrying in 10s..." && sleep 10); \
  done

# Generate Prisma client
RUN ./node_modules/.bin/prisma generate


# ── Stage 2: Build ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

COPY . .

RUN npm run build


# ── Stage 3: Production runner ─────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN for i in 1 2 3; do \
    apk add --no-cache dumb-init openssl && break || \
    (echo "apk attempt $i failed, retrying..." && sleep 5); \
  done

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nestjs

WORKDIR /app

# Use --chown on COPY to avoid a slow `chown -R` on node_modules
COPY --from=deps    --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist         ./dist
COPY --from=builder --chown=nestjs:nodejs /app/prisma       ./prisma
COPY --chown=nestjs:nodejs package.json ./

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/main"]
