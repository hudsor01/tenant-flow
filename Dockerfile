# syntax=docker/dockerfile:1.9
# Optimized Dockerfile for TenantFlow Backend
# Changes from baseline:
# 1. Faster node_modules cleanup using find
# 2. Better comments and organization

ARG NODE_VERSION=24-alpine3.21

# ============================================
# BASE STAGE - Build tools
# ============================================
FROM node:${NODE_VERSION} AS base

ARG BUILDKIT_INLINE_CACHE=1

# Install build dependencies
RUN apk add --no-cache \
        bash \
        python3 \
        make \
        g++ \
        dumb-init \
        ca-certificates \
        curl && \
    npm install -g pnpm@10 turbo@2.5.6 && \
    rm -rf /var/cache/apk/* /tmp/*

WORKDIR /app

ENV PNPM_HOME=/root/.local/share/pnpm \
    PATH=/root/.local/share/pnpm:$PATH \
    HUSKY=0 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    TURBO_TELEMETRY_DISABLED=1

# ============================================
# DEPS STAGE - Install dependencies
# ============================================
FROM base AS deps

# Copy package files (packages/* uses wildcard to get all)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/backend/package.json apps/backend/
COPY packages/*/package.json packages/

# Install dependencies with cache mount
RUN --mount=type=cache,id=s/c03893f1-40dd-475f-9a6d-47578a09303a-pnpm-cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prefer-offline --reporter=silent

# ============================================
# BUILD STAGE - Compile TypeScript
# ============================================
FROM base AS build

ENV DOPPLER_DISABLED=1 \
    NODE_OPTIONS="--max-old-space-size=4096"

# Copy deps and full source
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Reinstall to link workspace packages (skip scripts - not needed for build)
RUN --mount=type=cache,id=s/c03893f1-40dd-475f-9a6d-47578a09303a-pnpm-cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prefer-offline --reporter=silent

# Build with turbo cache
RUN --mount=type=cache,id=s/c03893f1-40dd-475f-9a6d-47578a09303a-turbo-cache,target=/app/.turbo \
    set -e && \
    pnpm build:shared && \
    pnpm --filter @repo/backend build && \
    test -f apps/backend/dist/main.js || (echo "ERROR: main.js not found" && exit 1)

# Copy templates to dist
COPY apps/backend/src/modules/pdf/templates apps/backend/dist/modules/pdf/templates
COPY apps/backend/src/modules/reports/templates apps/backend/dist/modules/reports/templates

# ============================================
# RUNTIME STAGE - Production image
# ============================================
FROM node:${NODE_VERSION} AS runtime

# Install runtime dependencies including Chromium for PDF generation
RUN apk add --no-cache \
        bash \
        dumb-init \
        ca-certificates \
        chromium \
        nss \
        freetype \
        harfbuzz \
        ttf-freefont && \
    npm install -g pnpm@10 && \
    rm -rf /var/cache/apk/* /tmp/*

WORKDIR /app

# Note: PNPM_HOME is set temporarily for install, then unset for runtime
# since container runs as 'node' user who can't write to /root
ENV NODE_ENV=production \
    DOCKER_CONTAINER=true \
    NODE_OPTIONS="--enable-source-maps --max-old-space-size=1024" \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    PORT=4600

# Copy workspace config
COPY --from=build --chown=node:node /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build --chown=node:node /app/scripts/prepare-husky.cjs ./scripts/

# Copy built artifacts
COPY --from=build --chown=node:node /app/apps/backend/package.json ./apps/backend/
COPY --from=build --chown=node:node /app/apps/backend/dist ./apps/backend/dist
COPY --from=build --chown=node:node /app/packages/shared/package.json ./packages/shared/
COPY --from=build --chown=node:node /app/packages/shared/dist ./packages/shared/dist

# Create reports and logs directories with proper permissions
RUN mkdir -p /app/reports /app/logs/backend && \
    chown -R node:node /app/reports /app/logs

# Install production dependencies (set PNPM_HOME temporarily for this command only)
RUN --mount=type=cache,id=s/c03893f1-40dd-475f-9a6d-47578a09303a-pnpm-prod,target=/root/.local/share/pnpm/store \
    PNPM_HOME=/root/.local/share/pnpm pnpm install --frozen-lockfile --prod --prefer-offline --filter @repo/backend...

# Fast cleanup using find (faster than glob patterns)
RUN find node_modules -type d \( -name test -o -name tests -o -name .github -o -name docs \) -prune -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type f \( -name "*.map" -o -name "*.ts" -o -name "*.md" -o -name "LICENSE*" -o -name "CHANGELOG*" \) -delete 2>/dev/null || true && \
    rm -rf /root/.local/share/pnpm/store

USER node

EXPOSE ${PORT}

HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:'+process.env.PORT+'/health/ping',(r)=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/backend/dist/main.js"]

LABEL maintainer="TenantFlow" \
      version="1.0.2" \
      description="TenantFlow Backend Service"
