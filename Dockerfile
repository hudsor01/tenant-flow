# syntax=docker/dockerfile:1.6
# Production Dockerfile for TenantFlow Backend
# Multi-stage build optimized for NestJS + Fastify + Prisma + Turborepo

# Stage 1: Base dependencies
FROM --platform=$BUILDPLATFORM node:22-slim AS base
WORKDIR /app

# Install build essentials for native dependencies
RUN apt-get update && apt-get install -y python3 make g++ git && rm -rf /var/lib/apt/lists/*

# Copy all package files and source code
COPY . .

# Install all dependencies including dev dependencies for building
RUN npm ci --prefer-offline --no-audit

# Stage 2: Build everything
FROM base AS builder
WORKDIR /app

# Generate Prisma client
RUN npx turbo run generate --filter=@repo/database

# Build all packages in dependency order
RUN npx turbo build --filter=@repo/backend...

# Production stage - smaller final image
FROM node:22-slim AS production

# Install runtime dependencies and security updates
RUN apt-get update && apt-get install -y dumb-init tini ca-certificates && \
    apt-get upgrade -y && rm -rf /var/lib/apt/lists/*

# Create non-root user with specific UID/GID for security
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nodejs

WORKDIR /app

# Copy package files for production install
COPY package*.json turbo.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/database/package*.json ./packages/database/

# Install production dependencies only
ENV NODE_ENV=production
RUN npm ci --omit=dev --prefer-offline --no-audit && \
    npm cache clean --force

# Copy built files from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/shared/dist ./packages/shared/dist

# Copy database package (includes dist if built, and prisma schema)
COPY --from=builder --chown=nodejs:nodejs /app/packages/database ./packages/database

# Copy Prisma client files (these are critical and must exist)
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
