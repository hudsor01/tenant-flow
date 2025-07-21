#!/bin/bash

# Script to test the complete free trial E2E flow
# Prerequisites:
# 1. Backend running on port 3002
# 2. Frontend running on port 5173
# 3. Stripe webhook endpoint configured
# 4. Supabase configured and running

echo "🧪 Starting Free Trial E2E Test Suite"
echo "===================================="

# Check if services are running
check_service() {
    local url=$1
    local service=$2
    
    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200\|301\|302"; then
        echo "✅ $service is running"
        return 0
    else
        echo "❌ $service is not running at $url"
        return 1
    fi
}

# Check frontend
if ! check_service "http://localhost:5173" "Frontend"; then
    echo "Please start the frontend with: npm run dev"
    exit 1
fi

# Check backend
if ! check_service "http://localhost:3002/health" "Backend"; then
    echo "Please start the backend with: npm run dev"
    exit 1
fi

echo ""
echo "📋 Test Scenarios:"
echo "1. Free Trial Signup Flow"
echo "   - User visits homepage"
echo "   - Clicks 'Get started free'"
echo "   - Fills signup form"
echo "   - Redirected to Stripe Checkout"
echo "   - Completes trial signup (no payment)"
echo "   - Webhook confirms subscription"
echo "   - User lands on dashboard"
echo ""
echo "2. Trial Status Verification"
echo "   - Dashboard shows 'Free Trial' status"
echo "   - Trial expiration date is shown"
echo "   - Property limit reflects trial plan"
echo ""
echo "3. Webhook Handling"
echo "   - trial_will_end webhook"
echo "   - customer.subscription.updated webhook"
echo "   - payment_method.attached webhook"
echo ""

# Run Playwright tests
echo "🎭 Running Playwright tests..."
npx playwright test tests/e2e/free-trial-signup.spec.ts --reporter=list

# Check test results
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All tests passed!"
    echo ""
    echo "📊 Summary:"
    echo "- Free trial signup flow: ✅"
    echo "- Stripe Checkout integration: ✅"
    echo "- Webhook handling: ✅"
    echo "- Trial subscription creation: ✅"
else
    echo ""
    echo "❌ Some tests failed. Please check the output above."
fi

echo ""
echo "💡 Manual Verification Steps:"
echo "1. Check Stripe Dashboard for:"
echo "   - New customer created"
echo "   - Trial subscription active"
echo "   - No payment method required"
echo ""
echo "2. Check Database for:"
echo "   - User record created"
echo "   - Subscription record with trial status"
echo "   - Correct trial end date"
echo ""
echo "3. Check Email for:"
echo "   - Welcome email sent"
echo "   - Trial confirmation email"

echo ""
echo "🏁 Test suite completed!"