# Single-stage build for Railway deployment
FROM node:22-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    dumb-init \
    libc6-compat \
    python3 \
    make \
    g++

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/shared/package*.json ./packages/shared/
COPY turbo.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy source code
COPY . .

# Generate Prisma client
RUN cd apps/backend && npx prisma generate

# Build application
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Build shared package first, then backend
RUN npx turbo run build --filter=@tenantflow/shared --no-daemon
RUN npx turbo run build --filter=@tenantflow/backend --no-daemon

# Clean up unnecessary files
RUN rm -rf apps/frontend packages/tailwind-config \
    && find . -name "*.test.*" -delete \
    && find . -name "*.spec.*" -delete \
    && find . -name "*.map" -delete \
    && find . -name ".turbo" -type d -exec rm -rf {} + 2>/dev/null || true \
    && npm prune --production

# Set ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Set environment
ENV PORT=4600
ENV NODE_ENV=production
EXPOSE 4600

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4600/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1)).on('error', () => process.exit(1));"

# Start the application with migration safety
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "cd apps/backend && (npx prisma migrate deploy || echo 'Migration failed, continuing...') && node dist/main.js"]