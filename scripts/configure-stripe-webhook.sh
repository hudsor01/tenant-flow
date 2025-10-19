#!/bin/bash
set -e

# Configure Stripe Webhook Endpoint
# This script creates a webhook endpoint in Stripe for the Stripe Sync Engine

WEBHOOK_URL="${WEBHOOK_URL:-https://api.tenantflow.app/api/v1/webhooks/stripe-sync}"

if [ -z "$STRIPE_SECRET_KEY" ]; then
    echo "❌ STRIPE_SECRET_KEY environment variable is required"
    exit 1
fi

echo "🔧 Configuring Stripe Webhook Endpoint..."
echo "=========================================="
echo ""

# All events that Stripe Sync Engine needs
EVENTS=(
    "customer.created"
    "customer.updated"
    "customer.deleted"
    "customer.subscription.created"
    "customer.subscription.updated"
    "customer.subscription.deleted"
    "customer.subscription.paused"
    "customer.subscription.resumed"
    "customer.subscription.trial_will_end"
    "invoice.created"
    "invoice.updated"
    "invoice.deleted"
    "invoice.finalized"
    "invoice.paid"
    "invoice.payment_failed"
    "invoice.payment_succeeded"
    "payment_intent.created"
    "payment_intent.succeeded"
    "payment_intent.payment_failed"
    "payment_intent.canceled"
    "charge.succeeded"
    "charge.failed"
    "charge.refunded"
    "price.created"
    "price.updated"
    "price.deleted"
    "product.created"
    "product.updated"
    "product.deleted"
    "payment_method.attached"
    "payment_method.detached"
    "payment_method.updated"
    "setup_intent.created"
    "setup_intent.succeeded"
    "setup_intent.setup_failed"
    "checkout.session.completed"
    "checkout.session.expired"
    "charge.dispute.created"
    "charge.dispute.updated"
    "charge.dispute.closed"
    "charge.refund.updated"
    "credit_note.created"
    "credit_note.updated"
)

echo "📋 Checking for existing webhook endpoints..."

# List existing webhooks
EXISTING=$(curl -s https://api.stripe.com/v1/webhook_endpoints \
  -u "$STRIPE_SECRET_KEY:" \
  -G)

# Check if webhook already exists for this URL
WEBHOOK_ID=$(echo "$EXISTING" | grep -o "\"id\":\"we_[^\"]*\"" | grep -B 20 "$WEBHOOK_URL" | grep -o "we_[^\"]*" | head -1)

if [ -n "$WEBHOOK_ID" ]; then
    echo ""
    echo "✅ Webhook endpoint already exists!"
    echo "   ID: $WEBHOOK_ID"
    echo "   URL: $WEBHOOK_URL"
    echo ""
    echo "⚠️  IMPORTANT: Webhook secret cannot be retrieved after creation."
    echo "   If you need the secret, you must:"
    echo "   1. Delete this webhook: curl -X DELETE https://api.stripe.com/v1/webhook_endpoints/$WEBHOOK_ID -u \"\$STRIPE_SECRET_KEY:\""
    echo "   2. Re-run this script to create a new one"
    echo "   3. Copy the secret immediately"
    exit 0
fi

echo ""
echo "📝 Creating new webhook endpoint..."
echo "   URL: $WEBHOOK_URL"
echo "   Events: ${#EVENTS[@]} events"
echo ""

# Build curl command with all events
# Note: Using account's default API version (don't specify to use latest)
CURL_CMD="curl -s https://api.stripe.com/v1/webhook_endpoints -u \"\$STRIPE_SECRET_KEY:\""
CURL_CMD="$CURL_CMD -d \"url=$WEBHOOK_URL\""
CURL_CMD="$CURL_CMD -d \"description=TenantFlow Stripe Sync Engine - Production\""

for event in "${EVENTS[@]}"; do
    CURL_CMD="$CURL_CMD -d \"enabled_events[]=$event\""
done

# Create webhook endpoint
RESPONSE=$(eval "$CURL_CMD")

# Check if response contains an error
if echo "$RESPONSE" | grep -q '"error"'; then
    echo "❌ Failed to create webhook endpoint"
    echo ""
    echo "Response:"
    echo "$RESPONSE"
    exit 1
fi

# Extract webhook ID and secret
WEBHOOK_ID=$(echo "$RESPONSE" | grep -o '"id":"we_[^"]*"' | cut -d'"' -f4)
WEBHOOK_SECRET=$(echo "$RESPONSE" | grep -o '"secret":"whsec_[^"]*"' | cut -d'"' -f4)

if [ -z "$WEBHOOK_ID" ] || [ -z "$WEBHOOK_SECRET" ]; then
    echo "❌ Could not extract webhook ID or secret from response"
    echo ""
    echo "Response:"
    echo "$RESPONSE"
    exit 1
fi

echo "✅ Webhook endpoint created successfully!"
echo "   ID: $WEBHOOK_ID"
echo "   URL: $WEBHOOK_URL"
echo ""
echo "🔑 WEBHOOK SIGNING SECRET"
echo "========================================"
echo "$WEBHOOK_SECRET"
echo "========================================"
echo ""
echo "⚠️  CRITICAL: Add this secret to Doppler NOW!"
echo "   1. Go to: https://dashboard.doppler.com"
echo "   2. Select: TenantFlow > prd environment"
echo "   3. Add secret: STRIPE_WEBHOOK_SECRET_SYNC"
echo "   4. Paste the secret above"
echo "   5. Save changes"
echo ""
echo "✅ Webhook configuration complete!"
echo "   Backend will now receive all Stripe events."
echo ""
