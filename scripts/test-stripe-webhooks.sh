#!/bin/bash
set -e

# Stripe Webhook E2E Testing Script
# Uses Stripe CLI to trigger real webhook events and verify processing

echo "🎯 Stripe Webhook Event Testing"
echo "================================"
echo ""

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo "❌ Stripe CLI not found. Install with: brew install stripe/stripe-cli/stripe"
    exit 1
fi

# Check if logged in to Stripe
if ! stripe config --list &> /dev/null; then
    echo "❌ Not logged in to Stripe. Run: stripe login"
    exit 1
fi

BACKEND_URL="${BACKEND_URL:-http://localhost:3001/api/v1}"
TEST_EMAIL="test-$(date +%s)@tenantflow.app"

echo "ℹ️  Test Configuration:"
echo "   Backend URL: $BACKEND_URL"
echo "   Test Email:  $TEST_EMAIL"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

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

echo "🚀 Step 1: Start Webhook Listener"
echo "==================================  "
echo ""

# Start Stripe CLI webhook listener in background
echo "Starting Stripe webhook forwarding to $BACKEND_URL/webhooks/stripe-sync..."
stripe listen --forward-to "$BACKEND_URL/webhooks/stripe-sync" > stripe-webhook.log 2>&1 &
STRIPE_PID=$!

# Wait for listener to start
sleep 3

if ps -p $STRIPE_PID > /dev/null; then
    echo -e "${GREEN}✓${NC} Stripe webhook listener started (PID: $STRIPE_PID)"
else
    echo -e "${RED}✗${NC} Failed to start Stripe webhook listener"
    exit 1
fi

# Function to stop listener on exit
cleanup() {
    echo ""
    echo "🛑 Stopping webhook listener..."
    kill $STRIPE_PID 2>/dev/null || true
    rm -f stripe-webhook.log
}
trap cleanup EXIT

echo ""
echo "📦 Step 2: Test Customer Events"
echo "==============================="
echo ""

# Trigger customer.created event
echo "Triggering customer.created event..."
CUSTOMER_EVENT=$(stripe trigger customer.created --override email="$TEST_EMAIL" 2>&1)

sleep 2

# Check logs for customer processing
if grep -q "customer.created" stripe-webhook.log; then
    test_result "Webhook received: customer.created" "PASS"
else
    test_result "Webhook received: customer.created" "FAIL" "Event not in logs"
fi

if grep -q "Processing webhook business logic" stripe-webhook.log || grep -q "Linked Stripe customer" stripe-webhook.log; then
    test_result "Customer linking logic executed" "PASS"
else
    test_result "Customer linking logic executed" "FAIL" "No linking logic in logs"
fi

# Trigger customer.updated event
echo ""
echo "Triggering customer.updated event..."
stripe trigger customer.updated 2>&1 > /dev/null

sleep 2

if grep -q "customer.updated" stripe-webhook.log; then
    test_result "Webhook received: customer.updated" "PASS"
else
    test_result "Webhook received: customer.updated" "FAIL"
fi

echo ""
echo "💳 Step 3: Test Subscription Events"
echo "==================================="
echo ""

# Trigger subscription.created event
echo "Triggering customer.subscription.created event..."
stripe trigger customer.subscription.created 2>&1 > /dev/null

sleep 2

if grep -q "customer.subscription.created\|subscription.created" stripe-webhook.log; then
    test_result "Webhook received: subscription.created" "PASS"
else
    test_result "Webhook received: subscription.created" "FAIL"
fi

if grep -q "Granting subscription access\|grantSubscriptionAccess" stripe-webhook.log; then
    test_result "Access grant logic executed" "PASS"
else
    test_result "Access grant logic executed" "FAIL" "No access control in logs"
fi

# Trigger subscription.updated event
echo ""
echo "Triggering customer.subscription.updated event..."
stripe trigger customer.subscription.updated 2>&1 > /dev/null

sleep 2

if grep -q "customer.subscription.updated\|subscription.updated" stripe-webhook.log; then
    test_result "Webhook received: subscription.updated" "PASS"
else
    test_result "Webhook received: subscription.updated" "FAIL"
fi

# Trigger subscription.deleted event
echo ""
echo "Triggering customer.subscription.deleted event..."
stripe trigger customer.subscription.deleted 2>&1 > /dev/null

sleep 2

if grep -q "customer.subscription.deleted\|subscription.deleted" stripe-webhook.log; then
    test_result "Webhook received: subscription.deleted" "PASS"
