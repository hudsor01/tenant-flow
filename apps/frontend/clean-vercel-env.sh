#!/bin/bash

# Remove unnecessary backend environment variables from Vercel frontend
# Keep only VITE_ variables and essential build variables

echo "🧹 Cleaning up unnecessary environment variables from Vercel frontend..."
echo ""

# Remove backend-specific variables that shouldn't be on frontend
echo "🗑️  Removing backend/database variables that don't belong on frontend..."

# Database variables (backend only)
npx vercel env rm POSTGRES_URL production --yes 2>/dev/null
npx vercel env rm POSTGRES_PRISMA_URL production --yes 2>/dev/null
npx vercel env rm POSTGRES_URL_NON_POOLING production --yes 2>/dev/null
npx vercel env rm POSTGRES_USER production --yes 2>/dev/null
npx vercel env rm POSTGRES_HOST production --yes 2>/dev/null
npx vercel env rm POSTGRES_PASSWORD production --yes 2>/dev/null
npx vercel env rm POSTGRES_DATABASE production --yes 2>/dev/null

# Backend API keys (not needed on frontend)
npx vercel env rm STRIPE_SECRET_KEY production --yes 2>/dev/null
npx vercel env rm STRIPE_SECRET_KEY preview --yes 2>/dev/null
npx vercel env rm JWT_SECRET production --yes 2>/dev/null
npx vercel env rm JWT_SECRET preview --yes 2>/dev/null
npx vercel env rm RESEND_API_KEY production --yes 2>/dev/null
npx vercel env rm RESEND_API_KEY preview --yes 2>/dev/null
npx vercel env rm SUPABASE_JWT_SECRET production --yes 2>/dev/null

# Duplicate Supabase variables (we use VITE_ prefixed ones)
npx vercel env rm SUPABASE_URL production --yes 2>/dev/null
npx vercel env rm SUPABASE_ANON_KEY production --yes 2>/dev/null
npx vercel env rm NEXT_PUBLIC_SUPABASE_ANON_KEY production --yes 2>/dev/null

# Turbo cache variables (not needed for production)
npx vercel env rm TURBO_TOKEN production --yes 2>/dev/null
npx vercel env rm TURBO_TOKEN preview --yes 2>/dev/null
npx vercel env rm TURBO_TEAM production --yes 2>/dev/null
npx vercel env rm TURBO_TEAM preview --yes 2>/dev/null
npx vercel env rm TURBO_REMOTE_CACHE_SIGNATURE_KEY production --yes 2>/dev/null
npx vercel env rm TURBO_REMOTE_CACHE_SIGNATURE_KEY preview --yes 2>/dev/null

# GTM_ID duplicate (we use VITE_GTM_ID)
npx vercel env rm GTM_ID production --yes 2>/dev/null
npx vercel env rm GTM_ID preview --yes 2>/dev/null

# Old free trial variable
npx vercel env rm VITE_STRIPE_FREE_TRIAL production --yes 2>/dev/null
npx vercel env rm VITE_STRIPE_FREE_TRIAL preview --yes 2>/dev/null

echo ""
echo "✅ Removed unnecessary backend variables"
echo ""
echo "📋 Remaining variables should only be:"
echo "   - VITE_* variables (frontend configuration)"
echo "   - CORS_ORIGINS (if needed for API)"
echo ""
echo "Listing remaining variables:"
npx vercel env ls production

echo ""
echo "🚀 Now deploy with: npx vercel --prod --force --cwd ../.."