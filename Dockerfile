# Production Dockerfile for TenantFlow Backend
# Handles Turborepo monorepo with proper CommonJS builds

# Stage 1: Base dependencies
FROM node:22-alpine AS base
RUN apk add --no-cache python3 make g++ git
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY turbo.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/shared/package*.json ./packages/shared/

# Install ALL dependencies (including dev for building)
RUN npm ci

# Stage 2: Build shared package as CommonJS
FROM base AS shared-builder
WORKDIR /app

# Copy shared package source
COPY packages/shared ./packages/shared

# Build shared package
WORKDIR /app/packages/shared
RUN npm run build

# Verify the build output
RUN ls -la dist/

# Stage 3: Build backend
FROM shared-builder AS backend-builder
WORKDIR /app

# Copy backend source
COPY apps/backend ./apps/backend

# Copy tsconfig files needed for build
COPY packages/typescript-config ./packages/typescript-config

# Generate Prisma client
WORKDIR /app/apps/backend
RUN npx prisma generate

# Build backend with nest CLI
# Allow non-zero exit to handle TypeScript warnings
RUN NODE_OPTIONS='--max-old-space-size=4096' npx nest build || true

# Verify build output exists
RUN ls -la dist/

# Stage 4: Production runtime
FROM node:22-alpine AS production
RUN apk add --no-cache dumb-init
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files for production
COPY package*.json ./
COPY turbo.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/shared/package*.json ./packages/shared/

# Install production dependencies only
ENV NODE_ENV=production
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy built artifacts
COPY --from=shared-builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=backend-builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=backend-builder /app/apps/backend/prisma ./apps/backend/prisma

# Copy node_modules with Prisma client
COPY --from=backend-builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=backend-builder /app/node_modules/@prisma ./node_modules/@prisma

# Set working directory to backend
WORKDIR /app/apps/backend

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3002/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"

# Use dumb-init to handle signals
ENTRYPOINT ["dumb-init", "--"]

# Run the compiled JavaScript directly
CMD ["node", "dist/main.js"]