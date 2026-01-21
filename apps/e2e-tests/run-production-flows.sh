#!/bin/bash

# Production E2E Test Runner
# Runs comprehensive production-accurate user journey tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Production Flow E2E Tests${NC}"
echo -e "${GREEN}================================${NC}"
echo ""

# Check environment variables
if [ -z "$E2E_OWNER_EMAIL" ]; then
    echo -e "${RED}ERROR: E2E_OWNER_EMAIL not set${NC}"
    echo "Please set: export E2E_OWNER_EMAIL='your-owner-email@example.com'"
    exit 1
fi

if [ -z "$E2E_OWNER_PASSWORD" ]; then
    echo -e "${RED}ERROR: E2E_OWNER_PASSWORD not set${NC}"
    echo "Please set: export E2E_OWNER_PASSWORD='your-password'"
    exit 1
fi

# Set defaults
export PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-http://localhost:3050}"
export NEXT_PUBLIC_API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-http://localhost:4650}"
export E2E_TENANT_PASSWORD="${E2E_TENANT_PASSWORD:-TenantPass123!}"

echo -e "${YELLOW}Configuration:${NC}"
echo "  Frontend URL: $PLAYWRIGHT_BASE_URL"
echo "  Backend URL:  $NEXT_PUBLIC_API_BASE_URL"
echo "  Owner Email:  $E2E_OWNER_EMAIL"
echo ""

# Check if servers are running
echo -e "${YELLOW}Checking servers...${NC}"

if ! curl -s "$PLAYWRIGHT_BASE_URL" > /dev/null; then
    echo -e "${RED}ERROR: Frontend not running at $PLAYWRIGHT_BASE_URL${NC}"
    echo "Start with: pnpm --filter @repo/frontend dev"
    exit 1
fi

if ! curl -s "$NEXT_PUBLIC_API_BASE_URL/health" > /dev/null; then
    echo -e "${RED}ERROR: Backend not running at $NEXT_PUBLIC_API_BASE_URL${NC}"
    echo "Start with: pnpm --filter @repo/backend dev"
    exit 1
fi

echo -e "${GREEN}✓ Servers are running${NC}"
echo ""

# Run tests
echo -e "${YELLOW}Running Production Flow Tests...${NC}"
echo ""

# Run complete owner journey
echo -e "${YELLOW}1/2: Complete Owner Journey${NC}"
npx playwright test tests/production-flows/complete-owner-journey.e2e.spec.ts \
    --project=chromium \
    --reporter=html,list \
    || true

echo ""

# Run complete tenant journey
echo -e "${YELLOW}2/2: Complete Tenant Journey${NC}"
npx playwright test tests/production-flows/tenant-complete-journey.e2e.spec.ts \
    --project=chromium \
    --reporter=html,list \
    || true

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Test Run Complete${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${YELLOW}View HTML report:${NC}"
echo "  npx playwright show-report"
echo ""
