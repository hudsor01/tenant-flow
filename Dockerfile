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

# Generate Prisma client and build
RUN cd apps/backend && npm run generate && cd ../.. && \
    turbo run build --filter=@tenantflow/shared && \
    cd apps/backend && npm run build:docker

# Production image - much smaller
FROM node:22-alpine AS runner
WORKDIR /app

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

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4600/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start the application
CMD ["sh", "-c", "cd apps/backend && npx prisma migrate deploy && node dist/main.js"]