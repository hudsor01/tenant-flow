# syntax=docker/dockerfile:1.6
# Production Dockerfile for TenantFlow Backend
# Multi-stage build optimized for NestJS + Fastify + Prisma + Turborepo

# Stage 1: Dependencies
FROM node:22-slim AS dependencies
WORKDIR /app

# Install build essentials
RUN apt-get update && apt-get install -y python3 make g++ git && rm -rf /var/lib/apt/lists/*

# Copy package files first for better caching
COPY package*.json turbo.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/database/package*.json ./packages/database/
COPY packages/typescript-config/package*.json ./packages/typescript-config/

# Install all dependencies
RUN npm ci --prefer-offline --no-audit

# Stage 2: Builder
FROM dependencies AS builder
WORKDIR /app

# Copy source code and configs
COPY apps/backend ./apps/backend
COPY packages/shared ./packages/shared
COPY packages/database ./packages/database
COPY packages/typescript-config ./packages/typescript-config
COPY tsconfig*.json ./
COPY turbo.json ./

# Generate Prisma client FIRST (required for build)
RUN cd packages/database && npx prisma generate --schema=./prisma/schema.prisma

# Build everything using Turborepo (handles dependencies correctly)
RUN NODE_ENV=production NODE_OPTIONS='--max-old-space-size=4096' npx turbo run build --filter=@repo/backend

# Debug: Check what was built
RUN echo "=== Checking backend dist contents ===" && \
    ls -la apps/backend/dist/ 2>/dev/null || echo "No dist folder created" && \
    find apps/backend -name "main.js" -type f 2>/dev/null || echo "main.js not found anywhere"

# Verify build output - NestJS with Turborepo puts output in dist/apps/backend/src/
RUN echo "=== Build verification ===" && \
    test -f apps/backend/dist/apps/backend/src/main.js || (echo "ERROR: main.js not found!" && ls -la apps/backend/dist/ && exit 1)

# Production stage
FROM node:22-slim AS production

# Install runtime dependencies
RUN apt-get update && apt-get install -y dumb-init tini ca-certificates && \
    apt-get upgrade -y && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nodejs

WORKDIR /app

# Copy package files for production dependencies
COPY package*.json turbo.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/database/package*.json ./packages/database/

# Install production dependencies only
ENV NODE_ENV=production
RUN npm ci --omit=dev --prefer-offline --no-audit && \
    npm cache clean --force

# Copy built application from builder
COPY --from=builder --chown=nodejs:nodejs /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/database ./packages/database

# Copy Prisma client
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Set working directory to backend
WORKDIR /app/apps/backend

# Switch to non-root user
USER nodejs

ENV PORT=4600
EXPOSE 4600

# Enhanced health check with correct port
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e " \
    const http = require('http'); \
    const options = { \
      hostname: 'localhost', \
      port: 4600, \
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
