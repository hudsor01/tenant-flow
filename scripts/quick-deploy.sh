#!/bin/bash
set -e

echo "🚀 Quick Deploy Script"
echo "====================="

# Build everything
echo "📦 Building..."
npm run build:frontend 2>/dev/null
npm run build:backend 2>/dev/null

# Deploy
echo "🚀 Deploying..."
npm run deploy:backend 2>/dev/null

# Test webhook
echo "🔍 Testing webhook..."
curl -s -o /dev/null -w "%{http_code}" -X POST https://tenantflow.app/api/v1/stripe/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

echo ""
echo "✅ Deploy complete!"
echo "📝 TODO: Update Stripe webhook URL to https://tenantflow.app/api/v1/stripe/webhook"