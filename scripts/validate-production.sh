#!/bin/bash

# Simple Pre-Deploy Validation Script
# Following MVP philosophy: Basic checks without over-engineering

set -e  # Exit on any error

echo "STARTING: Pre-Deploy Validation Starting..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "ERROR: Error: Must run from project root (package.json not found)"
  exit 1
fi

echo "TYPECHECK: Running TypeScript checks..."
npm run typecheck

echo "TESTING: Running tests..."
npm run test

echo "BUILD: Building project..."
npm run build

echo "PACKAGE: Checking for critical files..."
if [ ! -f "apps/frontend/package.json" ]; then
  echo "ERROR: Error: Frontend package.json missing"
  exit 1
fi

if [ ! -f "apps/backend/package.json" ]; then
  echo "ERROR: Error: Backend package.json missing"
  exit 1
fi

# Check if build outputs exist
if [ ! -d "apps/frontend/.next" ]; then
  echo "ERROR: Error: Frontend build output missing"
  exit 1
fi

if [ ! -d "apps/backend/dist" ]; then
  echo "ERROR: Error: Backend build output missing"
  exit 1
fi

echo "SUCCESS: Pre-deploy validation passed!"
echo "TARGET: Ready for production deployment"