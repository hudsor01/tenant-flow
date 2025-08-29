#!/bin/bash

# Test Runner for Webhook Idempotency
# Runs all levels of tests to verify production readiness

set -e

echo "🧪 Running Webhook Idempotency Tests"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if required environment variables are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ Error: Required environment variables not set${NC}"
    echo "Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    exit 1
fi

echo -e "${YELLOW}📋 Test Plan:${NC}"
echo "1. Unit Tests - Mock dependencies, test core logic"
echo "2. Integration Tests - Real database, verify persistence"
echo "3. E2E Tests - Full HTTP flow, production simulation"
echo ""

# Function to run test and capture result
run_test() {
    local test_type="$1"
    local test_command="$2"
    
    echo -e "${YELLOW}🔄 Running $test_type...${NC}"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ $test_type passed${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_type failed${NC}"
        return 1
    fi
}

# Track test results
unit_result=0
integration_result=0
e2e_result=0

# 1. Unit Tests
run_test "Unit Tests" "npm test -- --testPathPattern='stripe-webhook.service.spec.ts'" || unit_result=1

echo ""

# 2. Integration Tests  
run_test "Integration Tests" "npm test -- --testPathPattern='stripe-webhook.integration.spec.ts'" || integration_result=1

echo ""

# 3. E2E Tests
run_test "E2E Tests" "npm test -- --testPathPattern='webhook-idempotency.e2e.spec.ts'" || e2e_result=1

echo ""
echo "===================="
echo "📊 Test Results Summary"
echo "===================="

if [ $unit_result -eq 0 ]; then
    echo -e "${GREEN}✅ Unit Tests: PASSED${NC}"
else
    echo -e "${RED}❌ Unit Tests: FAILED${NC}"
fi

if [ $integration_result -eq 0 ]; then
    echo -e "${GREEN}✅ Integration Tests: PASSED${NC}"
else
    echo -e "${RED}❌ Integration Tests: FAILED${NC}"
fi

if [ $e2e_result -eq 0 ]; then
    echo -e "${GREEN}✅ E2E Tests: PASSED${NC}"
else
    echo -e "${RED}❌ E2E Tests: FAILED${NC}"
fi

echo ""

# Overall result
if [ $unit_result -eq 0 ] && [ $integration_result -eq 0 ] && [ $e2e_result -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! Webhook idempotency is production-ready.${NC}"
    echo ""
    echo -e "${GREEN}✅ Acceptance Criteria Verified:${NC}"
    echo "   • ProcessedStripeEvent table working correctly"
    echo "   • Event ID checking prevents duplicates"
    echo "   • Service restarts don't affect idempotency"
    echo "   • Race conditions handled properly"
    echo "   • Database errors handled gracefully"
    echo "   • Performance maintained under load"
    exit 0
else
    echo -e "${RED}💥 Some tests failed. Please review and fix issues before deployment.${NC}"
    exit 1
fi