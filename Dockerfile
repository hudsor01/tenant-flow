# syntax=docker/dockerfile:1.6
# Production Dockerfile for TenantFlow Backend
# Multi-stage build optimized for NestJS + Fastify + Prisma + Turborepo

# Stage 1: Install dependencies and build shared packages
FROM --platform=$BUILDPLATFORM node:22-alpine AS dependencies
WORKDIR /app

# Install build essentials for native dependencies
RUN --mount=type=cache,target=/var/cache/apk \
    apk add --no-cache python3 make g++ git dumb-init

# Copy root package files
COPY --link package*.json ./
COPY --link turbo.json ./

# Copy workspace package files
COPY --link apps/backend/package*.json ./apps/backend/
COPY --link packages/shared/package*.json ./packages/shared/
COPY --link packages/database/package*.json ./packages/database/

# Install all dependencies (including dev for building)
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit

# Stage 2: Build shared packages
FROM dependencies AS builder
WORKDIR /app

# Copy all source files for shared packages
COPY --link packages/shared ./packages/shared
COPY --link packages/database ./packages/database

# Generate Prisma client first
RUN --mount=type=cache,target=/app/node_modules/.cache \
    npx turbo run generate --filter=@repo/database

# Build shared package
RUN --mount=type=cache,target=/app/node_modules/.cache \
    npx turbo build --filter=@repo/shared

# Stage 3: Build Backend
FROM builder AS backend-builder
WORKDIR /app

# Copy backend source
COPY --link apps/backend ./apps/backend

# Build backend
RUN --mount=type=cache,target=/app/node_modules/.cache \
    --mount=type=cache,target=/app/apps/backend/node_modules/.cache \
    npx turbo build --filter=@repo/backend

# Stage 4: Production image
FROM node:22-alpine AS production
WORKDIR /app

# Install runtime dependencies and security updates
RUN --mount=type=cache,target=/var/cache/apk \
    apk add --no-cache dumb-init tini ca-certificates && \
    apk upgrade --no-cache

# Create non-root user with specific UID/GID for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Copy package files for production install
COPY --link package*.json ./
COPY --link turbo.json ./
COPY --link apps/backend/package*.json ./apps/backend/
COPY --link packages/shared/package*.json ./packages/shared/
COPY --link packages/database/package*.json ./packages/database/

# Install production dependencies only
ENV NODE_ENV=production
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --prefer-offline --no-audit && \
    npm cache clean --force

# Copy built application and Prisma files
COPY --from=backend-builder --chown=nodejs:nodejs /app/apps/backend/dist ./apps/backend/dist
COPY --from=backend-builder --chown=nodejs:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=backend-builder --chown=nodejs:nodejs /app/packages/database/dist ./packages/database/dist
COPY --from=backend-builder --chown=nodejs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=backend-builder --chown=nodejs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --chown=nodejs:nodejs packages/database/prisma ./packages/database/prisma

# Set working directory to backend
WORKDIR /app/apps/backend

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Enhanced health check with better error handling
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e " \
    const http = require('http'); \
    const options = { \
      hostname: 'localhost', \
      port: 3000, \
      path: '/health', \
      timeout: 5000 \
    }; \
    const req = http.request(options, (res) => { \
      process.exit(res.statusCode === 200 ? 0 : 1); \
    }); \
    req.on('error', () => process.exit(1)); \
    req.on('timeout', () => { req.destroy(); process.exit(1); }); \
    req.end();"

# Use tini as init system for better signal handling
ENTRYPOINT ["tini", "--"]

# Start the application (includes migration)
CMD ["npm", "run", "start:prod"]