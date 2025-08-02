# Multi-stage optimized Dockerfile for Railway deployment
FROM node:22-alpine AS builder

WORKDIR /app

# Install system dependencies for building
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat \
    dumb-init

# Copy package files for dependency installation
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/typescript-config/package*.json ./packages/typescript-config/
COPY turbo.json ./

# Install ALL dependencies (needed for TypeScript compilation)
RUN npm ci --no-audit --prefer-offline

# Copy all source code
COPY . .

# Generate Prisma client first
WORKDIR /app/apps/backend
RUN npx prisma generate

# Set build environment
WORKDIR /app
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Rebuild native dependencies for Alpine Linux
RUN cd apps/backend && npm rebuild bcrypt

# Build backend and dependencies using Turborepo
RUN npx turbo run build --filter=@tenantflow/backend... --no-daemon

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Install runtime dependencies only
RUN apk add --no-cache \
    dumb-init \
    libc6-compat

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/backend/package*.json ./apps/backend/
COPY --from=builder --chown=nodejs:nodejs /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder --chown=nodejs:nodejs /app/packages ./packages
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/turbo.json ./

# Install production dependencies only
RUN npm ci --only=production --no-audit --prefer-offline && \
    cd apps/backend && npm install bcrypt && \
    npm cache clean --force

# Set ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Set runtime environment
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV PORT=4600
EXPOSE 4600

# Health check with IPv6 support for Railway
HEALTHCHECK --interval=30s --timeout=15s --start-period=60s --retries=3 \
  CMD node -e " \
    const http = require('http'); \
    const options = { \
      hostname: '::1', \
      port: 4600, \
      path: '/health', \
      timeout: 10000 \
    }; \
    const req = http.get(options, (res) => { \
      res.statusCode === 200 ? process.exit(0) : process.exit(1); \
    }); \
    req.on('error', () => process.exit(1)); \
    req.on('timeout', () => process.exit(1)); \
  "

# Start the application with dumb-init and migration safety
WORKDIR /app/apps/backend
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy || echo 'Migration skipped in production' && node dist/main.js"]