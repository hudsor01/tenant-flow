# syntax=docker/dockerfile:1.6
# check=error=true

# ===== BASE BUILDER STAGE =====
FROM node:24-alpine AS base

# Install build dependencies for Alpine
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    gcc \
    libc-dev

WORKDIR /app

# ===== PRUNER STAGE =====
FROM base AS pruner

# Copy entire monorepo
COPY . .

# Install turbo locally and disable telemetry
ENV TURBO_TELEMETRY_DISABLED=1
ENV NPM_CONFIG_UPDATE_NOTIFIER=false

RUN npm install turbo@2.5.6 --no-save && \
    npx turbo prune @repo/backend --docker

# ===== DEPS STAGE =====
FROM base AS deps

ENV NPM_CONFIG_UPDATE_NOTIFIER=false

# Copy pruned workspace structure
COPY --from=pruner /app/out/json/ .

# Install all dependencies for building
RUN npm install --loglevel=error

# ===== BUILDER STAGE =====
FROM base AS builder

WORKDIR /app

# Copy the entire deps stage output
COPY --from=deps /app ./

# Copy source from pruned output
COPY --from=pruner /app/out/full/ .

# Memory optimization for Railway deployment
ENV NODE_OPTIONS="--max-old-space-size=1024"
ENV TURBO_TELEMETRY_DISABLED=1
ENV NPM_CONFIG_UPDATE_NOTIFIER=false

# Turbo remote caching
ARG TURBO_TOKEN
ARG TURBO_TEAM
ENV TURBO_TOKEN=${TURBO_TOKEN}
ENV TURBO_TEAM=${TURBO_TEAM}

# Build with Turbo
RUN npx turbo build --filter=@repo/backend --no-daemon

# Verify build outputs
RUN test -f apps/backend/dist/main.js || (echo "Backend build failed" && exit 1) && \
    test -d packages/shared/dist || (echo "Shared build failed" && exit 1) && \
    test -d packages/database/dist || (echo "Database build failed" && exit 1)

# ===== PRODUCTION DEPS STAGE =====
# Use same base for production deps
FROM base AS prod-deps

WORKDIR /app

ENV NODE_ENV=production
ENV NPM_CONFIG_UPDATE_NOTIFIER=false

# Copy package files from pruner
COPY --from=pruner /app/out/json/ .

# Install only production dependencies
RUN npm install --omit=dev --loglevel=error && \
    npm cache clean --force

# ===== DISTROLESS RUNNER STAGE =====
# Use Google Distroless Node.js 24 for runtime - maximum security
FROM gcr.io/distroless/nodejs24-debian12:nonroot AS runner

WORKDIR /app

# Copy production dependencies
COPY --from=prod-deps --chown=nonroot:nonroot /app/node_modules ./node_modules

# Copy package.json files for module resolution
COPY --from=prod-deps --chown=nonroot:nonroot /app/package.json ./package.json
COPY --from=prod-deps --chown=nonroot:nonroot /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=prod-deps --chown=nonroot:nonroot /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=prod-deps --chown=nonroot:nonroot /app/packages/database/package.json ./packages/database/package.json

# Copy built application
COPY --from=builder --chown=nonroot:nonroot /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder --chown=nonroot:nonroot /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=nonroot:nonroot /app/packages/database/dist ./packages/database/dist

# Runtime environment
ENV NODE_ENV=production
ENV DOCKER_CONTAINER=true
ENV NODE_OPTIONS="--enable-source-maps --max-old-space-size=512"
ENV UV_THREADPOOL_SIZE=4

# Use Railway's injected PORT or fallback to 4600
ARG PORT=4600
ENV PORT=${PORT}

# Expose the dynamic port
EXPOSE ${PORT}

# Health check for Railway deployment - fast and simple
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=2 \
  CMD /nodejs/bin/node -e " \
    const http = require('http'); \
    const port = process.env.PORT || 3001; \
    const req = http.request({ \
      hostname: '127.0.0.1', \
      port: port, \
      path: '/health', \
      method: 'GET', \
      timeout: 3000 \
    }, (res) => { \
      process.exit(res.statusCode === 200 ? 0 : 1); \
    }); \
    req.on('error', () => process.exit(1)); \
    req.on('timeout', () => { req.destroy(); process.exit(1); }); \
    req.end(); \
  "

# For Distroless, the Node.js binary is at /nodejs/bin/node
# Railway's startCommand will override this if set
ENTRYPOINT ["/nodejs/bin/node"]
CMD ["apps/backend/dist/main.js"]