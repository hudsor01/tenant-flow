#!/bin/bash

# Setup Test Environment Script
# This script sets up the test database and environment configuration

set -e

echo "🔧 Setting up test environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.test exists
if [ ! -f ".env.test" ]; then
    echo -e "${RED}❌ .env.test file not found!${NC}"
    echo "Please create .env.test with your test database configuration."
    exit 1
fi

echo -e "${GREEN}✅ Found .env.test configuration${NC}"

# Load test environment variables
export $(cat .env.test | grep -v ^# | xargs)

# Check if TEST_DATABASE_URL is set
if [ -z "$TEST_DATABASE_URL" ]; then
    echo -e "${RED}❌ TEST_DATABASE_URL not set in .env.test${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Test environment configuration:${NC}"
echo "  Database URL: ${TEST_DATABASE_URL}"
echo "  Node Environment: ${NODE_ENV}"
echo "  Supabase URL: ${SUPABASE_URL}"

# Check if PostgreSQL is running (for local databases)
if [[ $TEST_DATABASE_URL == *"localhost"* ]]; then
    echo -e "${YELLOW}🔍 Checking if PostgreSQL is running locally...${NC}"
    if ! pg_isready -h localhost -p 5433 >/dev/null 2>&1; then
        echo -e "${RED}❌ PostgreSQL is not running on localhost:5433${NC}"
        echo "Please start PostgreSQL or update TEST_DATABASE_URL in .env.test"
        echo "You can start PostgreSQL with Docker:"
        echo "  docker run --name tenantflow-test-db -e POSTGRES_PASSWORD=password -p 5433:5432 -d postgres:15"
        exit 1
    fi
    echo -e "${GREEN}✅ PostgreSQL is running${NC}"
fi

# Run Prisma generate for test environment
echo -e "${YELLOW}🔄 Generating Prisma client...${NC}"
cd apps/backend
DATABASE_URL=$TEST_DATABASE_URL npx prisma generate
cd ../..

# Check if test database exists and is accessible
echo -e "${YELLOW}🔍 Testing database connection...${NC}"
cd apps/backend
if DATABASE_URL=$TEST_DATABASE_URL npx prisma db push --accept-data-loss >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Test database is accessible${NC}"
else
    echo -e "${RED}❌ Cannot connect to test database${NC}"
    echo "Please check your TEST_DATABASE_URL configuration"
    exit 1
fi
cd ../..

# Install test dependencies if not already installed
echo -e "${YELLOW}📦 Checking test dependencies...${NC}"
if ! npm list @vitest/coverage-v8 >/dev/null 2>&1; then
    echo -e "${YELLOW}📦 Installing missing test dependencies...${NC}"
    npm install --save-dev @vitest/coverage-v8
fi

echo -e "${GREEN}✅ Test environment setup complete!${NC}"
echo ""
echo -e "${YELLOW}🧪 You can now run tests with:${NC}"
echo "  npm run test:unit      # Unit tests"
echo "  npm run test:coverage  # Unit tests with coverage"
echo "  npm run test:e2e       # End-to-end tests"
echo "  npm run test:all       # All tests"
echo ""
echo -e "${YELLOW}📊 Coverage reports will be available at:${NC}"
echo "  apps/backend/coverage/index.html"
echo "  apps/frontend/coverage/index.html"