#!/bin/bash

# Quick Docker build test to identify Railway build issues
set -e

echo "🔨 Testing Docker build (Railway simulation)"
echo "============================================"

# Enable BuildKit for better error messages
export DOCKER_BUILDKIT=1
export BUILDKIT_PROGRESS=plain

# Build with verbose output
echo "Starting build at $(date)"
docker build \
  --no-cache \
  --progress=plain \
  --target builder \
  -t tenantflow-backend-builder \
  -f Dockerfile \
  . 2>&1 | tee docker-build-test.log

if [ $? -eq 0 ]; then
  echo "✅ Build stage completed successfully!"
  
  # Now test the production stage
  echo "Building production stage..."
  docker build \
    --no-cache \
    --progress=plain \
    -t tenantflow-backend \
    -f Dockerfile \
    . 2>&1 | tee -a docker-build-test.log
    
  if [ $? -eq 0 ]; then
    echo "✅ Full build completed successfully!"
    echo "Image size: $(docker images tenantflow-backend --format 'table {{.Repository}}\t{{.Tag}}\t{{.Size}}')"
  else
    echo "❌ Production stage failed!"
  fi
else
  echo "❌ Build stage failed!"
  echo "Check docker-build-test.log for details"
  
  # Check for common issues
  if grep -q "Killed" docker-build-test.log; then
    echo "⚠️ Process was killed - likely out of memory (OOM)"
    echo "This matches Railway's memory limit issues"
  fi
  
  if grep -q "ECONNREFUSED" docker-build-test.log; then
    echo "⚠️ Network connection refused - npm registry issues"
  fi
  
  if grep -q "Cannot find module" docker-build-test.log; then
    echo "⚠️ Missing dependencies - check package.json files"
  fi
fi

echo "Build ended at $(date)"