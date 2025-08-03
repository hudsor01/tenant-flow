# Universal production Dockerfile for TenantFlow Backend
# Optimized for Railway deployment with fallback compatibility for other platforms
FROM node:24-slim

WORKDIR /app

# Install system dependencies including OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y \
    dumb-init \
    openssl \
    python3 \
    make \
    g++ \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user for security
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nodejs

# Copy package files for dependency installation
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/typescript-config/package*.json ./packages/typescript-config/
COPY turbo.json ./

# Install ALL dependencies (includes dev dependencies for build)
RUN npm ci --prefer-offline --no-audit

# Copy all source code
COPY . .

# Generate Prisma client (CRITICAL for Railway!)
WORKDIR /app/apps/backend
RUN npx prisma generate

# Set build environment
WORKDIR /app
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Build the application using the consolidated approach
# First build shared package, then backend
RUN echo "Building shared package..." && \
    cd packages/shared && \
    npm run build && \
    cd /app && \
    echo "Building backend..." && \
    npx turbo run build --filter=@tenantflow/backend...

# Clean up dev dependencies to reduce image size
RUN npm prune --omit=dev && \
    npm cache clean --force

# Set proper ownership for all files
RUN chown -R nodejs:nodejs /app

# Set working directory for the backend app
WORKDIR /app/apps/backend

# Switch to non-root user for security
USER nodejs

# Runtime environment
ENV NODE_ENV=production
ENV PORT=4600
EXPOSE 4600

# Simple health check using wget (more reliable in containers)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4600/health || exit 1

# Start application with migration safety and direct node execution
# This fixes the tsx hanging issue by using direct node execution
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "echo 'Starting TenantFlow Backend...' && echo 'DATABASE_URL exists: '${DATABASE_URL:+yes} && echo 'Running migrations...' && (npx prisma migrate deploy || echo 'Migration failed or skipped') && echo 'Starting server...' && node dist/main.js"]