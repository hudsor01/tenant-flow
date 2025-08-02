#!/bin/bash

# Prepare backend for deployment

set -e

echo "🚀 Preparing TenantFlow Backend for Deployment"
echo "============================================="

# Create deployment directory
DEPLOY_DIR="deployment-build"
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

# Copy backend dist
echo "Copying backend files..."
cp -r apps/backend/dist $DEPLOY_DIR/
cp apps/backend/package.json $DEPLOY_DIR/
cp -r apps/backend/prisma $DEPLOY_DIR/
cp apps/backend/.env.production $DEPLOY_DIR/.env

# Clean package.json
echo "Cleaning package.json..."
node scripts/clean-package-json.js $DEPLOY_DIR/package.json


# Copy shared package dist
echo "Copying shared package..."
mkdir -p $DEPLOY_DIR/node_modules/@tenantflow/shared/dist
cp -r packages/shared/dist/* $DEPLOY_DIR/node_modules/@tenantflow/shared/dist/
cp packages/shared/package.json $DEPLOY_DIR/node_modules/@tenantflow/shared/

# Create simple Dockerfile
cat > $DEPLOY_DIR/Dockerfile << 'EOF'
FROM node:22-alpine

# Install dumb-init
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy everything
COPY . .

# Install only production dependencies
RUN npm install --omit=dev

# Generate Prisma client
RUN npx prisma generate

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
USER nestjs

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
EOF

echo "✅ Deployment package ready in $DEPLOY_DIR/"