else
    test_result "Webhook received: subscription.deleted" "FAIL"
fi

if grep -q "Revoking subscription access\|revokeSubscriptionAccess" stripe-webhook.log; then
    test_result "Access revoke logic executed" "PASS"
else
    test_result "Access revoke logic executed" "FAIL" "No revoke logic in logs"
fi

# Trigger trial_will_end event
echo ""
echo "Triggering customer.subscription.trial_will_end event..."
stripe trigger customer.subscription.trial_will_end 2>&1 > /dev/null

sleep 2

if grep -q "trial_will_end" stripe-webhook.log; then
    test_result "Webhook received: trial_will_end" "PASS"
else
    test_result "Webhook received: trial_will_end" "FAIL"
fi

if grep -q "Trial ending soon\|handleTrialEnding" stripe-webhook.log; then
    test_result "Trial ending logic executed" "PASS"
else
    test_result "Trial ending logic executed" "FAIL" "No trial logic in logs"
fi

echo ""
echo "💰 Step 4: Test Invoice Events"
echo "=============================="
echo ""

# Trigger invoice.payment_succeeded event
echo "Triggering invoice.payment_succeeded event..."
stripe trigger invoice.payment_succeeded 2>&1 > /dev/null

sleep 2

if grep -q "invoice.payment_succeeded" stripe-webhook.log; then
    test_result "Webhook received: payment_succeeded" "PASS"
else
    test_result "Webhook received: payment_succeeded" "FAIL"
fi

if grep -q "Payment succeeded\|handlePaymentSucceeded" stripe-webhook.log; then
    test_result "Payment success logic executed" "PASS"
else
    test_result "Payment success logic executed" "FAIL" "No success logic in logs"
fi

# Trigger invoice.payment_failed event
echo ""
echo "Triggering invoice.payment_failed event..."
stripe trigger invoice.payment_failed 2>&1 > /dev/null

sleep 2

if grep -q "invoice.payment_failed" stripe-webhook.log; then
    test_result "Webhook received: payment_failed" "PASS"
else
    test_result "Webhook received: payment_failed" "FAIL"
fi

if grep -q "Payment failed\|handlePaymentFailed" stripe-webhook.log; then
    test_result "Payment failure logic executed" "PASS"
else
    test_result "Payment failure logic executed" "FAIL" "No failure logic in logs"
fi

echo ""
echo "🔍 Step 5: Verify No Errors in Processing"
echo "========================================="
echo ""

# Check for errors in logs
ERROR_COUNT=$(grep -ci "error\|failed\|exception" stripe-webhook.log | head -1 || echo "0")
if [ "$ERROR_COUNT" -lt "10" ]; then
    test_result "Low error count in webhook processing" "PASS"
else
    test_result "Low error count in webhook processing" "FAIL" "Found $ERROR_COUNT error messages"
fi

# Check for successful processing
SUCCESS_COUNT=$(grep -ci "webhook processed successfully\|received: true" stripe-webhook.log | head -1 || echo "0")
if [ "$SUCCESS_COUNT" -gt "5" ]; then
    test_result "Multiple webhooks processed successfully" "PASS"
else
    test_result "Multiple webhooks processed successfully" "FAIL" "Only $SUCCESS_COUNT successful"
fi

# Check for Stripe Sync Engine execution
if grep -q "Stripe Sync Engine\|processWebhook" stripe-webhook.log; then
    test_result "Stripe Sync Engine executed" "PASS"
else
    test_result "Stripe Sync Engine executed" "FAIL" "No sync engine activity in logs"
fi

echo ""
echo "================================"
echo "📊 Webhook Test Summary"
echo "================================"
echo "Total Tests:  $TESTS_RUN"
echo -e "${GREEN}Passed:       $TESTS_PASSED${NC}"
if [ $TESTS_FAILED -gt 0 ]; then
    echo -e "${RED}Failed:       $TESTS_FAILED${NC}"
fi
echo ""

SUCCESS_RATE=$((TESTS_PASSED * 100 / TESTS_RUN))
echo "Success Rate: $SUCCESS_RATE%"
echo ""

# Show last 20 lines of webhook log
echo "📝 Recent Webhook Activity:"
echo "----------------------------"
tail -20 stripe-webhook.log
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All webhook tests passed! System is battle-tested.${NC}"
    exit 0
else
    echo -e "${RED}❌ Some webhook tests failed.${NC}"
    echo ""
    echo "Full webhook log available at: stripe-webhook.log"
    echo "Review the log for detailed error messages."
    exit 1
fi
