#!/bin/sh
# Production startup script with better error handling and logging

echo "🚀 Starting TenantFlow Backend..."
echo "Environment: ${NODE_ENV:-production}"
echo "Port: ${PORT:-4600}"  # Railway default port

# Check if running in local test mode
if [ "$1" = "--test" ]; then
    echo "🧪 Running in TEST MODE - Using test environment variables"
    export NODE_ENV=production
    export PORT=3002  # Local test port
    export DATABASE_URL="postgresql://test:test@localhost:5432/test"
    export JWT_SECRET="S5ThaGPeNYFMXZMUff6+4BZ+/o/8h7YyVvgECI5F69s="
    export STRIPE_SECRET_KEY="sk_test_fake_key"
    export SUPABASE_URL="https://test.supabase.co"
    export SUPABASE_ANON_KEY="test-anon-key"
    export SUPABASE_SERVICE_KEY="test-service-key"
    export SUPABASE_SERVICE_ROLE_KEY="test-service-role-key"
    export SUPABASE_JWT_SECRET="H/DYTli7D0iohmwKmO9behIcsVQVnVtPBmK85CSNXWQ="
    export DIRECT_URL="postgresql://test:test@localhost:5432/test"
    # Use HTTPS for test mode to pass production validation
    export CORS_ORIGINS="https://localhost:3000,https://localhost:3001,https://tenantflow.app"
    export SKIP_ENV_VALIDATION="false"  # Still validate, just with HTTPS origins
else
    # Check critical environment variables for production
    if [ -z "$DATABASE_URL" ]; then
        echo "❌ ERROR: DATABASE_URL is not set!"
        echo "💡 Hint: For local testing, run: ./scripts/start-production.sh --test"
        exit 1
    fi

    if [ -z "$JWT_SECRET" ]; then
        echo "❌ ERROR: JWT_SECRET is not set!"
        echo "💡 Hint: For local testing, run: ./scripts/start-production.sh --test"
        exit 1
    fi
fi

echo "✅ DATABASE_URL is configured (${DATABASE_URL:0:15}...)"
echo "✅ JWT_SECRET is configured"

# Check if we're in the backend directory
if [ ! -f "package.json" ] || [ ! -d "dist" ]; then
    echo "❌ ERROR: Must run from apps/backend directory"
    echo "📍 Current directory: $(pwd)"
    
    # Try to navigate to backend directory
    if [ -d "../../apps/backend" ]; then
        echo "📂 Navigating to apps/backend..."
        cd ../../apps/backend
    elif [ -d "apps/backend" ]; then
        echo "📂 Navigating to apps/backend..."
        cd apps/backend
    else
        echo "❌ Cannot find backend directory!"
        exit 1
    fi
fi

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "⚠️  No dist directory found. Building backend..."
    npm run build
fi

# Check for Prisma schema in the correct location
PRISMA_SCHEMA="../../packages/database/prisma/schema.prisma"
if [ ! -f "$PRISMA_SCHEMA" ]; then
    echo "⚠️  Prisma schema not found at $PRISMA_SCHEMA"
    echo "🔍 Looking for schema in alternative locations..."
    
    if [ -f "prisma/schema.prisma" ]; then
        PRISMA_SCHEMA="prisma/schema.prisma"
    elif [ -f "../database/prisma/schema.prisma" ]; then
        PRISMA_SCHEMA="../database/prisma/schema.prisma"
    else
        echo "❌ Cannot find Prisma schema!"
        exit 1
    fi
fi

# Run Prisma migrations if not in test mode
if [ "$1" != "--test" ]; then
    echo "📦 Running database migrations..."
    if npx prisma migrate deploy --schema="$PRISMA_SCHEMA"; then
        echo "✅ Migrations completed successfully"
    else
        echo "⚠️  Migration deploy failed or no migrations to apply"
    fi
else
    echo "🧪 Skipping migrations in test mode"
fi

# Find the correct main.js path
MAIN_JS=""
if [ -f "dist/apps/backend/src/main.js" ]; then
    MAIN_JS="dist/apps/backend/src/main.js"
elif [ -f "dist/src/main.js" ]; then
    MAIN_JS="dist/src/main.js"
elif [ -f "dist/main.js" ]; then
    MAIN_JS="dist/main.js"
else
    echo "❌ Cannot find main.js in dist directory!"
    echo "📂 Contents of dist:"
    ls -la dist/
    exit 1
fi

# Start the application
echo "🎯 Starting NestJS application from $MAIN_JS..."
exec node "$MAIN_JS"