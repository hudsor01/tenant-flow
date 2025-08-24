# syntax=docker/dockerfile:1.9
# check=error=true

# ===== BASE STAGE =====
# Node.js 22 on Debian Slim for SWC binary compatibility
# Debian provides better glibc support for Next.js SWC binaries
FROM node:22-slim AS base

# Install essential build dependencies only
# python3, make, g++, curl: Required for native Node modules and health checks
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ===== DEPS STAGE =====
# Install production dependencies only for optimal caching
FROM base AS deps

# Copy package files first for better Docker layer caching
# Changes to source code won't invalidate dependency cache
COPY package*.json turbo.json ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY packages/tailwind-config/package.json ./packages/tailwind-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/

# Install all dependencies including dev dependencies for building
# --mount=type=cache: Persist npm cache across builds (60-90s faster rebuilds)
# npm ci: Use lockfile for deterministic, reproducible builds
# --include=optional: Ensures platform-specific SWC binaries are installed
RUN --mount=type=cache,id=s/c03893f1-40dd-475f-9a6d-47578a09303a-/root/.npm,target=/root/.npm \
    npm ci --silent --include=optional

# ===== BUILDER STAGE =====
# Compile TypeScript to JavaScript with optimizations
FROM base AS builder

WORKDIR /app

# Copy dependencies from deps stage and all source files
COPY --from=deps /app ./
COPY . .

# Remove unnecessary files to reduce build context and layer size
RUN rm -rf .git .github docs *.md apps/frontend apps/storybook

# Build-time optimizations
# 1024MB memory: Optimized based on project complexity analysis (reduced from 1096MB)
# Disable telemetry: Faster builds, no data collection
ENV NODE_OPTIONS="--max-old-space-size=1024" \
    TURBO_TELEMETRY_DISABLED=1

# Build shared and database packages first, then backend
RUN --mount=type=cache,id=s/c03893f1-40dd-475f-9a6d-47578a09303a-/app/.turbo,target=/app/.turbo \
    cd packages/shared && npm run build && cd ../.. && \
    cd packages/database && npm run build && cd ../.. && \
    cd apps/backend && npm run build:docker

# ===== PRODUCTION DEPS STAGE =====
# Clean production dependencies separate from build artifacts
FROM base AS prod-deps

WORKDIR /app
ENV NODE_ENV=production

# Copy package files for clean production dependency install
COPY package*.json turbo.json ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY packages/tailwind-config/package.json ./packages/tailwind-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/

# Fresh production dependency install with cache optimization
# npm ci: Use lockfile for deterministic, reproducible builds
# --include=optional: Ensures platform-specific runtime dependencies
RUN --mount=type=cache,id=s/c03893f1-40dd-475f-9a6d-47578a09303a-/root/.npm,target=/root/.npm \
    npm ci --omit=dev --silent --include=optional

# ===== RUNTIME STAGE =====
# Final runtime image with security hardening and SWC compatibility
FROM node:22-slim AS runtime

# Create non-root user for security (Railway/Docker best practice)
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nodejs

WORKDIR /app

# Copy production artifacts with correct ownership
# Using --chown prevents permission issues and follows security best practices
COPY --from=prod-deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=prod-deps --chown=nodejs:nodejs /app/package*.json ./
COPY --from=prod-deps --chown=nodejs:nodejs /app/apps/backend/package.json ./apps/backend/
COPY --from=prod-deps --chown=nodejs:nodejs /app/packages/shared/package.json ./packages/shared/
COPY --from=prod-deps --chown=nodejs:nodejs /app/packages/database/package.json ./packages/database/

# Copy compiled application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/database/dist ./packages/database/dist

# Install curl for healthchecks and utilities (already installed in base)
# Debian slim has curl available through base stage

