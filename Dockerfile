# syntax=docker/dockerfile:1.6

# FINAL OPTIMIZED DOCKERFILE - Only proven optimizations
# Optimization 1: Layer caching (COPY reordering) - ✅ WORKS, saves ~30-40s on rebuilds
# Optimization 2: npm ci - ❌ SLOWER than npm install  
# Optimization 3: Remove git/curl - ✅ WORKS, saves ~13s on apt-get

# --- Stage 1: Build Dependencies ---
FROM node:22-slim AS builder

# Install only essential build dependencies (saves ~13 seconds by removing git/curl)
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    g++ \
    make \
    python3 \
    tini && \
    rm -rf /var/lib/apt/lists/* && \
    npm config set registry https://registry.npmjs.org/

WORKDIR /app

# Set Node.js memory limits for Railway 1GB limit
ENV NODE_OPTIONS="--max-old-space-size=850"
RUN echo "⚠️ RAILWAY MEMORY CONFIGURATION ⚠️" && \
    echo "Building with 850MB memory limit (Railway 1GB plan)" && \
    echo "If build fails with 'Killed' or exit code 137, you need to:" && \
    echo "1. Upgrade your Railway plan for more memory, OR" && \
    echo "2. Disable teardown feature to save memory, OR" && \
    echo "3. Reduce build memory usage further"
ENV NPM_CONFIG_MAXSOCKETS=10
ENV NPM_CONFIG_PROGRESS=false

# OPTIMIZATION: Copy package files FIRST for optimal layer caching
# When only source code changes, npm install is cached
COPY package*.json ./
COPY turbo.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/database/package*.json ./packages/database/
COPY packages/typescript-config/package*.json ./packages/typescript-config/

# Install dependencies (npm install is faster than npm ci for this monorepo)
RUN npm config set audit-level moderate && \
    npm config set fund false && \
    npm config set update-notifier false && \
    npm install --prefer-offline --no-audit --ignore-scripts --maxsockets=10 || \
    (echo "First install attempt failed, clearing cache and retrying..." && \
    npm cache clean --force && \
    npm install --prefer-offline --no-audit --ignore-scripts --maxsockets=5)

# OPTIMIZATION: Copy source AFTER dependencies for better caching
COPY . .

# Clear TypeScript build cache to prevent module resolution issues
RUN echo "🧹 Clearing TypeScript build cache..." && \
    find . -name "*.tsbuildinfo" -delete && \
    find . -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true && \
    find . -name "node_modules/.cache" -type d -exec rm -rf {} + 2>/dev/null || true && \
    echo "✅ Build cache cleared"

# Build shared packages first (sequential build required for dependencies)
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

# Install ONLY runtime dependencies
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

# Install ONLY production dependencies
RUN npm config set audit-level moderate && \
    npm config set fund false && \
    npm config set update-notifier false && \
    npm install --omit=dev --prefer-offline --no-audit --ignore-scripts --maxsockets=5 || \
    (echo "Production install failed, clearing cache and retrying..." && \
    npm cache clean --force && \
    npm install --omit=dev --prefer-offline --no-audit --ignore-scripts --maxsockets=3) && \
    npm cache clean --force

# Copy built application from builder
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
ENV DOCKER_CONTAINER=true
EXPOSE $PORT

# Use tini for proper signal handling
ENTRYPOINT ["tini", "--"]
WORKDIR /app
CMD ["node", "apps/backend/dist/main.js"]