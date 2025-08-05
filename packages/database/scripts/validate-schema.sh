#!/bin/bash

# Schema validation script for Prisma
# This script validates the Prisma schema syntax and formatting

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔍 Validating Prisma schema...${NC}"
echo ""

# Change to the database package directory
cd "$(dirname "$0")/.."

# Check if prisma schema exists
if [ ! -f "prisma/schema.prisma" ]; then
    echo -e "${RED}❌ Error: prisma/schema.prisma not found${NC}"
    exit 1
fi

# Initialize exit code
EXIT_CODE=0

echo -e "${YELLOW}1. Checking schema syntax...${NC}"
if npx prisma validate; then
    echo -e "${GREEN}✅ Schema syntax is valid${NC}"
else
    echo -e "${RED}❌ Schema syntax validation failed${NC}"
    EXIT_CODE=1
fi

echo ""
echo -e "${YELLOW}2. Checking schema formatting...${NC}"
if npx prisma format --check; then
    echo -e "${GREEN}✅ Schema formatting is correct${NC}"
else
    echo -e "${RED}❌ Schema formatting validation failed${NC}"
    echo -e "${YELLOW}💡 Run 'npx prisma format' to fix formatting issues${NC}"
    EXIT_CODE=1
fi

echo ""

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}🎉 All schema validations passed!${NC}"
else
    echo -e "${RED}💥 Schema validation failed with errors${NC}"
fi

exit $EXIT_CODE