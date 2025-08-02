#!/bin/bash
set -e

echo "🔍 Railway Routing Diagnostic Script"
echo "===================================="

# Test the actual Railway deployment
RAILWAY_URL="https://1lvy9r08.up.railway.app"
CUSTOM_DOMAIN="https://api.tenantflow.app"

echo ""
echo "🌐 Testing Railway Internal URL: $RAILWAY_URL"
echo ""

# Test basic health endpoints
echo "1. Testing root endpoint..."
curl -v -H "Accept: application/json" "$RAILWAY_URL/" || echo "❌ Root endpoint failed"

echo ""
echo "2. Testing /health endpoint..."
curl -v -H "Accept: application/json" "$RAILWAY_URL/health" || echo "❌ Health endpoint failed"

echo ""
echo "3. Testing /health/simple endpoint..."
curl -v -H "Accept: application/json" "$RAILWAY_URL/health/simple" || echo "❌ Simple health endpoint failed"

echo ""
echo "4. Testing with /api/v1 prefix (should fail if prefix is disabled)..."
curl -v -H "Accept: application/json" "$RAILWAY_URL/api/v1/health" || echo "❌ Prefixed health endpoint failed (expected if prefix disabled)"

echo ""
echo "🌍 Testing Custom Domain: $CUSTOM_DOMAIN"
echo ""

echo "5. Testing custom domain root..."
curl -v -H "Accept: application/json" "$CUSTOM_DOMAIN/" || echo "❌ Custom domain root failed"

echo ""
echo "6. Testing custom domain health..."
curl -v -H "Accept: application/json" "$CUSTOM_DOMAIN/health" || echo "❌ Custom domain health failed"

echo ""
echo "🔄 Testing Railway Environment Status"
echo ""

# Check Railway service status
echo "7. Checking Railway deployment status..."
echo "Deployment ID: e364a52b-bab2-47fc-8e90-9eed772a6e40"
echo "Check Railway dashboard for logs and status"

echo ""
echo "✅ Diagnostic complete!"
echo ""
echo "If all tests fail with 404, the issue is likely:"
echo "1. NestJS routing not initialized properly"
echo "2. Fastify adapter configuration issue" 
echo "3. Middleware blocking all requests"
echo "4. App not binding to 0.0.0.0:4600 correctly"