#!/bin/bash
set -e

echo "🚀 Starting Railway build process..."

# Set build environment
export NODE_ENV=production
export TURBO_TELEMETRY_DISABLED=1
export NODE_OPTIONS="--max-old-space-size=4096"

echo "📦 Installing dependencies..."
npm ci --include=dev

echo "🔧 Generating Prisma client..."
cd apps/backend && npm run generate && cd ../..

echo "🏗️ Building shared package..."
npx turbo run build --filter=@tenantflow/shared --no-daemon

echo "🏗️ Building backend..."
npx turbo run build --filter=@tenantflow/backend --no-daemon

echo "✅ Build completed successfully!"