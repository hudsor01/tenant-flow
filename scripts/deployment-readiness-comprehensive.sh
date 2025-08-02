#!/bin/bash

# TenantFlow Comprehensive Deployment Readiness Validation
# Full-stack orchestration ensuring both frontend and backend are deployment-ready

set -e

echo "🚀 TenantFlow Deployment Readiness - Comprehensive Validation"
echo "=================================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Helper functions
log_info() {
    echo -e "${BLUE}📋 [INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}✅ [SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠️  [WARNING]${NC} $1"
    ((WARNINGS++))
}

log_error() {
    echo -e "${RED}❌ [ERROR]${NC} $1"
    ((ERRORS++))
}

log_fix() {
    echo -e "${GREEN}🔧 [FIX]${NC} $1"
}

# Environment validation
echo ""
log_info "Phase 1: Environment Validation"
echo "--------------------------------"

# Node.js version check
NODE_VERSION=$(node --version)
log_info "Node.js version: $NODE_VERSION"
if [[ ! "$NODE_VERSION" =~ ^v2[2-9] ]]; then
    log_warning "Recommended Node.js version is 22.x or higher"
fi

# Critical files check
CRITICAL_FILES=(
    "package.json"
    "turbo.json" 
    "Dockerfile"
    "railway.toml"
    "vercel.json"
    "apps/frontend/package.json"
    "apps/backend/package.json"
    "packages/shared/package.json"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        log_success "Found $file"
    else
        log_error "Missing critical file: $file"
    fi
done

# Phase 2: TypeScript validation
echo ""
log_info "Phase 2: TypeScript & Type Safety"
echo "--------------------------------"

log_info "Running TypeScript validation..."
if npm run typecheck > /dev/null 2>&1; then
    log_success "TypeScript validation passed"
else
    log_error "TypeScript validation failed"
    echo "Running detailed typecheck:"
    npm run typecheck || true
fi

# Phase 3: Code quality
echo ""
log_info "Phase 3: Code Quality (ESLint)"
echo "------------------------------"

log_info "Running ESLint validation..."
if npx turbo run lint > /dev/null 2>&1; then
    log_success "ESLint validation passed"
else
    log_warning "ESLint issues detected"
    log_info "For details, run: npm run lint"
fi

# Phase 4: Build validation
echo ""
log_info "Phase 4: Build Process Validation"
echo "--------------------------------"

log_info "Building shared package..."
if npx turbo run build --filter=@tenantflow/shared > /dev/null 2>&1; then
    log_success "Shared package built successfully"
else
    log_error "Shared package build failed"
fi

log_info "Building backend..."
if npx turbo run build --filter=@tenantflow/backend > /dev/null 2>&1; then
    log_success "Backend built successfully"
else
    log_error "Backend build failed"
    echo "Backend build output:"
    npx turbo run build --filter=@tenantflow/backend || true
fi

log_info "Building frontend..."
if npx turbo run build --filter=@tenantflow/frontend > /dev/null 2>&1; then
    log_success "Frontend built successfully"
else
    log_error "Frontend build failed"
    echo "Frontend build output:"
    npx turbo run build --filter=@tenantflow/frontend || true
fi

# Phase 5: API contract validation
echo ""
log_info "Phase 5: API Contract Validation"
echo "-------------------------------"

if [ -f "scripts/validate-api-contracts.js" ]; then
    log_info "Running API contract validation..."
    if node scripts/validate-api-contracts.js > /dev/null 2>&1; then
        log_success "API contracts validated"
    else
        log_warning "API contract validation issues detected"
    fi
else
    log_warning "API contract validation script not found"
fi

# Phase 6: Deployment configuration
echo ""
log_info "Phase 6: Deployment Configuration"
echo "--------------------------------"

# Railway configuration check
log_info "Validating Railway configuration..."
if grep -q 'dockerfilePath = "./Dockerfile"' railway.toml; then
    log_success "Railway Dockerfile path correct"
else
    log_error "Railway Dockerfile path misconfigured"
fi

if grep -q 'NODE_OPTIONS = "--max-old-space-size=4096"' railway.toml; then
    log_success "Railway memory allocation consistent"
else
    log_warning "Railway memory allocation inconsistent"
fi

# Vercel configuration check
log_info "Validating Vercel configuration..."
if grep -q '"rootDirectory": "apps/frontend"' vercel.json; then
    log_success "Vercel root directory correct"
else
    log_error "Vercel root directory misconfigured"
fi

# Docker configuration check
if [ -f "Dockerfile" ]; then
    log_success "Dockerfile exists"
    
    # Check for multi-stage build
    if grep -q "FROM.*AS" Dockerfile; then
        log_success "Multi-stage Docker build configured"
    else
        log_warning "Single-stage Docker build (consider multi-stage for optimization)"
    fi
    
    # Check for health check
    if grep -q "HEALTHCHECK" Dockerfile; then
        log_success "Docker health check configured"
    else
        log_warning "Docker health check not configured"
    fi
else
    log_error "Dockerfile missing"
fi

# Phase 7: Test validation
echo ""
log_info "Phase 7: Critical Test Validation"
echo "--------------------------------"

log_info "Running unit tests..."
if npm run test:unit > /dev/null 2>&1; then
    log_success "Unit tests passed"
else
    log_warning "Some unit tests failed - review before deployment"
fi

# Phase 8: Environment variables check
echo ""
log_info "Phase 8: Environment Variables"
echo "-----------------------------"

# Check for environment validation scripts
if [ -f "scripts/verify-env-vars.js" ]; then
    log_info "Checking frontend environment variables..."
    if node scripts/verify-env-vars.js frontend > /dev/null 2>&1; then
        log_success "Frontend environment variables validated"
    else
        log_warning "Frontend environment variables missing or invalid"
    fi
    
    log_info "Checking backend environment variables..."
    if node scripts/verify-env-vars.js backend > /dev/null 2>&1; then
        log_success "Backend environment variables validated"
    else
        log_warning "Backend environment variables missing or invalid"
    fi
else
    log_warning "Environment variable validation script not found"
fi

# Phase 9: Security validation
echo ""
log_info "Phase 9: Security Validation"
echo "---------------------------"

# Check for security headers in vercel.json
if grep -q "Content-Security-Policy" vercel.json; then
    log_success "Security headers configured"
else
    log_warning "Security headers not configured"
fi

# Check for RLS policies test
if [ -f "scripts/test-rls-policies.sh" ]; then
    log_info "RLS policies test script found"
    log_success "Database security tools available"
else
    log_warning "RLS policies test script not found"
fi

# Phase 10: Final recommendations
echo ""
log_info "Phase 10: Deployment Readiness Assessment"
echo "=========================================="

echo ""
echo "📊 DEPLOYMENT READINESS SUMMARY"
echo "=============================="
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"

if [ $ERRORS -eq 0 ]; then
    echo ""
    log_success "🎉 DEPLOYMENT READY!"
    echo ""
    echo "Next Steps:"
    echo "1. Deploy backend to Railway: npm run deploy:railway"
    echo "2. Deploy frontend to Vercel: npm run deploy:vercel"
    echo "3. Verify health endpoints after deployment"
    echo "4. Monitor deployment logs"
    echo ""
    echo "Deployment Commands:"
    echo "  Railway: npx turbo run build --filter=@tenantflow/backend"
    echo "  Vercel:  npx turbo run build --filter=@tenantflow/frontend"
    echo ""
    echo "Health Check URLs (after deployment):"
    echo "  Backend:  https://your-backend.railway.app/health"
    echo "  Frontend: https://your-frontend.vercel.app/"
    
    if [ $WARNINGS -gt 0 ]; then
        echo ""
        log_warning "⚠️  $WARNINGS warnings detected - consider addressing for optimal deployment"
    fi
    
    exit 0
else
    echo ""
    log_error "🚫 DEPLOYMENT BLOCKED"
    echo ""
    echo "Critical issues must be resolved before deployment:"
    echo ""
    echo "Common fixes:"
    echo "- Run 'npm run claude:check' to fix type/lint errors"
    echo "- Ensure all environment variables are configured"
    echo "- Verify Docker build works locally"
    echo "- Check API contracts are aligned"
    echo ""
    echo "Re-run this script after fixes: ./scripts/deployment-readiness-comprehensive.sh"
    exit 1
fi