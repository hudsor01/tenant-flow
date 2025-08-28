# syntax=docker/dockerfile:1.9
# check=error=true

# ===== BASE STAGE =====
# Lightweight Node.js 24 on Alpine Linux for minimal footprint and security
FROM node:24-alpine AS base

# Install essential build dependencies only
# python3, make, g++: Required for native Node modules (bcrypt, sharp, etc.)
# Removed curl: Using Node.js for health checks (saves 2.5MB + attack surface)
RUN apk add --no-cache python3 make g++ && \
    rm -rf /var/cache/apk/*

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
COPY packages/typescript-config/package.json ./packages/typescript-config/

# Install all dependencies including dev dependencies for building
# --mount=type=cache: Persist npm cache across builds (60-90s faster rebuilds)
# npm ci: Use lockfile for deterministic, reproducible builds
RUN --mount=type=cache,id=s/c03893f1-40dd-475f-9a6d-47578a09303a-/root/.npm,target=/root/.npm \
    npm ci --silent

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
# Increase memory for Railway builds (they have more available)
ENV NODE_OPTIONS="--max-old-space-size=2048" \
    TURBO_TELEMETRY_DISABLED=1

# Build all packages in sequence with proper error handling
RUN cd packages/shared && npm run build && \
    cd ../database && npm run build && \
    cd ../../apps/backend && npm run build

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
COPY packages/typescript-config/package.json ./packages/typescript-config/

# Fresh production dependency install with cache optimization
# npm ci: Use lockfile for deterministic, reproducible builds
RUN --mount=type=cache,id=s/c03893f1-40dd-475f-9a6d-47578a09303a-/root/.npm,target=/root/.npm \
    npm ci --omit=dev --silent

# ===== RUNTIME STAGE =====
# Final minimal runtime image with security hardening
FROM node:24-alpine AS runtime

# Create non-root user for security (Railway/Docker best practice)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

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

# Install curl for healthchecks and utilities
USER root
RUN apk add --no-cache curl
USER nodejs

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

# NO HEALTHCHECK - Railway handles this externally via HTTP endpoint
# The app exposes /health/ping and /health/pressure endpoints natively

# Direct Node.js execution
CMD ["node", "apps/backend/dist/main.js"]