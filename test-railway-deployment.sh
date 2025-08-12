#!/bin/bash

# Test Railway Deployment Configuration
# This script validates the fixes before deploying to Railway

set -e  # Exit on any error

echo "=== Railway Deployment Test ==="
echo

# Test 1: Environment Validation
echo "1. Testing Environment Validation..."
if command -v node >/dev/null 2>&1; then
    node railway-env-check.js
    echo "✅ Environment validation script works"
else
    echo "❌ Node.js not found"
    exit 1
fi
echo

# Test 2: JWT Secret Generation
echo "2. Testing JWT Secret Generation..."
node generate-jwt-secret.js > /dev/null
echo "✅ JWT secret generation works"
echo

# Test 3: Docker Build Path Verification
echo "3. Verifying Docker Build Paths..."
if [ -f "Dockerfile.railway" ]; then
    echo "✅ Railway Dockerfile exists"
    
    # Check if the start command path exists after build
    if [ -f "apps/backend/dist/apps/backend/src/main.js" ] || [ -d "apps/backend" ]; then
        echo "✅ Backend app structure exists"
    else
        echo "⚠️  Backend dist not built yet (expected for pre-build test)"
    fi
else
    echo "❌ Railway Dockerfile missing"
    exit 1
fi
echo

# Test 4: Railway Configuration
echo "4. Validating Railway Configuration..."
if [ -f "railway.toml" ]; then
    echo "✅ Railway config exists"
    
    # Check start command
    if grep -q "startCommand.*apps/backend/dist/apps/backend/src/main.js" railway.toml; then
        echo "✅ Correct start command path configured"
    else
        echo "❌ Incorrect start command path"
        echo "Current config:"
        grep "startCommand" railway.toml || echo "Start command not found"
        exit 1
    fi
    
    # Check Dockerfile path
    if grep -q "dockerfilePath.*Dockerfile.railway" railway.toml; then
        echo "✅ Correct Dockerfile path configured"
    else
        echo "❌ Incorrect Dockerfile path"
        exit 1
    fi
else
    echo "❌ Railway config missing"
    exit 1
fi
echo

# Test 5: Environment Variable Requirements
echo "5. Checking Required Environment Variables..."
MISSING_VARS=()

# Check each required variable
for var in DATABASE_URL SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY SUPABASE_JWT_SECRET NODE_ENV; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -eq 0 ]; then
    echo "✅ All required environment variables are set"
else
    echo "⚠️  Missing required variables (will need to be set in Railway):"
    for var in "${MISSING_VARS[@]}"; do
        echo "   - $var"
    done
fi
echo

# Test 6: JWT Secret Configuration
echo "6. Checking JWT Secret Configuration..."
if [ -n "$JWT_SECRET" ]; then
    echo "✅ JWT_SECRET is configured"
elif [ -n "$SUPABASE_JWT_SECRET" ]; then
    echo "✅ SUPABASE_JWT_SECRET available (will be used as fallback)"
else
    echo "⚠️  Neither JWT_SECRET nor SUPABASE_JWT_SECRET configured"
    echo "   Railway deployment will need one of these variables"
fi
echo

# Summary
echo "=== Test Summary ==="
echo "✅ Railway configuration is ready for deployment"
echo
echo "Next Steps for Railway Deployment:"
echo "1. Ensure all required environment variables are set in Railway:"
for var in DATABASE_URL SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY SUPABASE_JWT_SECRET; do
    if [ -z "${!var}" ]; then
        echo "   - $var"
    fi
done

echo
echo "2. Optional: Set JWT_SECRET in Railway (or rely on SUPABASE_JWT_SECRET fallback)"
echo "3. Deploy using: railway up"
echo "4. Monitor deployment logs for any remaining issues"
echo
echo "🚀 Ready for Railway deployment!"