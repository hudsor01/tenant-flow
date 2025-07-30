#!/bin/bash

# Setup CI Environment Variables
# This script sets up dummy database URLs for Prisma schema validation in CI

echo "🔧 Setting up CI environment variables for Prisma..."

# Export dummy database URLs if they're not already set
export DATABASE_URL="${DATABASE_URL:-postgresql://dummy:dummy@localhost:5432/dummy}"
export DIRECT_URL="${DIRECT_URL:-postgresql://dummy:dummy@localhost:5432/dummy}"

echo "✅ CI environment variables configured:"
echo "  DATABASE_URL set: $([ -n "$DATABASE_URL" ] && echo "✓" || echo "✗")"
echo "  DIRECT_URL set: $([ -n "$DIRECT_URL" ] && echo "✓" || echo "✗")"