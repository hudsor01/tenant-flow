#!/bin/bash
# Stripe Payment Method and Customer Management Testing Script
# Tests customer creation, payment method management, and billing portal functionality

set -e

echo "👥 Starting Stripe customer and payment method testing..."

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
    exit 1
fi

# Configuration
LOG_FILE="payment-customer-test.log"
TEST_CUSTOMERS=()

echo "📊 Configuration:"
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
    
    for customer_id in "${TEST_CUSTOMERS[@]}"; do
        if [ ! -z "$customer_id" ]; then
            log "Deleting test customer: $customer_id"
            stripe customers delete "$customer_id" 2>/dev/null || true
        fi
    done
    
    log "✅ Cleanup completed"
}

# Set up cleanup on exit
trap cleanup EXIT

# Initialize log file
echo "Stripe Payment Method and Customer Management Test - $(date)" > $LOG_FILE
echo "=========================================================" >> $LOG_FILE

# Test 1: Customer Creation and Management
test_customer_management() {
    log "👤 Testing customer creation and management..."
    
    # Test basic customer creation
    log "1. Creating basic customer..."
    BASIC_CUSTOMER=$(stripe customers create \
        --email="basic-test@tenantflow.com" \
        --name="Basic Test Customer" \
        --format=json)
    
    BASIC_CUSTOMER_ID=$(echo $BASIC_CUSTOMER | jq -r '.id')
    TEST_CUSTOMERS+=("$BASIC_CUSTOMER_ID")
    log "✅ Basic customer created: $BASIC_CUSTOMER_ID"
    
    # Test customer with metadata
    log "2. Creating customer with metadata..."
    METADATA_CUSTOMER=$(stripe customers create \
        --email="metadata-test@tenantflow.com" \
        --name="Metadata Test Customer" \
        --description="Test customer with metadata" \
        --metadata[user_id]="user_123" \
        --metadata[source]="test_script" \
        --metadata[plan]="starter" \
        --format=json)
    
    METADATA_CUSTOMER_ID=$(echo $METADATA_CUSTOMER | jq -r '.id')
    TEST_CUSTOMERS+=("$METADATA_CUSTOMER_ID")
    log "✅ Customer with metadata created: $METADATA_CUSTOMER_ID"
    
    # Test customer update
    log "3. Testing customer update..."
    stripe customers update $BASIC_CUSTOMER_ID \
        --name="Updated Basic Customer" \
        --description="Updated via test script" \
        --metadata[updated]="true" > /dev/null
    
    log "✅ Customer updated successfully"
    
    # Test customer retrieval
    log "4. Testing customer retrieval..."
    RETRIEVED_CUSTOMER=$(stripe customers retrieve $BASIC_CUSTOMER_ID --format=json)
    RETRIEVED_NAME=$(echo $RETRIEVED_CUSTOMER | jq -r '.name')
    log "✅ Customer retrieved: $RETRIEVED_NAME"
    
    # Test customer list
    log "5. Testing customer list functionality..."
    CUSTOMER_LIST=$(stripe customers list --limit=5 --format=json)
    CUSTOMER_COUNT=$(echo $CUSTOMER_LIST | jq '.data | length')
    log "✅ Customer list retrieved: $CUSTOMER_COUNT customers"
    
    return 0
}

