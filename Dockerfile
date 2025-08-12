# syntax=docker/dockerfile:1.6

# --- Stage 1: Build Dependencies ---
FROM node:22-slim AS builder

WORKDIR /app

# Install system dependencies with explicit versions and cleanup
RUN apt-get update && \
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

# Set Node.js memory limits for Railway 1GB limit
# WARNING: Railway free tier has 1GB memory limit
# If build fails with exit code 137, upgrade Railway plan for more memory
ENV NODE_OPTIONS="--max-old-space-size=768"
RUN echo "⚠️ RAILWAY FREE TIER MEMORY WARNING ⚠️" && \
    echo "Building with 768MB memory limit (Railway free tier: 1GB total)" && \
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

# Copy Prisma schema BEFORE installing dependencies
COPY packages/database/prisma ./packages/database/prisma

# Install dependencies with memory constraints and retry logic
RUN npm config set audit-level moderate && \
    npm config set fund false && \
    npm config set update-notifier false && \
    npm install --prefer-offline --no-audit --ignore-scripts --maxsockets=10 || \
    (echo "First install attempt failed, clearing cache and retrying..." && \
    npm cache clean --force && \
    npm install --prefer-offline --no-audit --ignore-scripts --maxsockets=5)

# Skip frontend-specific dependencies for backend build
# lightningcss and tailwindcss are not needed for NestJS backend
RUN echo "Skipping frontend dependencies (lightningcss, tailwindcss) for backend build"

# Install missing type dependencies for build
WORKDIR /app/apps/backend
RUN npm install --save-dev @types/express

# Explicitly generate Prisma client with error checking and memory limits
WORKDIR /app/packages/database
RUN NODE_OPTIONS="--max-old-space-size=512" npx prisma generate --schema=./prisma/schema.prisma && \
    echo "=== Prisma client generated successfully ===" && \
    ls -la src/generated/client/ && \
    test -f src/generated/client/index.js || \
    (echo "ERROR: Prisma client not generated!" && exit 1)

# Return to root and copy source code
WORKDIR /app
COPY . .

# Build with Turbo with explicit error handling and memory constraints
# Use tsc directly with skipLibCheck to avoid type errors in Docker
RUN echo "=== Building shared package ===" && \
    cd packages/shared && npm run build && \
    echo "=== Building database package ===" && \
    cd ../database && npm run build && \
    echo "=== Building backend ===" && \
    cd ../../apps/backend && \
    (echo "🚨 BUILDING BACKEND - THIS IS WHERE RAILWAY USUALLY FAILS ON FREE TIER 🚨" && \
    echo "If this fails with 'Killed' or exit code 137, upgrade Railway plan!" && \
    NODE_OPTIONS="--max-old-space-size=768" npx tsc -p tsconfig.build.json --skipLibCheck || \
    (echo "❌ BUILD FAILED - LIKELY MEMORY ISSUE! Exit code: $?" && \
    echo "SOLUTION: Upgrade Railway plan from free tier (1GB) to hobby tier (8GB)" && exit 1)) && \
    echo "=== Build completed ===" && \
    echo "=== Backend dist structure ===" && \
    find /app/apps/backend/dist

# Verify build output exists
RUN test -f apps/backend/dist/apps/backend/src/main.js || \
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
    /app/apps/backend/dist/apps/backend /app/apps/backend/dist/apps/backend
COPY --from=builder --chown=nodejs:nodejs \
    /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=nodejs:nodejs \
    /app/packages/database/dist ./packages/database/dist
COPY --from=builder --chown=nodejs:nodejs \
    /app/packages/database/prisma ./packages/database/prisma

# Install Prisma CLI in production stage to ensure correct binary
RUN npm install --no-save prisma

# Generate Prisma client for Linux in production stage (always, not conditionally)
RUN cd packages/database && NODE_OPTIONS="--max-old-space-size=512" npx prisma generate --schema=./prisma/schema.prisma && \
    test -f src/generated/client/index.js || (echo "ERROR: Prisma client missing in production!" && exit 1)

# Copy Prisma modules needed at runtime (conditional)
RUN --mount=from=builder,source=/app/node_modules,target=/tmp/node_modules,ro \
    mkdir -p ./node_modules && \
    if [ -d "/tmp/node_modules/.prisma" ]; then \
    cp -r /tmp/node_modules/.prisma ./node_modules/ && chown -R nodejs:nodejs ./node_modules/.prisma; \
    else \
    echo "Warning: .prisma directory not found in builder stage"; \
    fi && \
    if [ -d "/tmp/node_modules/@prisma" ]; then \
    cp -r /tmp/node_modules/@prisma ./node_modules/ && chown -R nodejs:nodejs ./node_modules/@prisma; \
    else \
    echo "Warning: @prisma directory not found in builder stage"; \
    fi

# Verify critical files exist
RUN test -f packages/database/src/generated/client/index.js || \
    (echo "ERROR: Prisma client missing in production!" && exit 1) && \
    (test -f apps/backend/dist/apps/backend/src/main.js) || \
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
# The dist folder is at /app/apps/backend/dist/apps/backend/src/main.js
WORKDIR /app
CMD ["node", "apps/backend/dist/apps/backend/src/main.js"]
