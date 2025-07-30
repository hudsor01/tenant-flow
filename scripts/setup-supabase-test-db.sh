#!/bin/bash

# Setup Test Database in Supabase
# This creates a test schema and runs migrations against it

set -e

echo "🔧 Setting up Supabase test database..."

# Check if .env.test exists
if [ ! -f ".env.test" ]; then
    echo "❌ .env.test file not found"
    echo "Please create .env.test with your Supabase credentials"
    exit 1
fi

# Load test environment variables
source .env.test

echo "📊 Using database: $DATABASE_URL"

# Run the test schema setup
echo "🏗️ Creating test schema..."
if command -v psql &> /dev/null; then
    psql "$DATABASE_URL" -f scripts/setup-test-schema.sql
    echo "✅ Test schema created successfully"
else
    echo "⚠️ psql not found. Please run scripts/setup-test-schema.sql manually in Supabase SQL Editor"
fi

# Run Prisma migrations on test schema
echo "🔄 Running Prisma migrations on test schema..."
cd apps/backend
DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate deploy
echo "✅ Migrations applied to test schema"

# Generate Prisma client
echo "🔧 Generating Prisma client..."
DATABASE_URL="$TEST_DATABASE_URL" npx prisma generate
echo "✅ Prisma client generated"

echo "🎉 Test database setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update your .env.test with real Supabase credentials"
echo "2. Replace [brackets] in .env.test with actual values"
echo "3. Run: npm run test to run tests against test schema"