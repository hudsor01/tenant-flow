#!/bin/bash

echo "🚂 Railway Deployment Status Check"
echo "=================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "\n${YELLOW}Backend Health Checks:${NC}"

# Check main health endpoint
echo -n "Health endpoint... "
if curl -s --max-time 10 "https://api.tenantflow.app/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ DOWN${NC}"
fi

# Check API health endpoint
echo -n "API health endpoint... "
if curl -s --max-time 10 "https://api.tenantflow.app/api/v1/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ DOWN${NC}"
fi

echo -e "\n${YELLOW}Configuration Check:${NC}"
echo "• railway.toml: Updated for monorepo"
echo "• Dockerfile: Single-stage optimized build"
echo "• Watch paths: Only backend-related files"
echo "• Health checks: /health and /api/v1/health"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo "1. Connect Railway to GitHub repo (hudsor01/tenant-flow)"
echo "2. Set RAILWAY_TOKEN in GitHub repository secrets"
echo "3. Configure Railway environment variables:"
echo "   - DATABASE_URL (Supabase connection string)"
echo "   - JWT_SECRET"
echo "   - STRIPE_SECRET_KEY"
echo "   - Other app-specific secrets"
echo "4. Deploy from main branch"

echo -e "\n${YELLOW}Railway Dashboard:${NC}"
echo "https://railway.app - Check logs and deployment status"