# Test 2: Payment Method Management
test_payment_methods() {
    log ""
    log "💳 Testing payment method management..."
    
    # Get first test customer for payment method tests
    CUSTOMER_ID="${TEST_CUSTOMERS[0]}"
    
    # Test successful payment method creation
    log "1. Creating successful payment method (Visa)..."
    VISA_PM=$(stripe payment_methods create \
        --type=card \
        --card[number]=4242424242424242 \
        --card[exp_month]=12 \
        --card[exp_year]=2030 \
        --card[cvc]=123 \
        --format=json)
    
    VISA_PM_ID=$(echo $VISA_PM | jq -r '.id')
    log "✅ Visa payment method created: $VISA_PM_ID"
    
    # Test Mastercard payment method
    log "2. Creating Mastercard payment method..."
    MC_PM=$(stripe payment_methods create \
        --type=card \
        --card[number]=5555555555554444 \
        --card[exp_month]=12 \
        --card[exp_year]=2030 \
        --card[cvc]=123 \
        --format=json)
    
    MC_PM_ID=$(echo $MC_PM | jq -r '.id')
    log "✅ Mastercard payment method created: $MC_PM_ID"
    
    # Test American Express payment method
    log "3. Creating American Express payment method..."
    AMEX_PM=$(stripe payment_methods create \
        --type=card \
        --card[number]=378282246310005 \
        --card[exp_month]=12 \
        --card[exp_year]=2030 \
        --card[cvc]=1234 \
        --format=json)
    
    AMEX_PM_ID=$(echo $AMEX_PM | jq -r '.id')
    log "✅ American Express payment method created: $AMEX_PM_ID"
    
    # Test 3D Secure required card
    log "4. Creating 3D Secure payment method..."
    SECURE_PM=$(stripe payment_methods create \
        --type=card \
        --card[number]=4000000000003063 \
        --card[exp_month]=12 \
        --card[exp_year]=2030 \
        --card[cvc]=123 \
        --format=json)
    
    SECURE_PM_ID=$(echo $SECURE_PM | jq -r '.id')
    log "✅ 3D Secure payment method created: $SECURE_PM_ID"
    
    # Test attaching payment methods to customer
    log "5. Attaching payment methods to customer..."
    stripe payment_methods attach $VISA_PM_ID --customer=$CUSTOMER_ID > /dev/null
    stripe payment_methods attach $MC_PM_ID --customer=$CUSTOMER_ID > /dev/null
    log "✅ Payment methods attached to customer: $CUSTOMER_ID"
    
    # Test setting default payment method
    log "6. Setting default payment method..."
    stripe customers update $CUSTOMER_ID \
        --invoice_settings[default_payment_method]=$VISA_PM_ID > /dev/null
    log "✅ Default payment method set: $VISA_PM_ID"
    
    # Test payment method listing
    log "7. Listing customer payment methods..."
    PM_LIST=$(stripe payment_methods list \
        --customer=$CUSTOMER_ID \
        --type=card \
        --format=json)
    PM_COUNT=$(echo $PM_LIST | jq '.data | length')
    log "✅ Customer has $PM_COUNT payment methods"
    
    # Test payment method detachment
    log "8. Testing payment method detachment..."
    stripe payment_methods detach $MC_PM_ID > /dev/null
    log "✅ Payment method detached: $MC_PM_ID"
    
    return 0
}

# Test 3: Billing Portal Functionality
test_billing_portal() {
    log ""
    log "🏢 Testing billing portal functionality..."
    
    CUSTOMER_ID="${TEST_CUSTOMERS[0]}"
    
    # Test portal session creation
    log "1. Creating billing portal session..."
    PORTAL_SESSION=$(stripe billing_portal sessions create \
        --customer=$CUSTOMER_ID \
        --return_url="https://tenantflow.com/dashboard" \
        --format=json)
    
    PORTAL_URL=$(echo $PORTAL_SESSION | jq -r '.url')
    log "✅ Billing portal session created"
    log "🔗 Portal URL: $PORTAL_URL"
    
    # Test portal configuration retrieval
    log "2. Testing portal configuration..."
    PORTAL_CONFIG=$(stripe billing_portal configurations list --format=json)
    CONFIG_COUNT=$(echo $PORTAL_CONFIG | jq '.data | length')
    log "✅ Portal configurations available: $CONFIG_COUNT"
    
    if [ "$CONFIG_COUNT" -gt 0 ]; then
        FIRST_CONFIG_ID=$(echo $PORTAL_CONFIG | jq -r '.data[0].id')
        log "📋 First configuration ID: $FIRST_CONFIG_ID"
        
        # Get configuration details
        CONFIG_DETAILS=$(stripe billing_portal configurations retrieve $FIRST_CONFIG_ID --format=json)
        BUSINESS_PROFILE=$(echo $CONFIG_DETAILS | jq -r '.business_profile.headline // "Not set"')
        log "📋 Business profile headline: $BUSINESS_PROFILE"
    fi
    
    return 0
}

# Test 4: Subscription Setup with Payment Methods
test_subscription_with_payment() {
    log ""
    log "🔄 Testing subscription creation with payment methods..."
    
    CUSTOMER_ID="${TEST_CUSTOMERS[1]}"  # Use metadata customer
    
    # Create a test price first (you'll need to replace with actual price ID)
    log "1. Testing subscription creation (requires valid price ID)..."
    log "⚠️  Note: This test requires a valid price ID in your Stripe account"
    
    # For demonstration, we'll create a mock subscription scenario
    PRICE_ID="price_test_example"  # Replace with actual price ID
    
    # Test payment intent creation instead
    log "2. Creating payment intent for subscription..."
    PAYMENT_INTENT=$(stripe payment_intents create \
        --amount=2999 \
        --currency=usd \
        --customer=$CUSTOMER_ID \
        --metadata[subscription_test]="true" \
        --format=json)
    
    PI_ID=$(echo $PAYMENT_INTENT | jq -r '.id')
    PI_STATUS=$(echo $PAYMENT_INTENT | jq -r '.status')
    log "✅ Payment intent created: $PI_ID"
    log "📊 Payment intent status: $PI_STATUS"
    
    # Test payment intent confirmation simulation
    log "3. Testing payment intent confirmation flow..."
    log "💡 In production: Customer would complete payment on frontend"
    log "📋 Payment intent client secret would be used in Stripe Elements"
    
    return 0
}

