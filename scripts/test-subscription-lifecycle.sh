#!/bin/bash
# Stripe Subscription Lifecycle Testing Script
# Tests complete subscription lifecycle using test clocks following official Stripe best practices

set -e

echo "🔄 Starting Stripe subscription lifecycle tests..."

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo "❌ Stripe CLI is not installed. Please install it first:"
    echo "   https://stripe.com/docs/stripe-cli"
    exit 1
fi

# Check if user is logged in
if ! stripe config --list &> /dev/null; then
    echo "❌ Please log in to Stripe CLI first:"
    echo "   stripe login"
    exit 1
fi

# Check if jq is installed for JSON parsing
if ! command -v jq &> /dev/null; then
    echo "❌ jq is required for JSON parsing. Please install it first:"
    echo "   macOS: brew install jq"
    echo "   Ubuntu: sudo apt-get install jq"
    exit 1
fi

# Configuration
TEST_EMAIL="lifecycle-test@tenantflow.app"
TEST_CUSTOMER_NAME="Lifecycle Test Customer"
PRICE_ID="price_1234567890"  # Replace with your actual test price ID
LOG_FILE="subscription-lifecycle-test.log"

echo "📊 Configuration:"
echo "   Test Email: $TEST_EMAIL"
echo "   Test Customer: $TEST_CUSTOMER_NAME" 
echo "   Price ID: $PRICE_ID"
echo "   Log File: $LOG_FILE"
echo ""

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

# Function to cleanup test resources
cleanup() {
    echo ""
    log "🧹 Cleaning up test resources..."
    
    # Delete test clock if it exists
    if [ ! -z "$CLOCK_ID" ]; then
        log "Deleting test clock: $CLOCK_ID"
        stripe test-clocks delete $CLOCK_ID 2>/dev/null || true
    fi
    
    # Delete test customer if it exists
    if [ ! -z "$CUSTOMER_ID" ]; then
        log "Deleting test customer: $CUSTOMER_ID"
        stripe customers delete $CUSTOMER_ID 2>/dev/null || true
    fi
    
    log "✅ Cleanup completed"
}

# Set up cleanup on exit
trap cleanup EXIT

# Initialize log file
echo "Stripe Subscription Lifecycle Test - $(date)" > $LOG_FILE
echo "================================================" >> $LOG_FILE

# Step 1: Create test clock
log "⏰ Creating test clock (starting at 2024-01-01)..."
CLOCK_RESPONSE=$(stripe test-clocks create \
    --frozen-time=2024-01-01T00:00:00Z \
    --name="lifecycle-test-$(date +%s)" \
    --format=json)

CLOCK_ID=$(echo $CLOCK_RESPONSE | jq -r '.id')
if [ "$CLOCK_ID" = "null" ] || [ -z "$CLOCK_ID" ]; then
    log "❌ Failed to create test clock"
    exit 1
fi

log "✅ Test clock created: $CLOCK_ID"

# Step 2: Create test customer
log "👤 Creating test customer..."
CUSTOMER_RESPONSE=$(stripe customers create \
    --email="$TEST_EMAIL" \
    --name="$TEST_CUSTOMER_NAME" \
    --metadata[test_scenario]="lifecycle_test" \
    --metadata[test_clock_id]="$CLOCK_ID" \
    --test_clock="$CLOCK_ID" \
    --format=json)

CUSTOMER_ID=$(echo $CUSTOMER_RESPONSE | jq -r '.id')
if [ "$CUSTOMER_ID" = "null" ] || [ -z "$CUSTOMER_ID" ]; then
    log "❌ Failed to create test customer"
    exit 1
fi

log "✅ Test customer created: $CUSTOMER_ID"

# Step 3: Create subscription with 7-day trial
log "🆕 Creating subscription with 7-day trial..."
SUBSCRIPTION_RESPONSE=$(stripe subscriptions create \
    --customer="$CUSTOMER_ID" \
    --items[0][price]="$PRICE_ID" \
    --trial_period_days=7 \
    --metadata[test_scenario]="lifecycle_test" \
    --test_clock="$CLOCK_ID" \
    --format=json)

SUBSCRIPTION_ID=$(echo $SUBSCRIPTION_RESPONSE | jq -r '.id')
if [ "$SUBSCRIPTION_ID" = "null" ] || [ -z "$SUBSCRIPTION_ID" ]; then
    log "❌ Failed to create test subscription"
    exit 1
fi

TRIAL_END=$(echo $SUBSCRIPTION_RESPONSE | jq -r '.trial_end')
log "✅ Subscription created: $SUBSCRIPTION_ID"
log "📅 Trial ends at: $(date -d @$TRIAL_END)"

# Step 4: Test trial warning (3 days before trial end)
log ""
log "⚠️  Testing trial warning (3 days before trial end)..."
log "⏰ Advancing test clock to 2024-01-05T00:00:00Z..."

stripe test-clocks advance \
    --test-clock="$CLOCK_ID" \
    --frozen-time=2024-01-05T00:00:00Z > /dev/null

log "✅ Clock advanced - trial warning period should trigger"
log "🎯 Expected webhook events:"
log "   - customer.subscription.trial_will_end"

# Wait and check subscription status
sleep 2
SUBSCRIPTION_STATUS=$(stripe subscriptions retrieve $SUBSCRIPTION_ID --format=json | jq -r '.status')
log "📊 Subscription status: $SUBSCRIPTION_STATUS"

# Step 5: Test trial end and first billing
log ""
log "🔚 Testing trial end and first billing cycle..."
log "⏰ Advancing test clock to 2024-01-08T00:00:00Z..."

stripe test-clocks advance \
    --test-clock="$CLOCK_ID" \
    --frozen-time=2024-01-08T00:00:00Z > /dev/null

