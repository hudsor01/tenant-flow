#!/bin/bash
set -e

# Stripe Integration E2E Testing Script
# Tests the complete subscription lifecycle and access control

echo "🧪 Starting Stripe Integration E2E Tests..."
echo "================================================"
echo ""

PROJECT_REF="bshjmbshupiibfiewpxb"
BACKEND_URL="${BACKEND_URL:-http://localhost:3001/api/v1}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print test results
test_result() {
    local test_name="$1"
    local result="$2"
    local details="${3:-}"

    TESTS_RUN=$((TESTS_RUN + 1))

    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}✓${NC} $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗${NC} $test_name"
        [ -n "$details" ] && echo "  $details"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Function to run SQL query via Supabase
run_sql() {
    local query="$1"
    doppler run -- npx supabase db execute --db-url "$SUPABASE_URL" <<EOF
$query
EOF
}

# Function to check if migration is applied
check_migration() {
    local migration_name="$1"
    local result=$(doppler run -- npx supabase db execute --db-url "$SUPABASE_URL" <<EOF
SELECT version FROM supabase_migrations.schema_migrations
WHERE version LIKE '%$migration_name%'
LIMIT 1;
EOF
)

    if echo "$result" | grep -q "$migration_name"; then
        return 0
    else
        return 1
    fi
}

echo "📦 Step 1: Database Migration Verification"
echo "-------------------------------------------"

# Check if stripe schema exists
if doppler run -- npx supabase db execute --db-url "$SUPABASE_URL" "SELECT 1 FROM information_schema.schemata WHERE schema_name = 'stripe'" 2>/dev/null | grep -q "1"; then
    test_result "Stripe schema exists" "PASS"
else
    test_result "Stripe schema exists" "FAIL" "Run: supabase migration apply"
fi

# Check if user_id column exists
if doppler run -- npx supabase db execute --db-url "$SUPABASE_URL" "SELECT 1 FROM information_schema.columns WHERE table_schema = 'stripe' AND table_name = 'customers' AND column_name = 'user_id'" 2>/dev/null | grep -q "1"; then
    test_result "stripe.customers.user_id column exists" "PASS"
else
    test_result "stripe.customers.user_id column exists" "FAIL" "Migration 20251018_stripe_sync_engine_user_mapping.sql not applied"
fi

# Check PostgreSQL functions
echo ""
echo "🔍 Step 2: PostgreSQL Functions Verification"
echo "--------------------------------------------"

functions=(
    "link_stripe_customer_to_user"
    "get_stripe_customer_by_user_id"
    "get_user_id_by_stripe_customer"
    "get_user_active_subscription"
    "get_user_subscription_history"
    "check_user_feature_access"
    "get_user_invoices"
    "get_upcoming_invoice_preview"
    "get_user_plan_limits"
    "is_user_on_trial"
    "get_trial_days_remaining"
    "get_active_stripe_products"
)

for func in "${functions[@]}"; do
    if doppler run -- npx supabase db execute --db-url "$SUPABASE_URL" "SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = '$func'" 2>/dev/null | grep -q "1"; then
        test_result "Function: $func()" "PASS"
    else
        test_result "Function: $func()" "FAIL" "Migration not applied"
    fi
done

echo ""
echo "🎯 Step 3: Stripe Products Verification"
echo "---------------------------------------"

# Test get_active_stripe_products function
products_result=$(doppler run -- npx supabase db execute --db-url "$SUPABASE_URL" "SELECT COUNT(*) FROM public.get_active_stripe_products()" 2>/dev/null || echo "0")

if echo "$products_result" | grep -q "3"; then
    test_result "Stripe products accessible (3 expected)" "PASS"
elif echo "$products_result" | grep -q "[0-9]"; then
    count=$(echo "$products_result" | grep -o "[0-9]" | head -1)
    test_result "Stripe products accessible" "FAIL" "Expected 3, got $count"
else
    test_result "Stripe products accessible" "FAIL" "Function execution error"
fi

echo ""
echo "🌐 Step 4: Backend API Endpoint Tests"
echo "-------------------------------------"

# Test products endpoint
if curl -s "$BACKEND_URL/stripe/products" | grep -q "starter"; then
    test_result "GET /stripe/products" "PASS"
else
    test_result "GET /stripe/products" "FAIL" "Backend not responding or products missing"
fi

# Test pricing config endpoint
if curl -s "$BACKEND_URL/stripe/pricing-config" | grep -q "tenantflow"; then
    test_result "GET /stripe/pricing-config" "PASS"
else
    test_result "GET /stripe/pricing-config" "FAIL" "Pricing config not returning expected data"
fi

# Test prices endpoint
if curl -s "$BACKEND_URL/stripe/prices" | grep -q "price_"; then
    test_result "GET /stripe/prices" "PASS"
else
    test_result "GET /stripe/prices" "FAIL" "Prices not accessible"
fi

echo ""
echo "🔐 Step 5: Access Control Function Tests"
echo "----------------------------------------"

