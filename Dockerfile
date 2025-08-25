# syntax=docker/dockerfile:1

# ===== BASE =====
FROM node:24-alpine AS base
WORKDIR /app

RUN apk add --no-cache \
    python3 make g++ curl

FROM base AS deps

COPY package*.json turbo.json ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY packages/tailwind-config/package.json ./packages/tailwind-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/


RUN rm -f package-lock.json && npm install --silent

FROM base AS builder
WORKDIR /app

COPY --from=deps /app ./
COPY . .

RUN rm -rf .git .github docs *.md apps/frontend apps/storybook

ENV NODE_ENV=production
RUN npm run build:backend

FROM node:24-alpine AS runtime

# Create non-root user for Alpine
RUN addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -G nodejs nodejs

WORKDIR /app

COPY --from=builder --chown=nodejs:nodejs /app/apps/backend/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

USER nodejs

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:${PORT:-4600}/health/ping || exit 1

ENV NODE_ENV=production
EXPOSE 4600

CMD ["node", "dist/apps/backend/src/main.js"]