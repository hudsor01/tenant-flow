#!/bin/bash
set -e

echo "🐳 Docker Railway Environment Test"
echo "================================="

# Clean up any existing test containers
docker stop tenantflow-test 2>/dev/null || true
docker rm tenantflow-test 2>/dev/null || true

echo ""
echo "🔨 Building test Docker image..."
docker build -f Dockerfile.test -t tenantflow-test .

echo ""
echo "🚀 Starting test container..."
docker run -d \
  --name tenantflow-test \
  -p 4600:4600 \
  tenantflow-test

echo ""
echo "📋 Container logs (first 10 seconds)..."
sleep 2
docker logs tenantflow-test

echo ""
echo "🔍 Testing endpoints..."
sleep 3

echo ""
echo "1. Testing root endpoint..."
curl -v -H "Accept: application/json" "http://localhost:4600/" || echo "❌ Root endpoint failed"

echo ""
echo "2. Testing health endpoint..."
curl -v -H "Accept: application/json" "http://localhost:4600/health" || echo "❌ Health endpoint failed"

echo ""
echo "3. Testing simple health endpoint..."
curl -v -H "Accept: application/json" "http://localhost:4600/health/simple" || echo "❌ Simple health endpoint failed"

echo ""
echo "📋 Final container logs..."
docker logs tenantflow-test

echo ""
echo "🧹 Cleaning up..."
docker stop tenantflow-test
docker rm tenantflow-test

echo ""
echo "✅ Docker test completed!"