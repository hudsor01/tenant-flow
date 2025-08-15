#!/bin/bash

# Turbo Remote Cache Setup Script
# This script configures Turbo remote caching for different environments

echo "🚀 Setting up Turbo Remote Cache..."

# Check if already logged in
if npx turbo login 2>&1 | grep -q "Existing token found"; then
    echo "✅ Already authenticated with Turbo"
else
    echo "📝 Please follow the browser prompt to authenticate with Vercel"
    npx turbo login
fi

# Set environment variables for current session
export TURBO_TEAM=team_hHHBP2g1RyRcqEZlePKqViVa
export TURBO_TOKEN=$(grep TURBO_TOKEN .env.local | cut -d'=' -f2)

echo ""
echo "✅ Turbo Remote Cache Configuration Complete!"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. For Vercel deployments, add these environment variables in Vercel dashboard:"
echo "   - TURBO_TEAM = team_hHHBP2g1RyRcqEZlePKqViVa"
echo "   - TURBO_TOKEN = (generate from Vercel dashboard)"
echo ""
echo "2. For GitHub Actions, add to repository secrets:"
echo "   - TURBO_TEAM = team_hHHBP2g1RyRcqEZlePKqViVa ✅ (already done)"
echo "   - TURBO_TOKEN = (same token from Vercel)"
echo ""
echo "3. For local development, run:"
echo "   source setup-turbo-cache.sh"
echo ""
echo "Test with: npx turbo run build --filter=@repo/shared --summarize"