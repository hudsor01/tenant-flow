#!/bin/bash

# Production Validation Script
# Runs all test suites to validate project before deployment

set -e

echo "🚀 Starting Production Validation..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
FAILED=0
PASSED=0

# Function to run a test and track results
run_test() {
    local test_name=$1
    local test_command=$2

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📋 Running: $test_name"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    if eval "$test_command"; then
        echo -e "${GREEN}✅ PASSED: $test_name${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAILED: $test_name${NC}"
        ((FAILED++))
    fi
    echo ""
}

# 1. Clean build artifacts
echo -e "${YELLOW}🧹 Cleaning build artifacts...${NC}"
pnpm clean
echo ""

# 2. Type checking
run_test "TypeScript Type Checking" "pnpm typecheck"

# 3. Linting
run_test "ESLint Code Quality" "pnpm lint"

# 4. Build shared packages
run_test "Build Shared Packages" "pnpm build:shared"

# 5. Build backend
run_test "Build Backend (NestJS)" "pnpm build:backend"

# 6. Build frontend
run_test "Build Frontend (Next.js)" "pnpm build:frontend"

# 7. Unit tests - Backend
run_test "Backend Unit Tests (1005 tests)" "pnpm --filter @repo/backend test:unit"

# 8. Unit tests - Frontend
run_test "Frontend Unit Tests (484 tests)" "pnpm --filter @repo/frontend test"

# 9. Integration tests (requires Doppler)
if command -v doppler &> /dev/null; then
    run_test "Backend Integration Tests" "doppler run -- pnpm --filter @repo/backend test:integration"
else
    echo -e "${YELLOW}⚠️  Skipping Integration Tests (Doppler not installed)${NC}"
    echo "   Install Doppler: https://docs.doppler.com/docs/install-cli"
    echo ""
fi

# 10. E2E tests (requires full stack running)
if pgrep -f "next.*dev" > /dev/null && pgrep -f "nest.*start" > /dev/null; then
    run_test "E2E Tests (Playwright)" "pnpm test:e2e"
else
    echo -e "${YELLOW}⚠️  Skipping E2E Tests (Frontend/Backend not running)${NC}"
    echo "   Start services: pnpm dev"
    echo ""
fi

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Validation Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL VALIDATION PASSED - READY FOR PRODUCTION DEPLOYMENT${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Deploy frontend to Vercel: vercel deploy"
    echo "2. Deploy backend to Railway: railway deploy"
    echo "3. Monitor logs: railway logs"
    exit 0
else
    echo -e "${RED}❌ VALIDATION FAILED - Fix errors above before deploying${NC}"
    exit 1
fi
