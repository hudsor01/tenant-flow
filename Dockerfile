# Multi-stage build for optimized caching and smaller final image

# Stage 1: Dependencies installer
FROM node:22-alpine AS dependencies
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache libc6-compat python3 make g++

# Copy package files only (for better caching)
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/shared/package*.json ./packages/shared/
COPY turbo.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Stage 2: Development dependencies for building
FROM node:22-alpine AS dev-dependencies
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache libc6-compat python3 make g++

# Copy package files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/shared/package*.json ./packages/shared/
COPY turbo.json ./

# Install all dependencies including dev
RUN npm ci

# Stage 3: Build the application
FROM node:22-alpine AS build
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache libc6-compat python3 make g++

# Accept build args for database connection during Prisma generation
ARG DATABASE_URL
ARG DIRECT_URL

# Copy dependencies from dev stage
COPY --from=dev-dependencies /app/node_modules ./node_modules
COPY --from=dev-dependencies /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=dev-dependencies /app/packages/shared/node_modules ./packages/shared/node_modules

# Copy source code
COPY . .

# Generate Prisma client
RUN cd apps/backend && npx prisma generate

# Build with optimized settings
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NODE_ENV=production

# Build shared package first, then backend
RUN npx turbo run build --filter=@tenantflow/shared --no-daemon
RUN npx turbo run build --filter=@tenantflow/backend --no-daemon

# Remove source maps and unnecessary files
RUN find apps/backend/dist -name "*.map" -delete 2>/dev/null || true && \
    find packages/shared/dist -name "*.map" -delete 2>/dev/null || true && \
    rm -rf apps/backend/src packages/shared/src

# Stage 4: Runtime image
FROM node:22-alpine AS runtime
WORKDIR /app

# Install only runtime dependencies
RUN apk add --no-cache dumb-init && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy production dependencies
COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=dependencies --chown=nodejs:nodejs /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=dependencies --chown=nodejs:nodejs /app/packages/shared/node_modules ./packages/shared/node_modules

# Copy built application
COPY --from=build --chown=nodejs:nodejs /app/apps/backend/dist ./apps/backend/dist
COPY --from=build --chown=nodejs:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=build --chown=nodejs:nodejs /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=build --chown=nodejs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Copy package files for module resolution
COPY --chown=nodejs:nodejs package*.json ./
COPY --chown=nodejs:nodejs apps/backend/package*.json ./apps/backend/
COPY --chown=nodejs:nodejs packages/shared/package*.json ./packages/shared/

# Copy startup script for Railway
COPY --chown=nodejs:nodejs apps/backend/scripts/start-production.sh ./apps/backend/scripts/

# Set production environment
ENV NODE_ENV=production
ENV PORT=4600

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 4600

# Health check - aligned with Railway configuration
HEALTHCHECK --interval=15s --timeout=30s --start-period=60s --retries=5 \
  CMD node -e "require('http').get('http://localhost:4600/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1)).on('error', () => process.exit(1));"

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application with Railway-compatible script
CMD ["sh", "-c", "cd apps/backend && sh scripts/start-production.sh"]