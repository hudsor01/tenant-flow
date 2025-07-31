# Use Node.js 22 Alpine for smaller image size
FROM node:22-alpine AS base

# Install dependencies for building native modules
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Install turbo globally for better caching
RUN npm install -g turbo@latest

# Copy package files for dependency installation
COPY package.json package-lock.json turbo.json ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/

# Install all dependencies (needed for building)
FROM base AS deps
RUN npm ci --include=dev

# Build phase
FROM base AS builder
WORKDIR /app

# Copy installed dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

# Copy source code
COPY . .

# Set build environment for better memory management
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Generate Prisma client and build with error handling
RUN cd apps/backend && npm run generate && cd ../.. && \
    turbo run build --filter=@tenantflow/backend... --no-daemon || \
    (echo "Build failed" && exit 1)

# Remove source maps for production
RUN find ./apps/backend/dist -name "*.map" -type f -delete 2>/dev/null || true && \
    find ./packages/shared/dist -name "*.map" -type f -delete 2>/dev/null || true

# Production image - much smaller
FROM node:22-alpine AS runner
WORKDIR /app

# Install dumb-init for proper signal handling in production
RUN apk add --no-cache dumb-init

# Add non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Install only production dependencies
COPY package.json package-lock.json turbo.json ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/

# Install production dependencies only
ENV NODE_ENV=production
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 4600

# Health check with better error handling
HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4600/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1)).on('error', () => process.exit(1));"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["sh", "-c", "cd apps/backend && npx prisma migrate deploy && node dist/main.js"]