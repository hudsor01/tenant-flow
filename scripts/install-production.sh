#!/bin/bash
# Production dependency installation script
# Installs only production dependencies, excluding dev/test packages

set -e

echo "🚀 Installing production dependencies..."

# Install root dependencies (minimal set for build coordination)
npm ci --only=production --no-audit --prefer-offline

# Install backend production dependencies
echo "📦 Installing backend production dependencies..."
cd apps/backend
npm ci --only=production --no-audit --prefer-offline
cd ../..

# Install shared package dependencies (production only)
echo "📦 Installing shared package dependencies..."
cd packages/shared
npm ci --only=production --no-audit --prefer-offline
cd ../..

echo "✅ Production dependencies installed successfully!"
echo "📊 Dependency summary:"
echo "- Root: $(npm list --depth=0 --only=prod 2>/dev/null | grep -c '─' || echo '0') packages"
echo "- Backend: $(cd apps/backend && npm list --depth=0 --only=prod 2>/dev/null | grep -c '─' || echo '0') packages"
echo "- Shared: $(cd packages/shared && npm list --depth=0 --only=prod 2>/dev/null | grep -c '─' || echo '0') packages"