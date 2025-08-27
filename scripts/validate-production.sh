#!/bin/bash

# Simple Pre-Deploy Validation Script
# Following MVP philosophy: Basic checks without over-engineering

set -e  # Exit on any error

echo "🚀 Pre-Deploy Validation Starting..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Must run from project root (package.json not found)"
  exit 1
fi

echo "📋 Running TypeScript checks..."
npm run typecheck

echo "🧪 Running tests..."
npm run test

echo "🏗️  Building project..."
npm run build

echo "📦 Checking for critical files..."
if [ ! -f "apps/frontend/package.json" ]; then
  echo "❌ Error: Frontend package.json missing"
  exit 1
fi

if [ ! -f "apps/backend/package.json" ]; then
  echo "❌ Error: Backend package.json missing"
  exit 1
fi

# Check if build outputs exist
if [ ! -d "apps/frontend/.next" ]; then
  echo "❌ Error: Frontend build output missing"
  exit 1
fi

if [ ! -d "apps/backend/dist" ]; then
  echo "❌ Error: Backend build output missing"
  exit 1
fi

echo "✅ Pre-deploy validation passed!"
echo "🎯 Ready for production deployment"