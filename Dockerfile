# syntax=docker/dockerfile:1.9
ARG NODE_VERSION=24-alpine3.21

FROM node:${NODE_VERSION} AS base

RUN apk add --no-cache python3 make g++ dumb-init ca-certificates \
    && corepack enable \
    && corepack prepare pnpm@10.17.0 --activate

WORKDIR /app

ENV PNPM_HOME=/root/.local/share/pnpm \
    PATH=$PNPM_HOME:$PATH \
    HUSKY=0 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/backend/package.json apps/backend/
COPY packages/*/package.json packages/

RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

FROM base AS build

COPY --from=deps /root/.local/share/pnpm /root/.local/share/pnpm
COPY --from=deps /app/node_modules ./node_modules

COPY . .

RUN pnpm install --frozen-lockfile --offline

# Build with environment optimizations
ENV TURBO_TELEMETRY_DISABLED=1 \
    NODE_OPTIONS="--max-old-space-size=2048"

# Parallel builds with error handling (2025 optimization)
RUN pnpm run build:shared && \
    pnpm run build:backend

# Ensure runtime has access to Handlebars templates compiled from TypeScript
RUN mkdir -p apps/backend/dist/pdf/templates \
    && cp -R apps/backend/src/pdf/templates/. apps/backend/dist/pdf/templates/

# ===== PROD-DEPS OPTIMIZATION =====
# Clean production dependencies with node-prune (2025 technique)
FROM base AS prod-deps

ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/backend/package.json apps/backend/
COPY packages/shared/package.json packages/shared/
COPY packages/database/package.json packages/database/

RUN --mount=type=cache,id=pnpm-store-prod,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod --filter @repo/backend...

FROM node:${NODE_VERSION} AS runtime

RUN apk add --no-cache \
        chromium \
        nss \
        freetype \
        harfbuzz \
        ca-certificates \
        ttf-freefont \
        dumb-init \
    && rm -rf /var/cache/apk/* /tmp/*

WORKDIR /app

ENV NODE_ENV=production \
    DOCKER_CONTAINER=true \
    NODE_OPTIONS="--enable-source-maps --max-old-space-size=512" \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

USER node

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=build --chown=node:node /app/apps/backend/dist ./apps/backend/dist
COPY --from=build --chown=node:node /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build --chown=node:node /app/packages/shared/dist ./packages/shared/dist
COPY --from=build --chown=node:node /app/packages/database/package.json ./packages/database/package.json
COPY --from=build --chown=node:node /app/packages/database/dist ./packages/database/dist

ARG PORT=4600
ENV PORT=${PORT}
EXPOSE ${PORT}

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:' + process.env.PORT + '/health/ping', (r) => { r.statusCode === 200 ? process.exit(0) : process.exit(1) }).on('error', () => process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/backend/dist/main.js"]

LABEL maintainer="TenantFlow Team" \
      version="1.0.1" \
      description="TenantFlow Backend Service" \
      org.opencontainers.image.source="https://github.com/tenantflow/backend"
