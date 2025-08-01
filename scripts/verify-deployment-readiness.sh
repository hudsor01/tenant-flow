#!/bin/bash

# TenantFlow Deployment Readiness Verification Script
# This script verifies that all deployment configurations are working properly

set -e

echo "🔍 TenantFlow Deployment Readiness Check"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
ERRORS=0
WARNINGS=0

log_error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
    ERRORS=$((ERRORS + 1))
}

log_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
    WARNINGS=$((WARNINGS + 1))
}

log_success() {
    echo -e "${GREEN}✅ SUCCESS: $1${NC}"
}

log_info() {
    echo -e "${BLUE}ℹ️  INFO: $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "apps" ]; then
    log_error "Must be run from the root of the TenantFlow project"
    exit 1
fi

echo ""
echo "1️⃣  Checking Dependencies..."
echo "----------------------------"

# Check Node.js version
NODE_VERSION=$(node --version)
log_info "Node.js version: $NODE_VERSION"

# Check npm version
NPM_VERSION=$(npm --version)
log_info "npm version: $NPM_VERSION"

# Install dependencies
log_info "Installing dependencies..."
if npm ci > /dev/null 2>&1; then
    log_success "Dependencies installed successfully"
else
    log_error "Failed to install dependencies"
fi

echo ""
echo "2️⃣  Testing Backend Build..."
echo "----------------------------"

# Generate Prisma client
log_info "Generating Prisma client..."
if cd apps/backend && npx prisma generate > /dev/null 2>&1; then
    log_success "Prisma client generated successfully"
    cd ../..
else
    log_error "Failed to generate Prisma client"
    cd ../..
fi

# Test backend build
log_info "Building backend..."
if npx turbo run build --filter=@tenantflow/backend > /dev/null 2>&1; then
    log_success "Backend build successful"
else
    log_error "Backend build failed"
fi

echo ""
echo "3️⃣  Testing Frontend Build..."
echo "-----------------------------"

# Test frontend build
log_info "Building frontend..."
if npx turbo run build --filter=@tenantflow/frontend > /dev/null 2>&1; then
    log_success "Frontend build successful"
else
    log_error "Frontend build failed"
fi

# Check if build output exists
if [ -d "apps/frontend/dist" ]; then
    DIST_SIZE=$(du -sh apps/frontend/dist | cut -f1)
    log_success "Frontend dist directory created (size: $DIST_SIZE)"
else
    log_error "Frontend dist directory not found"
fi

echo ""
echo "4️⃣  Checking Configuration Files..."
echo "------------------------------------"

# Check Dockerfile
if [ -f "Dockerfile" ]; then
    log_success "Dockerfile found"
else
    log_error "Dockerfile not found"
fi

# Check railway.toml
if [ -f "railway.toml" ]; then
    log_success "railway.toml found"
    
    # Check if it has the correct health check path
    if grep -q "/health" railway.toml; then
        log_success "Health check path configured in railway.toml"
    else
        log_warning "Health check path not found in railway.toml"
    fi
else
    log_error "railway.toml not found"
fi

# Check vercel.json
if [ -f "vercel.json" ]; then
    log_success "vercel.json found"
    
    # Check if build command is correct
    if grep -q "turbo run build --filter" vercel.json; then
        log_success "Correct build command in vercel.json"
    else
        log_warning "Build command in vercel.json may need updating"
    fi
else
    log_error "vercel.json not found"
fi

# Check turbo.json
if [ -f "turbo.json" ]; then
    log_success "turbo.json found"
else
    log_error "turbo.json not found"
fi

echo ""
echo "5️⃣  Testing TypeScript Configuration..."
echo "--------------------------------------"

# Test backend typecheck (excluding test files for production)
log_info "Type-checking backend..."
if cd apps/backend && npx tsc --noEmit -p tsconfig.build.json > /dev/null 2>&1; then
    log_success "Backend TypeScript compilation successful"
    cd ../..
else
    log_warning "Backend TypeScript issues detected (may be test files)"
    cd ../..
fi

# Test frontend typecheck
log_info "Type-checking frontend..."
if cd apps/frontend && npx tsc --noEmit -p tsconfig.build.json > /dev/null 2>&1; then
    log_success "Frontend TypeScript compilation successful"
    cd ../..
else
    log_warning "Frontend TypeScript issues detected"
    cd ../..
fi

echo ""
echo "6️⃣  Testing Production Build Simulation..."
echo "------------------------------------------"

# Test Railway deployment simulation (build only, don't run)
log_info "Testing Railway deployment build process..."
if npx turbo run build --filter=@tenantflow/shared > /dev/null 2>&1 && \
   npx turbo run build --filter=@tenantflow/backend > /dev/null 2>&1; then
    log_success "Railway deployment build process works"
else
    log_error "Railway deployment build process failed"
fi

# Test Vercel deployment simulation
log_info "Testing Vercel deployment build process..."
if npx turbo run build --filter=@tenantflow/frontend > /dev/null 2>&1; then
    log_success "Vercel deployment build process works"
else
    log_error "Vercel deployment build process failed"
fi

echo ""
echo "7️⃣  Checking Environment Configuration..."
echo "-----------------------------------------"

# Check for environment files
if [ -f ".env.example" ]; then
    log_success ".env.example found"
else
    log_warning ".env.example not found - consider adding one for documentation"
fi

# Check if backend has required Prisma schema
if [ -f "apps/backend/prisma/schema.prisma" ]; then
    log_success "Prisma schema found"
else
    log_error "Prisma schema not found"
fi

echo ""
echo "📊 Deployment Readiness Summary"
echo "================================"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 READY FOR DEPLOYMENT!${NC}"
    echo "All checks passed successfully."
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  MOSTLY READY FOR DEPLOYMENT${NC}"
    echo "All critical checks passed, but there are $WARNINGS warning(s) to review."
else
    echo -e "${RED}❌ NOT READY FOR DEPLOYMENT${NC}"
    echo "Found $ERRORS error(s) and $WARNINGS warning(s) that need to be fixed."
fi

echo ""
echo "Next steps:"
echo "----------"
if [ $ERRORS -eq 0 ]; then
    echo "✅ Backend: Ready to deploy to Railway"
    echo "✅ Frontend: Ready to deploy to Vercel"
    echo ""
    echo "Deployment commands:"
    echo "- Railway: Push to main branch (auto-deploy configured)"
    echo "- Vercel: Push to main branch (auto-deploy configured)"
else
    echo "❌ Fix the errors above before deploying"
    echo "- Run this script again after fixes"
    echo "- Check build logs for detailed error information"
fi

exit $ERRORS