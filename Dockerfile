# Production Dockerfile for TenantFlow Backend
# Multi-stage build optimized for NestJS + Fastify + Prisma + Turborepo

# Stage 1: Install dependencies and build shared packages
FROM node:22-alpine AS dependencies
WORKDIR /app

# Install build essentials for native dependencies
RUN apk add --no-cache python3 make g++ git

# Copy root package files
COPY package*.json ./
COPY turbo.json ./

# Copy workspace package files
COPY apps/backend/package*.json ./apps/backend/
COPY packages/shared/package*.json ./packages/shared/

# Install all dependencies (including dev for building)
RUN npm ci

# Stage 2: Build shared package
FROM dependencies AS shared-builder
WORKDIR /app

# Copy shared package source
COPY packages/shared ./packages/shared

# Build shared package
RUN npm run build --filter=@tenantflow/shared

# Stage 3: Generate Prisma Client and Build Backend
FROM shared-builder AS backend-builder
WORKDIR /app

# Copy backend source and Prisma schema
COPY apps/backend ./apps/backend
COPY --from=shared-builder /app/packages/shared/dist ./packages/shared/dist

# Generate Prisma client
WORKDIR /app/apps/backend
RUN npx prisma generate

# Build backend
WORKDIR /app
RUN npm run build --filter=@tenantflow/backend

# Stage 4: Production image
FROM node:22-alpine AS production
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files for production install
COPY package*.json ./
COPY turbo.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/shared/package*.json ./packages/shared/

# Install production dependencies only
ENV NODE_ENV=production
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy built application and Prisma files
COPY --from=backend-builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=backend-builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=backend-builder /app/apps/backend/node_modules/.prisma ./apps/backend/node_modules/.prisma
COPY --from=backend-builder /app/apps/backend/node_modules/@prisma ./apps/backend/node_modules/@prisma
COPY apps/backend/prisma ./apps/backend/prisma

# Set working directory to backend
WORKDIR /app/apps/backend

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application (includes migration)
CMD ["npm", "run", "start:prod"]