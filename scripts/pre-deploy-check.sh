#!/bin/bash

# Pre-deployment readiness check script
# Ensures all systems are ready for production deployment

set -e

echo "🚀 TenantFlow Pre-Deployment Readiness Check"
echo "============================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track overall status
OVERALL_STATUS=0

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
        OVERALL_STATUS=1
    fi
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo ""
echo "1. Checking build environment..."

# Check Node.js version
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    if [[ "$NODE_VERSION" == v22* ]]; then
        print_status 0 "Node.js version: $NODE_VERSION"
    else
        print_status 1 "Node.js version should be v22.x, found: $NODE_VERSION"
    fi
else
    print_status 1 "Node.js not found"
fi

# Check npm version
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_status 0 "npm version: $NPM_VERSION"
else
    print_status 1 "npm not found"
fi

echo ""
echo "2. Checking monorepo integrity..."

# Check package.json files exist
if [ -f "package.json" ]; then
    print_status 0 "Root package.json exists"
else
    print_status 1 "Root package.json missing"
fi

if [ -f "apps/frontend/package.json" ]; then
    print_status 0 "Frontend package.json exists"
else
    print_status 1 "Frontend package.json missing"
fi

if [ -f "apps/backend/package.json" ]; then
    print_status 0 "Backend package.json exists"
else
    print_status 1 "Backend package.json missing"
fi

if [ -f "packages/shared/package.json" ]; then
    print_status 0 "Shared package.json exists"
else
    print_status 1 "Shared package.json missing"
fi

echo ""
echo "3. Checking deployment configuration..."

# Check Railway config
if [ -f "railway.toml" ]; then
    print_status 0 "Railway configuration exists"
    
    # Check for required Railway config sections
    if grep -q "\[build\]" railway.toml && grep -q "\[deploy\]" railway.toml; then
        print_status 0 "Railway config has required sections"
    else
        print_status 1 "Railway config missing required sections"
    fi
else
    print_status 1 "Railway configuration missing"
fi

# Check Vercel config
if [ -f "vercel.json" ]; then
    print_status 0 "Vercel configuration exists"
    
    # Check for required Vercel config
    if grep -q "buildCommand" vercel.json && grep -q "outputDirectory" vercel.json; then
        print_status 0 "Vercel config has required build settings"
    else
        print_status 1 "Vercel config missing required build settings"
    fi
else
    print_status 1 "Vercel configuration missing"
fi

# Check Dockerfile
if [ -f "Dockerfile" ]; then
    print_status 0 "Dockerfile exists"
    
    # Check for multi-stage build patterns
    if grep -q "FROM node:" Dockerfile && grep -q "WORKDIR" Dockerfile; then
        print_status 0 "Dockerfile has proper structure"
    else
        print_status 1 "Dockerfile missing required structure"
    fi
else
    print_status 1 "Dockerfile missing"
fi

echo ""
echo "4. Checking dependencies..."

# Check if node_modules exists
if [ -d "node_modules" ]; then
    print_status 0 "Dependencies installed"
else
    print_warning "Dependencies not installed - run 'npm install'"
fi

# Check turbo.json
if [ -f "turbo.json" ]; then
    print_status 0 "Turbo configuration exists"
else
    print_status 1 "Turbo configuration missing"
fi

echo ""
echo "5. Testing build process..."

# Test shared package build
echo "Testing shared package build..."
if npm run build --filter=@tenantflow/shared --silent > /dev/null 2>&1; then
    print_status 0 "Shared package builds successfully"
else
    print_status 1 "Shared package build fails"
fi

echo ""
echo "6. Checking environment files..."

# Check for environment files
if [ -f ".env.example" ]; then
    print_status 0 "Environment example file exists"
else
    print_warning "No .env.example file found"
fi

if [ -f "apps/frontend/.env.example" ]; then
    print_status 0 "Frontend environment example exists"
else
    print_warning "No frontend .env.example file found"
fi

echo ""
echo "7. Security checks..."

# Check for sensitive files that shouldn't be committed
SENSITIVE_FILES=(".env" "apps/frontend/.env.local" "apps/backend/.env" ".env.local")
FOUND_SENSITIVE=0

for file in "${SENSITIVE_FILES[@]}"; do
    if git ls-files --error-unmatch "$file" > /dev/null 2>&1; then
        print_status 1 "Sensitive file '$file' is tracked by git"
        FOUND_SENSITIVE=1
    fi
done

if [ $FOUND_SENSITIVE -eq 0 ]; then
    print_status 0 "No sensitive files tracked in git"
fi

# Check .gitignore
if [ -f ".gitignore" ]; then
    if grep -q "\.env" .gitignore && grep -q "node_modules" .gitignore; then
        print_status 0 ".gitignore properly configured"
    else
        print_status 1 ".gitignore missing essential entries"
    fi
else
    print_status 1 ".gitignore missing"
fi

echo ""
echo "============================================="

if [ $OVERALL_STATUS -eq 0 ]; then
    echo -e "${GREEN}🎉 All checks passed! Ready for deployment.${NC}"
    exit 0
else
    echo -e "${RED}💥 Some checks failed. Please fix the issues above before deploying.${NC}"
    exit 1
fi