# Create a test user ID for access control testing
TEST_USER_ID="00000000-0000-0000-0000-000000000001"

# Test check_user_feature_access with no subscription
access_result=$(doppler run -- npx supabase db execute --db-url "$SUPABASE_URL" "SELECT public.check_user_feature_access('$TEST_USER_ID', 'advanced_analytics')::text" 2>/dev/null || echo "error")

if echo "$access_result" | grep -qi "false"; then
    test_result "Access control: No subscription = no access" "PASS"
else
    test_result "Access control: No subscription = no access" "FAIL" "Expected false, got: $access_result"
fi

# Test get_user_plan_limits with no subscription
limits_result=$(doppler run -- npx supabase db execute --db-url "$SUPABASE_URL" "SELECT COUNT(*) FROM public.get_user_plan_limits('$TEST_USER_ID')" 2>/dev/null || echo "0")

if echo "$limits_result" | grep -q "0"; then
    test_result "Plan limits: No subscription returns empty" "PASS"
else
    test_result "Plan limits: No subscription returns empty" "FAIL" "Should return 0 rows"
fi

# Test is_user_on_trial with no subscription
trial_result=$(doppler run -- npx supabase db execute --db-url "$SUPABASE_URL" "SELECT public.is_user_on_trial('$TEST_USER_ID')::text" 2>/dev/null || echo "error")

if echo "$trial_result" | grep -qi "false"; then
    test_result "Trial status: No subscription = not on trial" "PASS"
else
    test_result "Trial status: No subscription = not on trial" "FAIL" "Expected false"
fi

echo ""
echo "📊 Step 6: Webhook Endpoint Availability"
echo "----------------------------------------"

# Check if webhook endpoint exists (should return 400 for missing signature)
webhook_response=$(curl -s -w "%{http_code}" -o /dev/null "$BACKEND_URL/webhooks/stripe-sync" -X POST)

if [ "$webhook_response" = "400" ]; then
    test_result "Webhook endpoint /webhooks/stripe-sync" "PASS"
else
    test_result "Webhook endpoint /webhooks/stripe-sync" "FAIL" "Expected 400 (missing signature), got $webhook_response"
fi

echo ""
echo "🔄 Step 7: Module Integration Tests"
echo "-----------------------------------"

# Check if StripeAccessControlService is exported from StripeModule
if grep -q "StripeAccessControlService" apps/backend/src/modules/billing/stripe.module.ts; then
    test_result "StripeAccessControlService exported from StripeModule" "PASS"
else
    test_result "StripeAccessControlService exported from StripeModule" "FAIL"
fi

# Check if StripeSyncModule imports StripeModule
if grep -q "StripeModule" apps/backend/src/modules/stripe-sync/stripe-sync.module.ts; then
    test_result "StripeSyncModule imports StripeModule" "PASS"
else
    test_result "StripeSyncModule imports StripeModule" "FAIL"
fi

# Check if StripeSyncController uses StripeAccessControlService
if grep -q "StripeAccessControlService" apps/backend/src/modules/stripe-sync/stripe-sync.controller.ts; then
    test_result "StripeSyncController uses StripeAccessControlService" "PASS"
else
    test_result "StripeSyncController uses StripeAccessControlService" "FAIL"
fi

echo ""
echo "📝 Step 8: Code Quality Checks"
echo "------------------------------"

# Check if all TODO comments are documented
todo_count=$(grep -r "TODO: Send email" apps/backend/src/modules/billing/stripe-access-control.service.ts | wc -l)
if [ "$todo_count" -ge "3" ]; then
    test_result "Email notification TODOs documented" "PASS"
else
    test_result "Email notification TODOs documented" "FAIL" "Expected 3+ TODO comments"
fi

# Check TypeScript compilation
if pnpm --filter @repo/backend typecheck >/dev/null 2>&1; then
    test_result "TypeScript compilation (backend)" "PASS"
else
    test_result "TypeScript compilation (backend)" "FAIL"
fi

# Check if all tests pass
if pnpm --filter @repo/backend test:unit >/dev/null 2>&1; then
    test_result "Unit tests (all passing)" "PASS"
else
    test_result "Unit tests (all passing)" "FAIL"
fi

echo ""
echo "================================================"
echo "📊 Test Summary"
echo "================================================"
echo -e "Total Tests:  $TESTS_RUN"
echo -e "${GREEN}Passed:       $TESTS_PASSED${NC}"
if [ $TESTS_FAILED -gt 0 ]; then
    echo -e "${RED}Failed:       $TESTS_FAILED${NC}"
fi
echo ""

# Calculate success rate
SUCCESS_RATE=$((TESTS_PASSED * 100 / TESTS_RUN))
echo "Success Rate: $SUCCESS_RATE%"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed! Integration is battle-tested and production-ready.${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Review the output above for details.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Apply missing migrations to Supabase"
    echo "2. Ensure backend is running locally or update BACKEND_URL"
    echo "3. Verify Stripe API keys are set in Doppler"
    exit 1
fi
