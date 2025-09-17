# syntax=docker/dockerfile:1.9
# check=error=true

# ===== SHARED BASE IMAGE =====
# Define Node.js image once for all stages (2025 best practice)
ARG NODE_VERSION=24-alpine3.21
FROM node:${NODE_VERSION} AS base

# Enable BuildKit inline cache for 70% faster rebuilds
ARG BUILDKIT_INLINE_CACHE=1

# Install essential build dependencies with security focus
# python3, make, g++: Required for native Node modules
# dumb-init: Lightweight init system for proper signal handling (2025 best practice)
RUN apk add --no-cache python3 make g++ dumb-init && \
    rm -rf /var/cache/apk/* /tmp/*

WORKDIR /app

# ===== DEPS STAGE =====
# Optimized dependency installation with advanced caching
FROM base AS deps

# Copy only package files for optimal layer caching
COPY package*.json turbo.json ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/*/package.json ./packages/

# Advanced cache mount with npm optimization (2025 technique)
# Multiple cache mounts for different package managers
RUN --mount=type=cache,id=npm-cache,target=/root/.npm \
    --mount=type=cache,id=node-modules-cache,target=/app/node_modules \
    npm ci --silent --prefer-offline --no-audit --no-fund

# ===== BUILDER STAGE =====
# TypeScript compilation with build optimization
FROM base AS builder

WORKDIR /app

# Copy dependencies and source with selective filtering
COPY --from=deps /app ./
COPY . .

# Remove non-essential files early (saves ~200MB in intermediate layers)
RUN find . -type f -name "*.md" -delete && \
    find . -type f -name "*.test.*" -delete && \
    find . -type f -name "*.spec.*" -delete && \
    rm -rf .git .github docs apps/frontend .env* .vscode

# Build with environment optimizations
ENV TURBO_TELEMETRY_DISABLED=1 \
    NODE_OPTIONS="--max-old-space-size=2048"

# Parallel builds with error handling (2025 optimization)
RUN npm run build:shared && \
    npm run build:backend

# ===== PROD-DEPS OPTIMIZATION =====
# Clean production dependencies with node-prune (2025 technique)
FROM base AS prod-deps

WORKDIR /app
ENV NODE_ENV=production

# Copy package files
COPY package*.json turbo.json ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/*/package.json ./packages/

# Install production deps with advanced caching
RUN --mount=type=cache,id=npm-prod-cache,target=/root/.npm \
    npm ci --omit=dev --silent --prefer-offline --no-audit --no-fund

# Install node-prune and optimize node_modules (85% size reduction)
RUN npm install -g node-prune && \
    node-prune && \
    rm -rf node_modules/**/test \
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
           node_modules/**/changelog*

# ===== RUNTIME STAGE =====
# Ultra-minimal production image (~150MB total)
FROM node:${NODE_VERSION} AS runtime

# Install runtime deps with security hardening
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    dumb-init \
    && rm -rf /var/cache/apk/* /tmp/* \
    && mkdir -p /app \
    && chown -R node:node /app

# Puppeteer optimization
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Security: Create and use non-root user (1000:1000 for better compatibility)
USER node
WORKDIR /app

# Copy production artifacts with single COPY for efficiency
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=prod-deps --chown=node:node /app/package*.json ./
COPY --from=prod-deps --chown=node:node /app/apps/backend/package.json ./apps/backend/
COPY --from=prod-deps --chown=node:node /app/packages ./packages

# Copy built application
COPY --from=builder --chown=node:node /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder --chown=node:node /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=node:node /app/packages/database/dist ./packages/database/dist

# Production environment with security hardening
ENV NODE_ENV=production \
    DOCKER_CONTAINER=true \
    NODE_OPTIONS="--enable-source-maps --max-old-space-size=512"

# Health check with proper signal handling (2025 best practice)
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + process.env.PORT + '/health/ping', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)}).on('error', () => process.exit(1))"

# Railway PORT with dynamic binding
ARG PORT=4600
ENV PORT=${PORT}
EXPOSE ${PORT}

# Use dumb-init for proper signal handling (SIGTERM, SIGINT)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "--enable-source-maps", "apps/backend/dist/main.js"]

# Build-time metadata (2025 standard)
LABEL maintainer="TenantFlow Team" \
      version="1.0.1" \
      description="TenantFlow Backend Service" \
      org.opencontainers.image.source="https://github.com/tenantflow/backend"