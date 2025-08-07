#!/bin/bash

# Fix Vercel Environment Variables by removing and re-adding them
# This script removes the empty variables and sets them with correct values

echo "🔧 Fixing Vercel environment variables for tenant-flow project..."
echo "This will remove empty variables and set them with correct values"
echo ""

# Ensure we're in the frontend directory
if [ ! -f "vite.config.ts" ]; then
    echo "❌ Error: Must run from apps/frontend directory"
    exit 1
fi

echo "🗑️  Removing existing empty variables..."
# Remove all existing VITE_ variables
npx vercel env rm VITE_API_BASE_URL production --yes 2>/dev/null
npx vercel env rm VITE_BACKEND_URL production --yes 2>/dev/null
npx vercel env rm VITE_API_URL production --yes 2>/dev/null
npx vercel env rm VITE_APP_URL production --yes 2>/dev/null
npx vercel env rm VITE_SITE_URL production --yes 2>/dev/null
npx vercel env rm VITE_SUPABASE_URL production --yes 2>/dev/null
npx vercel env rm VITE_SUPABASE_ANON_KEY production --yes 2>/dev/null
npx vercel env rm VITE_STRIPE_PUBLISHABLE_KEY production --yes 2>/dev/null
npx vercel env rm VITE_STRIPE_STARTER_MONTHLY production --yes 2>/dev/null
npx vercel env rm VITE_STRIPE_STARTER_ANNUAL production --yes 2>/dev/null
npx vercel env rm VITE_STRIPE_GROWTH_MONTHLY production --yes 2>/dev/null
npx vercel env rm VITE_STRIPE_GROWTH_ANNUAL production --yes 2>/dev/null
npx vercel env rm VITE_STRIPE_TENANTFLOW_MAX_MONTHLY production --yes 2>/dev/null
npx vercel env rm VITE_STRIPE_TENANTFLOW_MAX_ANNUAL production --yes 2>/dev/null
npx vercel env rm VITE_POSTHOG_KEY production --yes 2>/dev/null
npx vercel env rm VITE_POSTHOG_HOST production --yes 2>/dev/null
npx vercel env rm VITE_GTM_ID production --yes 2>/dev/null
npx vercel env rm VITE_FACEBOOK_PIXEL_ID production --yes 2>/dev/null

echo ""
echo "✅ Removed existing variables"
echo ""
echo "📝 Adding correct values..."

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
npx vercel env add VITE_STRIPE_PUBLISHABLE_KEY production <<< "pk_live_51Rd0qyP3WCR53SdoTX2cuAbujIY3WaQSSpu1esdawYD3m96SLWyRRavIZpJkh9BDNdIr8DwYluWVoMQCMqLRUf6Y00jWRkMx8j"

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
echo "✅ All environment variables fixed and set with correct values!"
echo ""
echo "📋 Next steps:"
echo "1. Deploy to production: npx vercel --prod --force"
echo "2. Visit https://tenantflow.app to verify it's working"
echo ""
echo "To verify variables were set: npx vercel env ls production"