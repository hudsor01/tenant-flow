#!/bin/bash
# Production build script optimized for minimal deployment time
set -e

echo "🏗️ Starting optimized production build..."

# Check if we're in CI environment
if [ "${CI}" = "true" ]; then
    echo "🤖 CI environment detected - using optimized build settings"
    export NODE_ENV=production
    export NODE_OPTIONS="--max-old-space-size=4096"
else
    echo "💻 Local environment detected"
    export NODE_OPTIONS="--max-old-space-size=8192"
fi

# Build shared dependencies first (required by both apps)
echo "📦 Building shared dependencies..."
npm run build --filter=@tenantflow/shared

# Build backend with production optimizations
echo "🖥️ Building backend..."
cd apps/backend

# Generate Prisma client first
echo "🔄 Generating Prisma client..."
NODE_OPTIONS="--max-old-space-size=2048" npm run generate

# Build NestJS application
echo "🏗️ Building NestJS application..."
NODE_ENV=production npm run build

cd ../..

echo "✅ Production build completed successfully!"

# Show build artifacts summary
echo "📊 Build artifacts:"
if [ -d "apps/backend/dist" ]; then
    BACKEND_SIZE=$(du -sh apps/backend/dist | cut -f1)
    echo "- Backend dist: ${BACKEND_SIZE}"
fi

if [ -d "packages/shared/dist" ]; then
    SHARED_SIZE=$(du -sh packages/shared/dist | cut -f1)
    echo "- Shared dist: ${SHARED_SIZE}"
fi

echo "🎉 Ready for deployment!"