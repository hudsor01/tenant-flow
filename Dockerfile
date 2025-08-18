# syntax=docker/dockerfile:1.6

# --- Stage 1: Build and Dependencies ---
FROM node:22-slim AS builder

# Install essential build dependencies
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    g++ \
    make \
    python3 \
    tini && \
    rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Set Node.js memory limits for Railway 1GB limit
ENV NODE_OPTIONS="--max-old-space-size=850"
ENV NPM_CONFIG_MAXSOCKETS=10
ENV NPM_CONFIG_PROGRESS=false

# Copy the monorepo's root package files first for layer caching
COPY package.json package-lock.json turbo.json ./
# Copy workspace package.json files to allow npm to build the dependency tree
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY packages/typescript-config/package.json ./packages/typescript-config/

# Install all dependencies using the monorepo's root package file.
# This correctly handles all workspace symlinks automatically.
RUN npm config set audit-level moderate && \
    npm config set fund false && \
    npm config set update-notifier false && \
    npm install

# Copy the rest of the source code
COPY . .

# Build only the backend and its dependencies using turbo.
# Turbo will correctly build shared packages before the backend.
# No need for manual symlinking or sequential build scripts in the Dockerfile.
RUN TURBO_TELEMETRY_DISABLED=1 npx turbo run build --filter=@repo/backend --no-cache

# Verify build output exists
RUN test -f apps/backend/dist/main.js || \
    (echo "ERROR: Backend build failed!" && \
    find apps/backend/dist -name "main.js" 2>/dev/null || \
    echo "No main.js found" && \
    exit 1)

# --- Stage 2: Production Image ---
FROM node:22-slim AS production

# Set the working directory
WORKDIR /app

# Install ONLY runtime dependencies
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
ENV DOCKER_CONTAINER=true
EXPOSE $PORT

# Copy only production dependencies from the builder stage
# This is more robust as it ensures all necessary packages are present
COPY --from=builder /app/node_modules /app/node_modules

# Copy the built application files
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/database/dist ./packages/database/dist

# Switch to nodejs user
USER nodejs

# Use tini for proper signal handling
ENTRYPOINT ["tini", "--"]
CMD ["node", "apps/backend/dist/main.js"]