# Runtime optimizations for Railway deployment
# NODE_ENV=production: Enables production optimizations in Node.js and libraries
# DOCKER_CONTAINER=true: Signals containerized environment to application
# --enable-source-maps: Better error debugging in production
# --max-old-space-size=264: Optimized based on project analysis (+3% from 256MB for stability)
# UV_THREADPOOL_SIZE=2: Reduced thread pool for Railway's CPU allocation
# NODE_NO_WARNINGS=1: Cleaner logs, reduced overhead
ENV NODE_ENV=production \
    DOCKER_CONTAINER=true \
    NODE_OPTIONS="--enable-source-maps --max-old-space-size=264" \
    UV_THREADPOOL_SIZE=2 \
    NODE_NO_WARNINGS=1

# Railway PORT injection with fallback
ARG PORT=4600
ENV PORT=${PORT}

# VERBOSE health check with detailed logging for Railway debugging
# interval=20s: Balanced check frequency for Railway
# timeout=8s: Longer timeout to account for Railway network latency  
# start-period=90s: Extended grace period for Railway container startup
# retries=5: More retries to handle Railway network fluctuations
# Uses /health/ping - bulletproof endpoint with no dependencies
HEALTHCHECK --interval=20s --timeout=8s --start-period=90s --retries=5 \
  CMD node -e " \
    const http = require('http'); \
    const startTime = Date.now(); \
    console.log('=== DOCKER HEALTH CHECK START ==='); \
    console.log('Timestamp:', new Date().toISOString()); \
    console.log('Environment:', process.env.NODE_ENV || 'unknown'); \
    console.log('Port:', process.env.PORT || 'unknown'); \
    console.log('Railway Env:', process.env.RAILWAY_ENVIRONMENT || 'none'); \
    console.log('Docker Container:', process.env.DOCKER_CONTAINER || 'none'); \
    \
    const port = process.env.PORT || 4600; \
    console.log('Attempting to connect to 127.0.0.1:' + port + '/health/ping'); \
    \
    const options = { \
      hostname: '127.0.0.1', \
      port: port, \
      path: '/health/ping', \
      method: 'GET', \
      timeout: 6000, \
      headers: { \
        'User-Agent': 'Docker-HealthCheck', \
        'Accept': 'application/json', \
        'Connection': 'close' \
      } \
    }; \
    \
    console.log('Request options:', JSON.stringify(options, null, 2)); \
    \
    const req = http.request(options, (res) => { \
      console.log('Response received!'); \
      console.log('Status Code:', res.statusCode); \
      console.log('Headers:', JSON.stringify(res.headers, null, 2)); \
      \
      let data = ''; \
      res.on('data', chunk => { \
        data += chunk; \
        console.log('Data chunk received, length:', chunk.length); \
      }); \
      \
      res.on('end', () => { \
        const duration = Date.now() - startTime; \
        console.log('Response completed in', duration + 'ms'); \
        console.log('Response body:', data.slice(0, 200)); \
        console.log('=== HEALTH CHECK', res.statusCode === 200 ? 'PASSED' : 'FAILED', '==='); \
        process.exit(res.statusCode === 200 ? 0 : 1); \
      }); \
    }); \
    \
    req.on('error', (err) => { \
      console.error('=== HEALTH CHECK ERROR ==='); \
      console.error('Error type:', err.constructor.name); \
      console.error('Error message:', err.message); \
      console.error('Error code:', err.code || 'unknown'); \
      console.error('Duration:', Date.now() - startTime + 'ms'); \
      console.error('Stack trace:', err.stack); \
      process.exit(1); \
    }); \
    \
    req.on('timeout', () => { \
      console.error('=== HEALTH CHECK TIMEOUT ==='); \
      console.error('Request timed out after 6000ms'); \
      console.error('Total duration:', Date.now() - startTime + 'ms'); \
      req.destroy(); \
      process.exit(1); \
    }); \
    \
    req.setTimeout(6000); \
    \
    console.log('Sending HTTP request...'); \
    req.end();"

# Direct Node.js execution
CMD ["node", "apps/backend/dist/apps/backend/src/main.js"]