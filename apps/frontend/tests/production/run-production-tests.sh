#!/bin/bash

# Production Test Runner
# Validates your Stripe pricing flow is ready for production

echo "🚀 Starting TenantFlow Stripe Production Validation"
echo "=================================================="

# Check if environment variables are loaded
if [[ -f ".env.local" ]]; then
    echo "✅ Loading environment variables from .env.local"
    export $(grep -v '^#' .env.local | xargs)
else
    echo "⚠️  No .env.local file found"
fi

# Display current configuration
echo ""
echo "📋 Current Configuration:"
echo "- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: ${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:0:20}..."
echo "- NEXT_PUBLIC_STRIPE_FREE_TRIAL: ${NEXT_PUBLIC_STRIPE_FREE_TRIAL}"
echo "- NEXT_PUBLIC_STRIPE_STARTER_MONTHLY: ${NEXT_PUBLIC_STRIPE_STARTER_MONTHLY}"
echo "- NEXT_PUBLIC_STRIPE_STARTER_ANNUAL: ${NEXT_PUBLIC_STRIPE_STARTER_ANNUAL}"
echo "- NEXT_PUBLIC_STRIPE_GROWTH_MONTHLY: ${NEXT_PUBLIC_STRIPE_GROWTH_MONTHLY}"
echo "- NEXT_PUBLIC_STRIPE_GROWTH_ANNUAL: ${NEXT_PUBLIC_STRIPE_GROWTH_ANNUAL}"
echo "- NEXT_PUBLIC_STRIPE_TENANTFLOW_MAX_MONTHLY: ${NEXT_PUBLIC_STRIPE_TENANTFLOW_MAX_MONTHLY}"
echo "- NEXT_PUBLIC_STRIPE_TENANTFLOW_MAX_ANNUAL: ${NEXT_PUBLIC_STRIPE_TENANTFLOW_MAX_ANNUAL}"
echo ""

# Check required environment variables
echo "🔍 Validating Environment Variables..."
REQUIRED_VARS=(
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
    "NEXT_PUBLIC_STRIPE_FREE_TRIAL"
    "NEXT_PUBLIC_STRIPE_STARTER_MONTHLY"
    "NEXT_PUBLIC_STRIPE_STARTER_ANNUAL"
    "NEXT_PUBLIC_STRIPE_GROWTH_MONTHLY"
    "NEXT_PUBLIC_STRIPE_GROWTH_ANNUAL"
    "NEXT_PUBLIC_STRIPE_TENANTFLOW_MAX_MONTHLY"
    "NEXT_PUBLIC_STRIPE_TENANTFLOW_MAX_ANNUAL"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var}" ]]; then
        MISSING_VARS+=("$var")
    fi
done

if [[ ${#MISSING_VARS[@]} -gt 0 ]]; then
    echo "❌ Missing required environment variables:"
    printf '   - %s\n' "${MISSING_VARS[@]}"
    echo ""
    echo "Please set these variables in your .env.local file:"
    echo ""
    echo "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here"
    echo "NEXT_PUBLIC_STRIPE_FREE_TRIAL=price_1RtWFcP3WCR53Sdo5Li5xHiC"
    echo "NEXT_PUBLIC_STRIPE_STARTER_MONTHLY=price_1RtWFcP3WCR53SdoCxiVldhb"
    echo "NEXT_PUBLIC_STRIPE_STARTER_ANNUAL=price_1RtWFdP3WCR53SdoArRRXYrL"
    echo "NEXT_PUBLIC_STRIPE_GROWTH_MONTHLY=price_1RtWFdP3WCR53Sdoz98FFpSu"
    echo "NEXT_PUBLIC_STRIPE_GROWTH_ANNUAL=price_1RtWFdP3WCR53SdoHDRR9kAJ"
    echo "NEXT_PUBLIC_STRIPE_TENANTFLOW_MAX_MONTHLY=price_1RtWFeP3WCR53Sdo9AsL7oGv"
    echo "NEXT_PUBLIC_STRIPE_TENANTFLOW_MAX_ANNUAL=price_1RtWFeP3WCR53Sdoxm2iY4mt"
    echo ""
    exit 1
fi

echo "✅ All environment variables are set"
echo ""

# Test backend connectivity
echo "🔍 Testing Backend Connectivity..."
if curl -f -s http://localhost:3002/health > /dev/null 2>&1; then
    echo "✅ Backend is running at http://localhost:3002"
else
    echo "❌ Backend is not accessible at http://localhost:3002"
    echo "Please start the backend with: npm run dev"
    exit 1
fi

# Test frontend
echo "🔍 Testing Frontend..."
if curl -f -s http://localhost:3000/pricing > /dev/null 2>&1; then
    echo "✅ Frontend is running at http://localhost:3000"
else
    echo "❌ Frontend is not accessible at http://localhost:3000"
    echo "Please start the frontend with: npm run dev"
    exit 1
fi

echo ""
echo "🧪 Running Production Tests..."
echo "=============================="

# Run the specific test suites
echo ""
echo "1️⃣  Running Environment Validation Tests..."
npx playwright test tests/production/pre-production-checklist.spec.ts -g "Environment" --reporter=list --project=chromium

echo ""
echo "2️⃣  Running Backend API Tests..."
npx playwright test tests/production/backend-api.spec.ts --reporter=list --project=chromium

echo ""
echo "3️⃣  Running Pricing Page Tests..."
npx playwright test tests/production/pricing-production.spec.ts -g "Production Flow" --reporter=list --project=chromium

echo ""
echo "4️⃣  Running Critical Flow Tests..."
npx playwright test tests/e2e/critical-pricing-flow.spec.ts --reporter=list --project=chromium

echo ""
echo "📊 Test Summary"
echo "==============="
echo "✅ If all tests pass, your Stripe pricing flow is ready for production!"
echo "⚠️  If tests fail, review the output above and fix any issues before deploying"
echo ""
echo "🚀 Next Steps for Production:"
echo "1. Update environment variables on Vercel/Railway with production Stripe keys"
echo "2. Test with real Stripe test cards (4242 4242 4242 4242)"
echo "3. Monitor Stripe Dashboard for successful checkout sessions"
echo "4. Set up webhook endpoints for subscription events"
echo ""