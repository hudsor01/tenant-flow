#!/bin/bash

# Script to help set up GitHub secrets for optimized CI/CD
# This generates commands you can run to set up your secrets

echo "🔧 GitHub Secrets Setup Guide"
echo "============================"
echo ""
echo "Run these commands to set up your GitHub secrets:"
echo "(Replace placeholder values with your actual credentials)"
echo ""

# Turbo Remote Cache
echo "# Turbo Remote Cache (for 10x faster builds)"
echo "gh secret set TURBO_TOKEN --body 'your-turbo-token'"
echo "gh variable set TURBO_TEAM --body 'your-team-name'"
echo "gh secret set TURBO_REMOTE_CACHE_SIGNATURE_KEY --body 'your-signature-key'"
echo ""

# Vercel
echo "# Vercel Deployment"
echo "gh secret set VERCEL_TOKEN --body 'your-vercel-token'"
echo "gh secret set VERCEL_ORG_ID --body 'your-vercel-org-id'"
echo "gh secret set VERCEL_PROJECT_ID --body 'your-vercel-project-id'"
echo ""

# Railway
echo "# Railway Deployment"
echo "gh secret set RAILWAY_TOKEN --body 'your-railway-token'"
echo ""

# Database (for CI tests)
echo "# Database for CI tests"
echo "gh secret set DATABASE_URL --body 'postgresql://user:pass@host:5432/testdb'"
echo ""

# Supabase (minimal for builds)
echo "# Supabase (minimal for builds)"
echo "gh secret set VITE_SUPABASE_URL --body 'https://your-project.supabase.co'"
echo "gh secret set VITE_SUPABASE_ANON_KEY --body 'your-anon-key'"
echo ""

# Stripe (minimal for builds)
echo "# Stripe (minimal for builds)"
echo "gh secret set VITE_STRIPE_PUBLISHABLE_KEY --body 'pk_test_...'"
echo ""

echo "📝 To get these values:"
echo ""
echo "1. Turbo Token:"
echo "   - Sign up at https://turbo.build"
echo "   - Go to your account settings"
echo "   - Create a new access token"
echo ""
echo "2. Vercel Token:"
echo "   - Go to https://vercel.com/account/tokens"
echo "   - Create a new token with deployment permissions"
echo ""
echo "3. Railway Token:"
echo "   - Go to https://railway.app/account/tokens"
echo "   - Create a new token"
echo ""
echo "4. Get your project IDs:"
echo "   - Vercel: Run 'vercel link' in your project"
echo "   - Railway: Check your project settings"
echo ""

# Create a sample env file for CI
cat > .github/workflows/.env.ci.example << EOF
# CI Environment Variables
NODE_ENV=test
CI=true

# Turbo Remote Cache
TURBO_TOKEN=\${{ secrets.TURBO_TOKEN }}
TURBO_TEAM=\${{ vars.TURBO_TEAM }}

# Build-time variables (safe defaults)
DATABASE_URL=postgresql://user:pass@localhost:5432/db
VITE_BACKEND_URL=http://localhost:3002
VITE_SUPABASE_URL=https://test.supabase.co
VITE_SUPABASE_ANON_KEY=test-key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_123
EOF

echo "✅ Created .github/workflows/.env.ci.example"
echo ""
echo "🚀 Next steps:"
echo "1. Run the gh commands above to set your secrets"
echo "2. Enable Turbo Remote Cache in your Vercel/Turbo dashboard"
echo "3. Push to GitHub and watch your builds go from 10 min → 2-3 min!"