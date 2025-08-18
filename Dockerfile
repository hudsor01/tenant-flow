# syntax=docker/dockerfile:1.6

# --- Stage 1: Build Dependencies ---
FROM node:22-slim AS builder

# Install system dependencies with explicit versions and cleanup
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    g++ \
    git \
    make \
    python3 \
    tini && \
    rm -rf /var/lib/apt/lists/* && \
    npm config set registry https://registry.npmjs.org/

    WORKDIR /app
    COPY . .

# Set Node.js memory limits for Railway 1GB limit
# WARNING: Railway free tier has 1GB memory limit
# Set memory for TypeScript compilation (Railway 1GB plan)
ENV NODE_OPTIONS="--max-old-space-size=850"
RUN echo "⚠️ RAILWAY MEMORY CONFIGURATION ⚠️" && \
    echo "Building with 850MB memory limit (Railway 1GB plan)" && \
    echo "If build fails with 'Killed' or exit code 137, you need to:" && \
    echo "1. Upgrade your Railway plan for more memory, OR" && \
    echo "2. Disable teardown feature to save memory, OR" && \
    echo "3. Reduce build memory usage further"
ENV NPM_CONFIG_MAXSOCKETS=10
ENV NPM_CONFIG_PROGRESS=false

# Copy ALL package files first for optimal caching
COPY package*.json ./
COPY turbo.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/database/package*.json ./packages/database/
COPY packages/typescript-config/package*.json ./packages/typescript-config/

# Install dependencies with memory constraints and retry logic
RUN npm config set audit-level moderate && \
    npm config set fund false && \
    npm config set update-notifier false && \
    npm install --prefer-offline --no-audit --ignore-scripts --maxsockets=10 || \
    (echo "First install attempt failed, clearing cache and retrying..." && \
    npm cache clean --force && \
    npm install --prefer-offline --no-audit --ignore-scripts --maxsockets=5)

# Copy source code
COPY . .

# Build shared packages first (explicit build commands)
RUN echo "🔨 Building shared packages first..." && \
    echo "=== Building @repo/shared with explicit commands ===" && \
    cd packages/shared && \
    npm run build:cjs && \
    npm run build:esm && \
    echo "=== Building @repo/database ===" && \
    cd ../../packages/database && \
    npm run build && \
    cd ../../ && \
    echo "✅ Shared packages built successfully" && \
    echo "=== DEBUG: Checking what files were created ===" && \
    find packages/shared -name "*.js" -o -name "*.d.ts" | head -20 && \
    find packages/database -name "*.js" -o -name "*.d.ts" | head -20 && \
    echo "=== Verifying shared package build ===" && \
    test -f packages/shared/dist/cjs/index.js || (echo "ERROR: @repo/shared CJS build missing!" && exit 1) && \
    test -f packages/shared/dist/cjs/index.d.ts || (echo "ERROR: @repo/shared CJS types missing!" && exit 1) && \
    test -f packages/database/dist/index.js || (echo "ERROR: @repo/database build missing!" && exit 1) && \
    echo "✅ All shared package artifacts verified"

# Build backend with dependency packages already available
RUN NODE_OPTIONS="--max-old-space-size=850" npx turbo run build --filter=@repo/backend || \
    NODE_OPTIONS="--max-old-space-size=750" npx turbo run build --filter=@repo/backend

# Verify build output exists
RUN test -f apps/backend/dist/main.js || \
    (echo "ERROR: Backend build failed!" && \
    find apps/backend/dist -name "main.js" 2>/dev/null || \
    echo "No main.js found" && \
    exit 1)

# --- Stage 2: Production Image ---
FROM node:22-slim AS production

WORKDIR /app

# Install ONLY runtime dependencies - use slim for minimal footprint
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    tini && \
    rm -rf /var/lib/apt/lists/* && \
    groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -s /bin/bash -m nodejs

# Set production environment and memory limits
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"
ENV NPM_CONFIG_MAXSOCKETS=5
ENV NPM_CONFIG_PROGRESS=false

# Copy package files for production dependency installation
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/database/package*.json ./packages/database/
COPY packages/typescript-config/package*.json ./packages/typescript-config/

# Install ONLY production dependencies with retry logic and memory constraints
RUN npm config set audit-level moderate && \
    npm config set fund false && \
    npm config set update-notifier false && \
    npm install --omit=dev --prefer-offline --no-audit --ignore-scripts --maxsockets=5 --platform=linux || \
    (echo "Production install failed, clearing cache and retrying..." && \
    npm cache clean --force && \
    npm install --omit=dev --prefer-offline --no-audit --ignore-scripts --maxsockets=3 --platform=linux) && \
    npm cache clean --force

# Copy built application from builder with explicit verification
COPY --from=builder --chown=nodejs:nodejs \
    /app/apps/backend/dist /app/apps/backend/dist
COPY --from=builder --chown=nodejs:nodejs \
    /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=nodejs:nodejs \
    /app/packages/database/dist ./packages/database/dist

# Verify critical files exist
RUN test -f apps/backend/dist/main.js || \
    (echo "ERROR: Backend main.js missing!" && exit 1)

# Set working directory
WORKDIR /app

# Create logs directory with proper permissions
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app/logs

# Switch to nodejs user
USER nodejs

# Dynamic port configuration for Railway
# Railway provides PORT environment variable dynamically
ENV DOCKER_CONTAINER=true
# Don't set a fixed PORT - let Railway provide it
EXPOSE $PORT

# Comprehensive health check with multiple fallbacks
# Railway handles health checks externally, so we don't need Docker HEALTHCHECK
# HEALTHCHECK --interval=30s --timeout=10s --start-period=180s --retries=5 \
#     CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

# Use tini for proper signal handling
ENTRYPOINT ["tini", "--"]
# Start from the correct path
# The dist folder is at /app/apps/backend/dist/main.js
WORKDIR /app
CMD ["node", "apps/backend/dist/main.js"]
