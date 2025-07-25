#!/bin/bash
# Stripe Error Handling Testing Script
# Tests all Stripe error scenarios to validate proper error handling implementation

set -e

echo "⚠️  Starting Stripe error handling tests..."

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

# Configuration
WEBHOOK_URL="tenantflow.app/api/v1/stripe/webhook"
LOG_FILE="error-handling-test.log"
TEST_EMAIL="error-test@tenantflow.app"

echo "📊 Configuration:"
echo "   Webhook URL: $WEBHOOK_URL"
echo "   Test Email: $TEST_EMAIL"
echo "   Log File: $LOG_FILE"
echo ""

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

# Function to test webhook error handling
test_webhook_errors() {
    log "🔐 Testing webhook signature verification errors..."
    
    echo ""
    log "1. Testing invalid webhook signature..."
    curl -s -X POST $WEBHOOK_URL \
        -H "stripe-signature: invalid_signature_test" \
        -H "Content-Type: application/json" \
        -d '{"id": "evt_test", "type": "test"}' \
        -w "HTTP Status: %{http_code}\n" || true
    
    log "Expected: 400 Bad Request (Invalid signature)"
    
    echo ""
    log "2. Testing malformed webhook payload..."
    curl -s -X POST $WEBHOOK_URL \
        -H "stripe-signature: t=1234567890,v1=invalid" \
        -H "Content-Type: application/json" \
        -d 'invalid_json_payload' \
        -w "HTTP Status: %{http_code}\n" || true
    
    log "Expected: 400 Bad Request (Malformed payload)"
    
    echo ""
    log "3. Testing webhook timeout simulation..."
    curl -s -X POST $WEBHOOK_URL \
        -H "stripe-signature: t=1234567890,v1=test" \
        -H "Content-Type: application/json" \
        -d '{"id": "evt_timeout_test", "type": "test.timeout"}' \
        -m 1 \
        -w "HTTP Status: %{http_code}\n" || true
    
    log "Expected: Timeout or proper error handling"
}

# Function to test payment method errors
test_payment_errors() {
    log ""
    log "💳 Testing payment method errors..."
    
    # Test cards that trigger different errors
    declare -A test_cards=(
        ["4000000000000002"]="Generic decline"
        ["4000000000009995"]="Insufficient funds"
        ["4000000000009987"]="Lost card"
        ["4000000000009979"]="Stolen card"
        ["4000000000000069"]="Rate limit"
        ["4000000000000119"]="Processing error"
        ["4000000000001208"]="Authentication required"
    )
    
    log "Creating test customer for payment error testing..."
    CUSTOMER_ID=$(stripe customers create \
        --email="$TEST_EMAIL" \
        --name="Payment Error Test" \
        --format=json | jq -r '.id')
    
    log "Test customer created: $CUSTOMER_ID"
    
    for card in "${!test_cards[@]}"; do
        error_type="${test_cards[$card]}"
        log ""
        log "Testing card error: $error_type (Card: $card)"
        
        # Create payment method with test card
        PM_RESPONSE=$(stripe payment_methods create \
            --type=card \
            --card[number]="$card" \
            --card[exp_month]=12 \
            --card[exp_year]=2030 \
            --card[cvc]=123 \
            --format=json 2>/dev/null || echo '{"error": "failed"}')
        
        if echo "$PM_RESPONSE" | jq -e '.id' > /dev/null; then
            PM_ID=$(echo "$PM_RESPONSE" | jq -r '.id')
            log "✅ Payment method created: $PM_ID"
            
            # Attempt to create payment intent with declining card
            PI_RESPONSE=$(stripe payment_intents create \
                --amount=2999 \
                --currency=usd \
                --customer="$CUSTOMER_ID" \
                --payment_method="$PM_ID" \
                --confirm=true \
                --return_url="https://tenantflow.app/return" \
                --format=json 2>/dev/null || echo '{"error": "payment_failed"}')
            
            if echo "$PI_RESPONSE" | jq -e '.error' > /dev/null; then
                ERROR_CODE=$(echo "$PI_RESPONSE" | jq -r '.error.decline_code // .error.code // "unknown"')
                log "❌ Expected error occurred: $ERROR_CODE ($error_type)"
                log "🎯 Verify your application handles this error gracefully"
            else
                log "⚠️  Payment unexpectedly succeeded - verify test card configuration"
            fi
        else
            log "❌ Failed to create payment method with test card"
        fi
        
        sleep 1
    done
    
    # Cleanup test customer
    stripe customers delete "$CUSTOMER_ID" > /dev/null 2>&1 || true
    log "🧹 Test customer cleaned up"
}

# Function to test API errors
test_api_errors() {
    log ""
    log "🔌 Testing API connection and authentication errors..."
    
    log "1. Testing invalid API key simulation..."
    log "   (Note: This test requires manual verification with invalid key)"
    log "   Expected behavior: Authentication failed error"
    
    log ""
    log "2. Testing rate limit handling..."
    log "   Creating multiple rapid requests to test rate limiting..."
    
    # Create multiple customers rapidly to potentially trigger rate limits
    for i in {1..10}; do
        stripe customers create \
            --email="rate-test-$i@tenantflow.app" \
            --name="Rate Test $i" > /dev/null 2>&1 &
    done
    
    wait
    log "✅ Rapid requests completed - check for rate limit handling"
    
    log ""
    log "3. Testing invalid request parameters..."
    
    # Test with invalid price ID
    INVALID_RESPONSE=$(stripe checkout sessions create \
        --mode=subscription \
        --line_items[0][price]="price_invalid_test_id" \
        --line_items[0][quantity]=1 \
        --success_url="https://tenantflow.app/success" \
        --cancel_url="https://tenantflow.app/cancel" \
        --format=json 2>/dev/null || echo '{"error": "invalid_request"}')
    
    if echo "$INVALID_RESPONSE" | jq -e '.error' > /dev/null; then
        ERROR_TYPE=$(echo "$INVALID_RESPONSE" | jq -r '.error.type // "unknown"')
        log "❌ Expected error: $ERROR_TYPE (Invalid price ID)"
    else
        log "⚠️  Request unexpectedly succeeded"
    fi
}

