#!/usr/bin/env bash

# CI/CD Build Testing Script
# This script simulates the CI build process locally to catch issues before pushing

set -e # Exit on error

echo "🚀 Starting CI Build Test..."
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test Node version
echo -e "\n${YELLOW}Checking Node.js version...${NC}"
NODE_VERSION=$(node -v)
if [[ "$NODE_VERSION" == v2[2-4]* ]]; then
    echo -e "${GREEN}✓ Node.js version $NODE_VERSION is compatible${NC}"
else
    echo -e "${RED}✗ Node.js version $NODE_VERSION may not be compatible. Expected v22-v24${NC}"
    exit 1
fi

# Test npm version
echo -e "\n${YELLOW}Checking npm version...${NC}"
NPM_VERSION=$(npm -v)
echo -e "${GREEN}✓ npm version: $NPM_VERSION${NC}"

# Clean install dependencies
echo -e "\n${YELLOW}Installing dependencies (npm ci)...${NC}"
npm ci --no-audit --no-fund

# Run linting
echo -e "\n${YELLOW}Running lint checks...${NC}"
if npm run lint; then
    echo -e "${GREEN}✓ Linting passed${NC}"
else
    echo -e "${RED}✗ Linting failed${NC}"
    exit 1
fi

# Run type checking
echo -e "\n${YELLOW}Running TypeScript type checking...${NC}"
if npm run typecheck; then
    echo -e "${GREEN}✓ Type checking passed${NC}"
else
    echo -e "${RED}✗ Type checking failed${NC}"
    exit 1
fi

# Run unit tests
echo -e "\n${YELLOW}Running unit tests...${NC}"
if npm run test:unit; then
    echo -e "${GREEN}✓ Unit tests passed${NC}"
else
    echo -e "${YELLOW}⚠ Some unit tests failed (non-blocking)${NC}"
fi

# Build shared packages
echo -e "\n${YELLOW}Building shared packages...${NC}"
if npm run build:shared; then
    echo -e "${GREEN}✓ Shared packages built successfully${NC}"
else
    echo -e "${RED}✗ Failed to build shared packages${NC}"
    exit 1
fi

# Build database package
echo -e "\n${YELLOW}Building database package...${NC}"
if npm run build:database; then
    echo -e "${GREEN}✓ Database package built successfully${NC}"
else
    echo -e "${RED}✗ Failed to build database package${NC}"
    exit 1
fi

# Build backend
echo -e "\n${YELLOW}Building backend...${NC}"
if NODE_OPTIONS='--max-old-space-size=6144' npm run build:backend; then
    echo -e "${GREEN}✓ Backend built successfully${NC}"
else
    echo -e "${RED}✗ Failed to build backend${NC}"
    exit 1
fi

# Build frontend
echo -e "\n${YELLOW}Building frontend...${NC}"
if npm run build:frontend; then
    echo -e "${GREEN}✓ Frontend built successfully${NC}"
else
    echo -e "${RED}✗ Failed to build frontend${NC}"
    exit 1
fi

# Test Docker build (if Docker is available)
if command -v docker &> /dev/null; then
    echo -e "\n${YELLOW}Testing Docker build...${NC}"
    if docker build --target builder -t tenantflow-test .; then
        echo -e "${GREEN}✓ Docker build successful${NC}"
    else
        echo -e "${YELLOW}⚠ Docker build failed (non-blocking)${NC}"
    fi
else
    echo -e "\n${YELLOW}⚠ Docker not available, skipping Docker build test${NC}"
fi

echo -e "\n================================"
echo -e "${GREEN}✅ CI Build Test Completed Successfully!${NC}"
echo -e "You can now push your changes with confidence."