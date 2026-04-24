# ═══════════════════════════════════════════════════════════════════════════
# Multi-stage build for production-grade NestJS Payment Microservice
# Stage 1: deps    — install ALL dependencies (including dev for build)
# Stage 2: builder — compile TypeScript
# Stage 3: runner  — minimal runtime image (non-root, no dev deps)
# ═══════════════════════════════════════════════════════════════════════════

# ── Stage 1: Install dependencies ──────────────────────────────────────────
FROM node:20-alpine AS deps

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy package manifests first for layer caching
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (dev included — needed for build)
RUN npm ci --frozen-lockfile

# Generate Prisma client
RUN npx prisma generate


# ── Stage 2: Build ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

COPY . .

# Type-check and compile
RUN npm run build


# ── Stage 3: Production runner ─────────────────────────────────────────────
FROM node:20-alpine AS runner

# Install dumb-init (PID 1 proxy — enables SIGTERM propagation)
RUN apk add --no-cache dumb-init

# Security: run as non-root user
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nestjs

WORKDIR /app

# Copy only production artefacts
COPY --from=deps    /app/node_modules ./node_modules
COPY --from=builder /app/dist         ./dist
COPY --from=builder /app/prisma       ./prisma
COPY package.json ./

# Chown everything to non-root user
RUN chown -R nestjs:nodejs /app

USER nestjs

# Expose application port (kept non-privileged)
EXPOSE 3000

# Health check — relies on /health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

# dumb-init as PID 1 so SIGTERM reaches Node properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/main"]
