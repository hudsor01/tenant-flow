#!/bin/bash

# Essential Environment Variables for TenantFlow Frontend
# Run this script to set all required Vercel environment variables

echo "🚀 Setting Vercel environment variables for tenant-flow project..."
echo "This will set all VITE_ variables properly in Vercel"
echo ""

# Ensure we're in the frontend directory
if [ ! -f "vite.config.ts" ]; then
    echo "❌ Error: Must run from apps/frontend directory"
    exit 1
fi

# API Configuration
echo "📡 Setting API configuration..."
npx vercel env add VITE_API_BASE_URL production <<< "https://api.tenantflow.app"
npx vercel env add VITE_BACKEND_URL production <<< "https://api.tenantflow.app"
npx vercel env add VITE_API_URL production <<< "/api"
npx vercel env add VITE_APP_URL production <<< "https://tenantflow.app"
npx vercel env add VITE_SITE_URL production <<< "https://tenantflow.app"

# Supabase Configuration
echo "🔐 Setting Supabase configuration..."
npx vercel env add VITE_SUPABASE_URL production <<< "https://bshjmbshupiibfiewpxb.supabase.co"
npx vercel env add VITE_SUPABASE_ANON_KEY production <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzaGptYnNodXBpaWJmaWV3cHhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0MDc1MDYsImV4cCI6MjA2Mzk4MzUwNn0.K9cR4SN_MtutRWPJsymtAtlHpEJFyfnQgtu8BjQRqko"

# Stripe Configuration
echo "💳 Setting Stripe configuration..."

# Your Stripe Publishable Key (LIVE key from your .env.local)
STRIPE_PUB_KEY="pk_live_51Rd0qyP3WCR53SdoTX2cuAbujIY3WaQSSpu1esdawYD3m96SLWyRRavIZpJkh9BDNdIr8DwYluWVoMQCMqLRUf6Y00jWRkMx8j"

npx vercel env add VITE_STRIPE_PUBLISHABLE_KEY production <<< "$STRIPE_PUB_KEY"

# Your 4-tier pricing: FREETRIAL, STARTER, GROWTH, TENANTFLOW_MAX
echo "💰 Setting Stripe price IDs for 4-tier pricing..."
npx vercel env add VITE_STRIPE_STARTER_MONTHLY production <<< "price_1Rbnyk00PMlKUSP0oGJV2i1G"
npx vercel env add VITE_STRIPE_STARTER_ANNUAL production <<< "price_1Rbnyk00PMlKUSP0uS33sCq3"
npx vercel env add VITE_STRIPE_GROWTH_MONTHLY production <<< "price_1Rbnzv00PMlKUSP0fq5R5MNV"
npx vercel env add VITE_STRIPE_GROWTH_ANNUAL production <<< "price_1Rbnzv00PMlKUSP0jIq3BxTy"
npx vercel env add VITE_STRIPE_TENANTFLOW_MAX_MONTHLY production <<< "price_1Rbo0P00PMlKUSP0Isi7U1Wr"
npx vercel env add VITE_STRIPE_TENANTFLOW_MAX_ANNUAL production <<< "price_1Rbo0r00PMlKUSP0rzUhwgkO"

# Optional Analytics (leaving empty for now)
echo "📊 Setting optional analytics (empty for now)..."
npx vercel env add VITE_POSTHOG_KEY production <<< ""
npx vercel env add VITE_POSTHOG_HOST production <<< ""
npx vercel env add VITE_GTM_ID production <<< ""
npx vercel env add VITE_FACEBOOK_PIXEL_ID production <<< ""

echo ""
echo "✅ Environment variables set successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Deploy to production: npx vercel --prod --force"
echo "2. Visit https://tenantflow.app to verify it's working"
echo ""
echo "To verify variables were set: npx vercel env ls production"