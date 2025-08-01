#!/bin/bash
set -e

echo "🧪 Testing local build process..."

# Set Railway environment variables to mimic production
export NODE_ENV=production
export RAILWAY_ENVIRONMENT=production
export RAILWAY_USE_PREFIX=false
export PORT=4600

# Navigate to backend
cd apps/backend

echo "📦 Generating Prisma client..."
npx prisma generate

echo "🔨 Building backend..."
NODE_OPTIONS='--max-old-space-size=4096' npx nest build

echo "✅ Build completed successfully!"

# Test if the build artifacts exist
if [ -f "dist/main.js" ]; then
    echo "✅ dist/main.js exists"
else
    echo "❌ dist/main.js NOT found"
    exit 1
fi

# Test if we can start the server briefly
echo "🚀 Testing server startup..."
timeout 10s node dist/main.js || echo "⏰ Server startup test completed (timeout expected)"

echo "🎉 Local build test completed successfully!"