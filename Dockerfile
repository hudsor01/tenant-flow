# syntax=docker/dockerfile:1.6

# --- Stage 1: Build Dependencies ---
FROM node:22-slim AS builder
WORKDIR /app

# Install system dependencies with explicit versions and cleanup
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        dumb-init \
        g++ \
        git \
        make \
        python3 \
        tini && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy ALL package files first for optimal caching
COPY package*.json ./
COPY turbo.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/database/package*.json ./packages/database/
COPY packages/typescript-config/package*.json ./packages/typescript-config/

# Copy Prisma schema BEFORE installing dependencies
COPY packages/database/prisma ./packages/database/prisma

# Install ALL dependencies (including dev dependencies needed for build)
RUN npm ci --prefer-offline --no-audit --verbose

# Explicitly generate Prisma client with error checking
WORKDIR /app/packages/database
RUN npx prisma generate --schema=./prisma/schema.prisma && \
    echo "=== Prisma client generated successfully ===" && \
    ls -la src/generated/client/ && \
    test -f src/generated/client/index.js || \
    (echo "ERROR: Prisma client not generated!" && exit 1)

# Return to root and copy source code
WORKDIR /app
COPY . .

# Build with Turbo with explicit error handling and verbose output
RUN echo "=== Starting Turbo build ===" && \
    NODE_ENV=production npx turbo run build \
        --filter=@repo/backend... \
        --force \
        --verbose && \
    echo "=== Turbo build completed ==="

# Verify build output exists
RUN test -f apps/backend/dist/apps/backend/src/main.js || \
    (echo "ERROR: Backend build failed!" && \
     find apps/backend/dist -name "*.js" 2>/dev/null || \
     echo "No JS files found" && \
     exit 1)

# --- Stage 2: Production Image ---
FROM node:22-slim AS production
WORKDIR /app

# Install ONLY runtime dependencies with security updates
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        dumb-init \
        tini && \
    apt-get upgrade -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nodejs

# Copy package files for production dependency installation
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/database/package*.json ./packages/database/

# Install ONLY production dependencies
ENV NODE_ENV=production
RUN npm ci --omit=dev --prefer-offline --no-audit && \
    npm cache clean --force

# Copy built application from builder with explicit verification
COPY --from=builder --chown=nodejs:nodejs \
    /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder --chown=nodejs:nodejs \
    /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=nodejs:nodejs \
    /app/packages/database/prisma ./packages/database/prisma
COPY --from=builder --chown=nodejs:nodejs \
    /app/packages/database/src/generated ./packages/database/src/generated

# Copy Prisma modules needed at runtime
COPY --from=builder --chown=nodejs:nodejs \
    /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nodejs:nodejs \
    /app/node_modules/@prisma ./node_modules/@prisma

# Verify critical files exist
RUN test -f packages/database/src/generated/client/index.js || \
    (echo "ERROR: Prisma client missing in production!" && exit 1) && \
    test -f apps/backend/dist/apps/backend/src/main.js || \
    (echo "ERROR: Backend main.js missing!" && exit 1)

# Set working directory and user
WORKDIR /app/apps/backend
USER nodejs

# Dynamic port configuration for Railway
ENV PORT=3000
EXPOSE 3000

# Comprehensive health check with multiple fallbacks
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e " \
    const http = require('http'); \
    const options = { \
      hostname: 'localhost', \
      port: process.env.PORT || 3000, \
      path: '/health', \
      timeout: 5000 \
    }; \
    const req = http.request(options, (res) => { \
      console.log('Health check:', res.statusCode); \
      process.exit(res.statusCode === 200 ? 0 : 1); \
    }); \
    req.on('error', (err) => { \
      console.error('Health check error:', err.message); \
      process.exit(1); \
    }); \
    req.on('timeout', () => { \
      console.error('Health check timeout'); \
      req.destroy(); \
      process.exit(1); \
    }); \
    req.end();"

# Use tini for proper signal handling
ENTRYPOINT ["tini", "--"]
CMD ["node", "dist/apps/backend/src/main.js"]