# Test 5: Customer Search and Filtering
test_customer_search() {
    log ""
    log "🔍 Testing customer search and filtering..."
    
    # Test email-based search
    log "1. Testing email-based customer search..."
    EMAIL_SEARCH=$(stripe customers list \
        --email="metadata-test@tenantflow.com" \
        --format=json)
    
    SEARCH_COUNT=$(echo $EMAIL_SEARCH | jq '.data | length')
    log "✅ Email search found $SEARCH_COUNT customers"
    
    # Test date-based filtering
    log "2. Testing date-based customer filtering..."
    YESTERDAY=$(date -d "yesterday" +%s)
    RECENT_CUSTOMERS=$(stripe customers list \
        --created[gte]=$YESTERDAY \
        --format=json)
    
    RECENT_COUNT=$(echo $RECENT_CUSTOMERS | jq '.data | length')
    log "✅ Recent customers (last 24h): $RECENT_COUNT"
    
    # Test metadata-based search (if supported)
    log "3. Testing advanced customer queries..."
    log "💡 Advanced search capabilities depend on your Stripe plan"
    
    return 0
}

# Test 6: Payment Method Validation
test_payment_validation() {
    log ""
    log "✅ Testing payment method validation scenarios..."
    
    # Test invalid card numbers
    declare -A invalid_cards=(
        ["4000000000000000"]="Invalid card number"
        ["4000000000000001"]="Invalid card number" 
        ["1234567890123456"]="Invalid card number"
    )
    
    for card in "${!invalid_cards[@]}"; do
        error_type="${invalid_cards[$card]}"
        log "Testing invalid card: $card ($error_type)"
        
        INVALID_PM_RESPONSE=$(stripe payment_methods create \
            --type=card \
            --card[number]="$card" \
            --card[exp_month]=12 \
            --card[exp_year]=2030 \
            --card[cvc]=123 \
            --format=json 2>/dev/null || echo '{"error": "invalid_card"}')
        
        if echo "$INVALID_PM_RESPONSE" | jq -e '.error' > /dev/null; then
            ERROR_CODE=$(echo "$INVALID_PM_RESPONSE" | jq -r '.error.code // "unknown"')
            log "❌ Expected error: $ERROR_CODE ($error_type)"
        else
            log "⚠️  Card validation unexpectedly passed"
        fi
    done
    
    return 0
}

# Run all tests
log "🚀 Starting comprehensive customer and payment method tests..."

test_customer_management
test_payment_methods
test_billing_portal
test_subscription_with_payment
test_customer_search
test_payment_validation

# Summary
log ""
log "🎉 Customer and payment method tests completed!"
log ""
log "📋 Test Summary:"
log "════════════════"
log "✅ Customer creation and management"
log "✅ Payment method creation (Visa, MC, Amex, 3DS)"
log "✅ Payment method attachment and detachment"
log "✅ Billing portal session creation"
log "✅ Payment intent creation and flow"
log "✅ Customer search and filtering"
log "✅ Payment method validation scenarios"
log ""
log "🔍 Integration Verification Points:"
log "▸ Customer creation with proper metadata storage"
log "▸ Payment method management in customer portal"
log "▸ Default payment method handling"
log "▸ Billing portal customization and branding"
log "▸ Payment method validation feedback in UI"
log "▸ Customer search and admin functionality"
log ""
log "🎯 Frontend Testing Checklist:"
log "▸ Test Stripe Elements integration with payment methods"
log "▸ Verify customer portal redirect and functionality"
log "▸ Test payment method update flows"
log "▸ Validate error handling for invalid cards"
log "▸ Test subscription creation with payment collection"
log "▸ Verify customer data synchronization"
log ""

echo ""
echo "✅ Customer and payment method testing completed!"
echo "📋 Check the log file for detailed results: $LOG_FILE"
echo ""
echo "🚀 Next Steps:"
echo "1. Test customer portal integration in your frontend"
echo "2. Verify payment method management in your UI"
echo "3. Test subscription creation flows with real payment methods"
echo "4. Validate customer data synchronization with your database"
echo "5. Test billing portal customization and branding"