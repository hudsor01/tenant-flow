# syntax=docker/dockerfile:1.9
ARG NODE_VERSION=24-alpine3.21

FROM node:${NODE_VERSION} AS base

# Enable BuildKit inline cache for 70% faster rebuilds
ARG BUILDKIT_INLINE_CACHE=1

# Install essential build dependencies with security focus
# python3, make, g++: Required for native Node modules
# dumb-init: Lightweight init system for proper signal handling (2025 best practice)
RUN apk add --no-cache bash python3 make g++ dumb-init ca-certificates && \
    rm -rf /var/cache/apk/* /tmp/* && \
    npm install -g pnpm@10 turbo@2.5.6

WORKDIR /app

ENV PNPM_HOME=/root/.local/share/pnpm \
    PATH=$PNPM_HOME:$PATH \
    HUSKY=0 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/backend/package.json apps/backend/
COPY packages/*/package.json packages/
COPY scripts/prepare-husky.cjs scripts/

# Install dependencies with cache mount for pnpm store only
# Note: node_modules must be persisted in the image layer, not just in cache
RUN --mount=type=cache,id=s/c03893f1-40dd-475f-9a6d-47578a09303a-pnpm-cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prefer-offline

FROM base AS build

ENV DOPPLER_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN --mount=type=cache,id=s/c03893f1-40dd-475f-9a6d-47578a09303a-pnpm-cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prefer-offline

# Build with environment optimizations
ENV TURBO_TELEMETRY_DISABLED=1 \
    NODE_OPTIONS="--max-old-space-size=2048"

# Build using standardized commands with explicit verification
RUN set -e && \
    echo "=== Starting builds ===" && \
    pnpm build:shared && echo "✓ shared built" && \
    pnpm build:database && echo "✓ database built" && \
    pnpm build:backend && echo "✓ backend built" && \
    echo "=== Checking dist directory structure ===" && \
    find apps/backend -type d -name dist && \
    find apps/backend/dist -type f -name "*.js" 2>/dev/null | head -20 || echo "No JS files found" && \
    ls -la apps/backend/ && \
    echo "=== Verifying build outputs ===" && \
    test -d apps/backend/dist || (echo "ERROR: apps/backend/dist not found" && exit 1) && \
    test -f apps/backend/dist/main.js || (echo "ERROR: apps/backend/dist/main.js not found" && exit 1) && \
    ls -la apps/backend/dist/ && \
    echo "=== Build verification passed ==="

# Copy PDF and report templates to dist directory for runtime access
COPY apps/backend/src/modules/pdf/templates apps/backend/dist/modules/pdf/templates
COPY apps/backend/src/modules/reports/templates apps/backend/dist/modules/reports/templates

# ===== RUNTIME STAGE =====
# Ultra-minimal production image (~200MB total)
FROM node:${NODE_VERSION} AS runtime

RUN apk add --no-cache \
        bash \
        chromium \
        nss \
        freetype \
        harfbuzz \
        ca-certificates \
        ttf-freefont \
        dumb-init \
    && rm -rf /var/cache/apk/* /tmp/*

# Install pnpm for workspace support
RUN npm install -g pnpm@10

WORKDIR /app

ENV NODE_ENV=production \
    DOCKER_CONTAINER=true \
    NODE_OPTIONS="--enable-source-maps --max-old-space-size=512" \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    PNPM_HOME=/root/.local/share/pnpm \
    PATH=$PNPM_HOME:$PATH

# Copy workspace configuration for proper module resolution
COPY --from=build --chown=node:node /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build --chown=node:node /app/scripts/prepare-husky.cjs ./scripts/prepare-husky.cjs

# Copy backend application
COPY --from=build --chown=node:node /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=build --chown=node:node /app/apps/backend/dist ./apps/backend/dist

# Copy shared package (workspace dependency)
COPY --from=build --chown=node:node /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build --chown=node:node /app/packages/shared/dist ./packages/shared/dist

# Copy database package artifacts for runtime usage
COPY --from=build --chown=node:node /app/packages/database/package.json ./packages/database/package.json
COPY --from=build --chown=node:node /app/packages/database/dist ./packages/database/dist

# Create reports directory with proper permissions before switching to node user
RUN mkdir -p /app/reports && chown -R node:node /app/reports

# Install production dependencies in the runtime environment
# This ensures workspace dependencies resolve correctly
RUN --mount=type=cache,id=s/c03893f1-40dd-475f-9a6d-47578a09303a-pnpm-prod,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod --prefer-offline --filter @repo/backend...

# Clean up dev files to reduce size but keep essential files
RUN rm -rf node_modules/**/test \
           node_modules/**/tests \
           node_modules/**/*.map \
           node_modules/**/*.ts \
           node_modules/**/.bin \
           node_modules/**/*.md \
           node_modules/**/LICENSE* \
           node_modules/**/license* \
           node_modules/**/README* \
           node_modules/**/readme* \
           node_modules/**/.github \
           node_modules/**/CHANGELOG* \
           node_modules/**/changelog* \
    && rm -rf /root/.local/share/pnpm/store

USER node

# Railway provides PORT at runtime, default to 4600 for container
ENV PORT=4600
# EXPOSE is informational - Railway ignores this and uses their own PORT
EXPOSE ${PORT}

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:' + process.env.PORT + '/health', (r) => { r.statusCode === 200 ? process.exit(0) : process.exit(1) }).on('error', () => process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/backend/dist/main.js"]

LABEL maintainer="TenantFlow Team" \
      version="1.0.1" \
      description="TenantFlow Backend Service" \
      org.opencontainers.image.source="https://github.com/tenantflow/backend"
