# syntax=docker/dockerfile:1.6

# --- Stage 1: Build Dependencies ---
FROM node:22-slim AS builder

WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    g++ \
    git \
    make \
    python3 \
    tini && \
    rm -rf /var/lib/apt/lists/*

# Set build memory limits (Railway has more memory during build)
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NPM_CONFIG_MAXSOCKETS=10
ENV NPM_CONFIG_PROGRESS=false

# Copy package files for dependency installation
COPY package*.json ./
COPY turbo.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/database/package*.json ./packages/database/
COPY packages/typescript-config/package*.json ./packages/typescript-config/

# Copy Prisma schema BEFORE installing dependencies
COPY packages/database/prisma ./packages/database/prisma

# Install ALL dependencies (including dev) for build (use install for cross-platform compatibility)
RUN npm install --include=dev --maxsockets=10

# Generate Prisma client for build environment
WORKDIR /app/packages/database
RUN npx prisma generate --schema=./prisma/schema.prisma

# Copy all source code
WORKDIR /app
COPY . .

# Build shared package first
RUN cd packages/shared && npm run build

# Build database package
RUN cd packages/database && npm run build

# Build backend using the SAME command as package.json
WORKDIR /app/apps/backend
RUN NODE_ENV=production NODE_OPTIONS='--max-old-space-size=4096' npx nest build

# Verify build output exists at the CORRECT path
RUN test -f dist/main.js || \
    (echo "ERROR: Backend build failed! Expected dist/main.js" && \
    find dist -type f -name "*.js" | head -20 && \
    exit 1)

# --- Stage 2: Production Image ---
FROM node:22-slim AS production

WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    tini && \
    rm -rf /var/lib/apt/lists/* && \
    groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -s /bin/bash -m nodejs

# Set production environment
ENV NODE_ENV=production
# Increase memory for production (Railway has 1GB limit)
ENV NODE_OPTIONS="--max-old-space-size=768"

# Copy package files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/database/package*.json ./packages/database/
COPY packages/typescript-config/package*.json ./packages/typescript-config/

# Install ONLY production dependencies (use install instead of ci for cross-platform compatibility)
RUN npm install --omit=dev --maxsockets=5

# Copy Prisma schema and migrations
COPY --from=builder --chown=nodejs:nodejs \
    /app/packages/database/prisma ./packages/database/prisma

# Generate Prisma client for Linux production
WORKDIR /app/packages/database
RUN npx prisma generate --schema=./prisma/schema.prisma

# Copy built application from builder (CORRECTED PATHS)
COPY --from=builder --chown=nodejs:nodejs \
    /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder --chown=nodejs:nodejs \
    /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=nodejs:nodejs \
    /app/packages/database/dist ./packages/database/dist

# Copy generated Prisma client
COPY --from=builder --chown=nodejs:nodejs \
    /app/packages/database/src/generated ./packages/database/src/generated

# Create necessary directories
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app/logs

# Set working directory for the app
WORKDIR /app/apps/backend

# Switch to non-root user
USER nodejs

# Dynamic port from Railway
EXPOSE ${PORT:-3001}

# Health check with proper timeout
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=5 \
    CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3001) + '/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1)).on('error', () => process.exit(1))"

# Use tini for signal handling
ENTRYPOINT ["tini", "--"]

# Start application from the CORRECT path (matching package.json)
CMD ["node", "dist/main.js"]