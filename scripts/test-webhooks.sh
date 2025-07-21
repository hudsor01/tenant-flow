#!/bin/bash
# Stripe Webhook Testing Script
# Tests all critical webhook events for TenantFlow integration

set -e

echo "🚀 Starting Stripe webhook tests..."

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
WEBHOOK_URL="localhost:3002/api/v1/stripe/webhook"
LISTEN_LOG="webhook-test.log"

echo "📡 Starting webhook listener on $WEBHOOK_URL..."

# Start local webhook listener in background
stripe listen --forward-to $WEBHOOK_URL > $LISTEN_LOG 2>&1 &
LISTEN_PID=$!

# Function to cleanup on exit
cleanup() {
    echo "🧹 Cleaning up..."
    kill $LISTEN_PID 2>/dev/null || true
    rm -f $LISTEN_LOG
}
trap cleanup EXIT

# Wait for listener to start
echo "⏳ Waiting for webhook listener to start..."
sleep 5

# Check if listener started successfully
if ! ps -p $LISTEN_PID > /dev/null; then
    echo "❌ Failed to start webhook listener. Check the logs:"
    cat $LISTEN_LOG
    exit 1
fi

echo "✅ Webhook listener started successfully"

# Extract webhook signing secret from logs
WEBHOOK_SECRET=$(grep -o 'whsec_[a-zA-Z0-9]*' $LISTEN_LOG | head -1)
if [ -z "$WEBHOOK_SECRET" ]; then
    echo "❌ Could not extract webhook signing secret"
    exit 1
fi

echo "🔑 Webhook signing secret: $WEBHOOK_SECRET"
echo "💡 Use this secret in your .env file: STRIPE_WEBHOOK_SECRET=$WEBHOOK_SECRET"

# Test each critical webhook event
echo ""
echo "🧪 Testing webhook events..."

# Customer events
echo "👤 Testing customer events..."
stripe trigger customer.created
sleep 2

# Checkout events
echo "🛒 Testing checkout events..."
stripe trigger checkout.session.completed
sleep 2

# Subscription events
echo "🔄 Testing subscription events..."
stripe trigger customer.subscription.created
sleep 2
stripe trigger customer.subscription.updated
sleep 2
stripe trigger customer.subscription.trial_will_end
sleep 2

# Invoice events
echo "💰 Testing invoice events..."
stripe trigger invoice.created
sleep 2
stripe trigger invoice.payment_succeeded
sleep 2
stripe trigger invoice.payment_failed
sleep 2
stripe trigger invoice.upcoming
sleep 2

# Payment events
echo "💳 Testing payment events..."
stripe trigger payment_intent.succeeded
sleep 2
stripe trigger payment_intent.payment_failed
sleep 2

echo ""
echo "✅ All webhook events triggered successfully!"
echo ""
echo "📋 Summary of tested events:"
echo "   - customer.created"
echo "   - checkout.session.completed"
echo "   - customer.subscription.created"
echo "   - customer.subscription.updated"
echo "   - customer.subscription.trial_will_end"
echo "   - invoice.created"
echo "   - invoice.payment_succeeded"
echo "   - invoice.payment_failed"
echo "   - invoice.upcoming"
echo "   - payment_intent.succeeded"
echo "   - payment_intent.payment_failed"
echo ""
echo "🔍 Check your application logs to verify webhook processing"
echo "📊 Monitor your webhook endpoint at: $WEBHOOK_URL"

# Keep listener running for additional manual testing
echo ""
echo "🔄 Webhook listener will continue running for manual testing..."
echo "📝 Press Ctrl+C to stop the listener and exit"
echo ""

# Wait for manual termination
wait $LISTEN_PID