log "✅ Clock advanced - trial should end and billing should start"
log "🎯 Expected webhook events:"
log "   - customer.subscription.updated (trial_end)"
log "   - invoice.created (first billing cycle)"
log "   - invoice.payment_succeeded (if payment method valid)"

# Wait and check subscription status
sleep 3
SUBSCRIPTION_STATUS=$(stripe subscriptions retrieve $SUBSCRIPTION_ID --format=json | jq -r '.status')
CURRENT_PERIOD_END=$(stripe subscriptions retrieve $SUBSCRIPTION_ID --format=json | jq -r '.current_period_end')
log "📊 Subscription status: $SUBSCRIPTION_STATUS"
log "📅 Current period ends: $(date -d @$CURRENT_PERIOD_END)"

# Step 6: Test subscription renewal
log ""
log "🔄 Testing subscription renewal (next billing cycle)..."
log "⏰ Advancing test clock to 2024-02-08T00:00:00Z..."

stripe test-clocks advance \
    --test-clock="$CLOCK_ID" \
    --frozen-time=2024-02-08T00:00:00Z > /dev/null

log "✅ Clock advanced - subscription renewal should occur"
log "🎯 Expected webhook events:"
log "   - invoice.created (renewal invoice)"
log "   - invoice.payment_succeeded (renewal payment)"
log "   - customer.subscription.updated (new period)"

# Wait and check subscription status
sleep 3
SUBSCRIPTION_STATUS=$(stripe subscriptions retrieve $SUBSCRIPTION_ID --format=json | jq -r '.status')
NEW_PERIOD_END=$(stripe subscriptions retrieve $SUBSCRIPTION_ID --format=json | jq -r '.current_period_end')
log "📊 Subscription status: $SUBSCRIPTION_STATUS"
log "📅 New period ends: $(date -d @$NEW_PERIOD_END)"

# Step 7: Test subscription modification (plan change)
log ""
log "🔧 Testing subscription modification..."
log "🎯 Updating subscription items to test proration..."

# Note: This requires a second price ID for testing
ORIGINAL_ITEMS=$(stripe subscriptions retrieve $SUBSCRIPTION_ID --format=json | jq '.items.data[0]')
ORIGINAL_PRICE_ID=$(echo $ORIGINAL_ITEMS | jq -r '.price.id')

log "📋 Current subscription details:"
log "   Original Price ID: $ORIGINAL_PRICE_ID"
log "   Original Quantity: $(echo $ORIGINAL_ITEMS | jq -r '.quantity')"

# We'll test cancel_at_period_end instead since we don't have a second price
log "🚫 Testing cancel at period end..."
stripe subscriptions update $SUBSCRIPTION_ID \
    --cancel_at_period_end=true > /dev/null

log "✅ Subscription set to cancel at period end"
log "🎯 Expected webhook events:"
log "   - customer.subscription.updated (cancel_at_period_end=true)"

# Check cancellation status
CANCEL_STATUS=$(stripe subscriptions retrieve $SUBSCRIPTION_ID --format=json | jq -r '.cancel_at_period_end')
log "📊 Cancel at period end: $CANCEL_STATUS"

# Step 8: Test immediate cancellation
log ""
log "🛑 Testing immediate subscription cancellation..."

stripe subscriptions cancel $SUBSCRIPTION_ID > /dev/null

log "✅ Subscription cancelled immediately"
log "🎯 Expected webhook events:"
log "   - customer.subscription.deleted"

# Final status check
sleep 2
FINAL_STATUS=$(stripe subscriptions retrieve $SUBSCRIPTION_ID --format=json | jq -r '.status')
CANCELED_AT=$(stripe subscriptions retrieve $SUBSCRIPTION_ID --format=json | jq -r '.canceled_at')
log "📊 Final subscription status: $FINAL_STATUS"
log "📅 Canceled at: $(date -d @$CANCELED_AT)"

# Summary
log ""
log "🎉 Subscription lifecycle test completed successfully!"
log ""
log "📋 Test Summary:"
log "════════════════"
log "✅ Created test clock: $CLOCK_ID"
log "✅ Created test customer: $CUSTOMER_ID"
log "✅ Created subscription with trial: $SUBSCRIPTION_ID"
log "✅ Tested trial warning period (day 5/7)"
log "✅ Tested trial end and first billing (day 8)"
log "✅ Tested subscription renewal (day 38)"
log "✅ Tested subscription modification (cancel_at_period_end)"
log "✅ Tested immediate cancellation"
log ""
log "🔍 Webhook Events to Verify in Your Application:"
log "▸ customer.subscription.trial_will_end"
log "▸ customer.subscription.updated (multiple scenarios)"
log "▸ customer.subscription.deleted"
log "▸ invoice.created (trial end + renewal)"
log "▸ invoice.payment_succeeded (if payment methods valid)"
log ""
log "📊 Monitor your webhook endpoint and application logs to verify proper handling"
log "📝 Review the subscription object changes in Stripe Dashboard"
log ""
log "⚡ Advanced Testing Recommendations:"
log "▸ Test with failing payment methods (use test card 4000000000000002)"
log "▸ Test with 3D Secure required cards (use test card 4000000000003063)"
log "▸ Test subscription updates with different proration behaviors"
log "▸ Test customer portal session creation and usage"
log ""

echo ""
echo "✅ Subscription lifecycle testing completed!"
echo "📋 Check the log file for detailed results: $LOG_FILE"
echo ""
echo "🚀 Next Steps:"
echo "1. Review webhook events in your application logs"
echo "2. Verify database state changes match expected subscription lifecycle"
echo "3. Test customer-facing subscription management flows"
echo "4. Validate email notifications and customer communications"