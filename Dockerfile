# syntax=docker/dockerfile:1.6

# --- Stage 1: Build Dependencies ---
FROM node:22-slim AS builder
WORKDIR /app

# Install build tools
RUN apt-get update && \
    apt-get install -y python3 make g++ git && \
    rm -rf /var/lib/apt/lists/*

# Copy package files for dependency installation
COPY package*.json turbo.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/database/package*.json ./packages/database/
COPY packages/typescript-config/package*.json ./packages/typescript-config/
COPY packages/database/prisma ./packages/database/prisma

# Install all dependencies
RUN npm ci --prefer-offline --no-audit

# Copy source code
COPY apps/backend ./apps/backend
COPY packages/shared ./packages/shared
COPY packages/database ./packages/database
COPY packages/typescript-config ./packages/typescript-config
COPY tsconfig*.json ./

# Generate Prisma client & build with Turborepo
RUN NODE_ENV=production npx turbo run build --filter=@repo/backend...

# --- Stage 2: Production Image ---
FROM node:22-slim AS production
WORKDIR /app

# Runtime dependencies
RUN apt-get update && \
    apt-get install -y dumb-init tini ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nodejs

# Copy package files for production install
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/database/package*.json ./packages/database/

# Install only production dependencies
ENV NODE_ENV=production
RUN npm ci --omit=dev --prefer-offline --no-audit && \
    npm cache clean --force

# Copy built dist folders from builder
COPY --from=builder --chown=nodejs:nodejs /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/database/prisma ./packages/database/prisma

# Copy Prisma engine & generated client
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Ensure Prisma client is accessible in the right place for runtime
COPY --from=builder --chown=nodejs:nodejs /app/packages/database/src/generated ./packages/database/src/generated

# Set working directory
WORKDIR /app/apps/backend

# Switch to non-root user
USER nodejs

# Expose port
ENV PORT=4600
EXPOSE 4600

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e " \
    const http = require('http'); \
    const options = { \
      hostname: 'localhost', \
      port: process.env.PORT || 4600, \
      path: '/health', \
      timeout: 5000 \
    }; \
    const req = http.request(options, (res) => { \
      process.exit(res.statusCode === 200 ? 0 : 1); \
    }); \
    req.on('error', () => process.exit(1)); \
    req.on('timeout', () => { req.destroy(); process.exit(1); }); \
    req.end();"

# Use tini for better signal handling
ENTRYPOINT ["tini", "--"]
CMD ["node", "dist/apps/backend/src/main.js"]
