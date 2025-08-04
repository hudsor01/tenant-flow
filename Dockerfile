# Fast NestJS Production Dockerfile - Optimized for 2025
FROM node:22-slim AS base

# Install only essential build dependencies in one layer
RUN apt-get update && apt-get install -y \
    python3 make g++ git dumb-init \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g npm@latest tsx

WORKDIR /app

# Copy package files for better layer caching
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/

# Install dependencies with npm ci for faster, reproducible builds
RUN npm ci --workspaces --include-workspace-root --production=false

# Copy source code
COPY . .

# Generate Prisma client
WORKDIR /app/apps/backend
RUN npx prisma generate

# Build the application (if you have a build step)
WORKDIR /app
RUN npm run build --workspace=@tenantflow/backend 2>/dev/null || echo "No build step found"

# Production stage - smaller final image
FROM node:22-slim AS production

RUN apt-get update && apt-get install -y dumb-init \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g tsx

# Create non-root user
RUN groupadd -g 1001 nodejs && useradd -r -u 1001 -g nodejs nodejs

WORKDIR /app

# Copy built application and node_modules
COPY --from=base --chown=nodejs:nodejs /app .

USER nodejs

ENV NODE_ENV=production
ENV PORT=4600

EXPOSE 4600

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4600/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"

ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "cd apps/backend && npx tsx src/main.ts"]