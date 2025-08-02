#!/bin/bash

echo "🚀 TenantFlow Deployment Verification"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check URL
check_url() {
    local url=$1
    local name=$2
    local expected_status=${3:-200}
    
    echo -n "Checking $name ($url)... "
    
    response=$(curl -s -w "%{http_code}" -o /dev/null --max-time 10 "$url" 2>/dev/null)
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ FAILED (HTTP $response)${NC}"
        return 1
    fi
}

# Check frontend (Vercel)
echo -e "\n${YELLOW}Frontend (Vercel):${NC}"
check_url "https://tenantflow.app" "Main Site"
check_url "https://tenantflow.app/auth/login" "Login Page"

# Check backend (Railway)
echo -e "\n${YELLOW}Backend (Railway):${NC}"
check_url "https://api.tenantflow.app/health" "Health Check"
check_url "https://api.tenantflow.app/api/v1/health" "API Health"

# Check specific API endpoints
echo -e "\n${YELLOW}API Endpoints:${NC}"
check_url "https://api.tenantflow.app/api/v1/auth/check" "Auth Check" 401

echo -e "\n${YELLOW}DNS & SSL:${NC}"
# Check DNS resolution
nslookup tenantflow.app > /dev/null 2>&1 && echo -e "DNS tenantflow.app: ${GREEN}✅ OK${NC}" || echo -e "DNS tenantflow.app: ${RED}❌ FAILED${NC}"
nslookup api.tenantflow.app > /dev/null 2>&1 && echo -e "DNS api.tenantflow.app: ${GREEN}✅ OK${NC}" || echo -e "DNS api.tenantflow.app: ${RED}❌ FAILED${NC}"

echo -e "\n${YELLOW}Summary:${NC}"
echo "1. If frontend fails: Check Vercel deployment"
echo "2. If backend fails: Check Railway deployment and env vars"
echo "3. If DNS fails: Check domain configuration"

echo -e "\n${YELLOW}Quick fixes:${NC}"
echo "• Railway: Connect to hudsor01/tenant-flow repo"
echo "• Railway: Set environment variables (DATABASE_URL, JWT_SECRET, etc.)"
echo "• Railway: Deploy from main branch"
echo "• Vercel: Should auto-deploy from main branch"