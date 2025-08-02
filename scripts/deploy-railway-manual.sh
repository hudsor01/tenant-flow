#!/bin/bash

# Manual Railway deployment script
# This deploys the current branch to Railway

set -e

echo "🚂 Manual Railway Deployment"
echo "=========================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    curl -fsSL https://railway.app/install.sh | sh
    export PATH="$HOME/.railway/bin:$PATH"
fi

# Verify Railway CLI
railway --version

# Check if RAILWAY_TOKEN is set
if [ -z "$RAILWAY_TOKEN" ]; then
    echo "❌ RAILWAY_TOKEN not set. Please login with: railway login"
    echo "Or set RAILWAY_TOKEN environment variable"
    exit 1
fi

echo "📦 Current branch: $(git branch --show-current)"
echo "📍 Latest commit: $(git rev-parse --short HEAD)"

# Deploy to Railway
echo "🚀 Deploying to Railway..."
railway up --detach

echo "✅ Deployment triggered!"
echo ""
echo "📊 View deployment progress at: https://railway.app"
echo "📋 View logs with: railway logs"
echo ""
echo "🔗 Expected URLs after deployment:"
echo "   - https://1lvy9r08.up.railway.app/"
echo "   - https://1lvy9r08.up.railway.app/health"
echo "   - https://api.tenantflow.app/"
echo "   - https://api.tenantflow.app/health"