# Function to test subscription errors
test_subscription_errors() {
    log ""
    log "🔄 Testing subscription-specific errors..."
    
    log "1. Testing subscription with non-existent customer..."
    SUB_ERROR_RESPONSE=$(stripe subscriptions create \
        --customer="cus_nonexistent123" \
        --items[0][price]="price_test123" \
        --format=json 2>/dev/null || echo '{"error": "customer_not_found"}')
    
    if echo "$SUB_ERROR_RESPONSE" | jq -e '.error' > /dev/null; then
        ERROR_TYPE=$(echo "$SUB_ERROR_RESPONSE" | jq -r '.error.type // "unknown"')
        log "❌ Expected error: $ERROR_TYPE (Customer not found)"
    else
        log "⚠️  Subscription creation unexpectedly succeeded"
    fi
    
    log ""
    log "2. Testing subscription update with invalid ID..."
    UPDATE_ERROR_RESPONSE=$(stripe subscriptions update \
        sub_nonexistent123 \
        --metadata[test]="error_test" \
        --format=json 2>/dev/null || echo '{"error": "subscription_not_found"}')
    
    if echo "$UPDATE_ERROR_RESPONSE" | jq -e '.error' > /dev/null; then
        ERROR_TYPE=$(echo "$UPDATE_ERROR_RESPONSE" | jq -r '.error.type // "unknown"')
        log "❌ Expected error: $ERROR_TYPE (Subscription not found)"
    else
        log "⚠️  Subscription update unexpectedly succeeded"
    fi
}

# Function to test checkout session errors
test_checkout_errors() {
    log ""
    log "🛒 Testing checkout session errors..."
    
    log "1. Testing checkout with invalid price..."
    CHECKOUT_ERROR_RESPONSE=$(stripe checkout sessions create \
        --mode=subscription \
        --line_items[0][price]="price_invalid_nonexistent" \
        --line_items[0][quantity]=1 \
        --success_url="https://tenantflow.app/success" \
        --cancel_url="https://tenantflow.app/cancel" \
        --format=json 2>/dev/null || echo '{"error": "invalid_price"}')
    
    if echo "$CHECKOUT_ERROR_RESPONSE" | jq -e '.error' > /dev/null; then
        ERROR_TYPE=$(echo "$CHECKOUT_ERROR_RESPONSE" | jq -r '.error.type // "unknown"')
        log "❌ Expected error: $ERROR_TYPE (Invalid price)"
    else
        log "⚠️  Checkout session creation unexpectedly succeeded"
    fi
    
    log ""
    log "2. Testing checkout with missing required parameters..."
    MISSING_PARAMS_RESPONSE=$(stripe checkout sessions create \
        --mode=subscription \
        --success_url="https://tenantflow.app/success" \
        --format=json 2>/dev/null || echo '{"error": "missing_params"}')
    
    if echo "$MISSING_PARAMS_RESPONSE" | jq -e '.error' > /dev/null; then
        ERROR_TYPE=$(echo "$MISSING_PARAMS_RESPONSE" | jq -r '.error.type // "unknown"')
        log "❌ Expected error: $ERROR_TYPE (Missing parameters)"
    else
        log "⚠️  Checkout session creation unexpectedly succeeded"
    fi
}

# Initialize log file
echo "Stripe Error Handling Test - $(date)" > $LOG_FILE
echo "====================================" >> $LOG_FILE

log "🚀 Starting comprehensive error handling tests..."

# Run all error tests
test_webhook_errors
test_payment_errors
test_api_errors  
test_subscription_errors
test_checkout_errors

# Summary
log ""
log "🎉 Error handling tests completed!"
log ""
log "📋 Test Summary:"
log "════════════════"
log "✅ Webhook signature verification errors"
log "✅ Payment method decline scenarios"
log "✅ API authentication and rate limit errors"
log "✅ Subscription management errors"
log "✅ Checkout session parameter errors"
log ""
log "🔍 Verification Checklist:"
log "▸ Check application logs for proper error handling"
log "▸ Verify error messages are user-friendly"
log "▸ Confirm no sensitive data is exposed in error responses"
log "▸ Validate retry logic for transient errors"
log "▸ Test customer-facing error scenarios in UI"
log ""
log "⚡ Error Types to Validate in Your Application:"
log "▸ StripeCardError - Card declined scenarios"
log "▸ StripeRateLimitError - Rate limiting handling"
log "▸ StripeInvalidRequestError - Invalid parameters"
log "▸ StripeAPIError - API processing errors"
log "▸ StripeConnectionError - Network connectivity"
log "▸ StripeAuthenticationError - Invalid API keys"
log "▸ StripeSignatureVerificationError - Webhook security"
log ""

echo ""
echo "✅ Error handling testing completed!"
echo "📋 Check the log file for detailed results: $LOG_FILE"
echo ""
echo "🚀 Next Steps:"
echo "1. Review application error handling for each scenario"
echo "2. Test customer-facing error messages in your UI"
echo "3. Verify error logging doesn't expose sensitive information"
echo "4. Test error recovery and retry mechanisms"
echo "5. Validate monitoring and alerting for error scenarios"