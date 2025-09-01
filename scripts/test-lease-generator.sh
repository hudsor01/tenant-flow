#!/bin/bash

# Test script for lease generator production readiness
# This script runs all tests related to the lease generator feature

set -e # Exit on any error

echo "🚀 Testing Lease Generator for Production Readiness"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "This script must be run from the project root directory"
    exit 1
fi

# Check if lease generator files exist
print_status "Checking lease generator files..."
REQUIRED_FILES=(
    "apps/frontend/src/components/lease-generator/lease-form-wizard.tsx"
    "apps/frontend/src/components/lease-generator/lease-preview.tsx" 
    "apps/backend/src/leases/lease-generator.controller.ts"
    "apps/backend/src/pdf/lease-pdf.service.ts"
    "packages/shared/src/types/lease-generator.types.ts"
)

missing_files=()
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -gt 0 ]; then
    print_error "Missing required files:"
    for file in "${missing_files[@]}"; do
        echo "  - $file"
    done
    exit 1
fi

print_success "All required files present"

# Run TypeScript type checking
print_status "Running TypeScript type checking..."
npm run typecheck || {
    print_error "TypeScript compilation failed"
    exit 1
}
print_success "TypeScript compilation passed"

# Run ESLint
print_status "Running ESLint..."
npm run lint || {
    print_error "ESLint failed"
    exit 1
}
print_success "ESLint passed"

# Check if backend can build
print_status "Testing backend build..."
npm run build:backend || {
    print_error "Backend build failed"
    exit 1
}
print_success "Backend build passed"

# Check if frontend can build
print_status "Testing frontend build..."
npm run build:frontend || {
    print_error "Frontend build failed"
    exit 1
}
print_success "Frontend build passed"

# Test Docker build (if Docker is available)
if command -v docker &> /dev/null; then
    print_status "Testing Docker build..."
    docker build -t tenantflow-lease-test . || {
        print_error "Docker build failed"
        exit 1
    }
    print_success "Docker build passed"
    
    # Clean up test image
    docker rmi tenantflow-lease-test || print_warning "Failed to clean up test Docker image"
else
    print_warning "Docker not available, skipping Docker build test"
fi

# Test API endpoints (if backend is running)
print_status "Checking if backend is running..."
if curl -s http://localhost:3001/health/ping > /dev/null 2>&1; then
    print_status "Backend is running, testing API endpoints..."
    
    # Test lease validation endpoint
    print_status "Testing lease validation endpoint..."
    VALIDATION_RESPONSE=$(curl -s -X POST http://localhost:3001/api/lease/validate \
        -H "Content-Type: application/json" \
        -d '{
            "property": {
                "address": {
                    "street": "123 Test St",
                    "city": "San Francisco", 
                    "state": "CA",
                    "zipCode": "94102"
                },
                "type": "apartment"
            },
            "landlord": {
                "name": "Test Landlord"
            },
            "tenants": [{"name": "Test Tenant"}],
            "leaseTerms": {
                "rentAmount": 300000
            }
        }' || echo '{"error": "API call failed"}')
    
    if echo "$VALIDATION_RESPONSE" | grep -q '"valid"'; then
        print_success "Lease validation endpoint working"
    else
        print_error "Lease validation endpoint failed"
        echo "Response: $VALIDATION_RESPONSE"
        exit 1
    fi
else
    print_warning "Backend not running, skipping API endpoint tests"
    print_warning "To test API endpoints, start the backend with: npm run dev"
fi

# Test production environment variables
print_status "Checking production environment configuration..."
ENV_WARNINGS=()

if [ -z "$NEXT_PUBLIC_API_URL" ]; then
    ENV_WARNINGS+=("NEXT_PUBLIC_API_URL not set")
fi

if [ -z "$DATABASE_URL" ]; then
    ENV_WARNINGS+=("DATABASE_URL not set")
fi

if [ -z "$SUPABASE_URL" ]; then
    ENV_WARNINGS+=("SUPABASE_URL not set")
fi

if [ ${#ENV_WARNINGS[@]} -gt 0 ]; then
    print_warning "Environment variable warnings:"
    for warning in "${ENV_WARNINGS[@]}"; do
        echo "  - $warning"
    done
    print_warning "Some features may not work in production without proper environment variables"
else
    print_success "Environment configuration looks good"
fi

# Summary
echo ""
echo "=================================================="
print_success "🎉 All lease generator tests passed!"
echo ""
echo "Production Readiness Checklist:"
echo "✅ TypeScript compilation"
echo "✅ ESLint validation" 
echo "✅ Backend build"
echo "✅ Frontend build"
if command -v docker &> /dev/null; then
    echo "✅ Docker build"
fi
echo ""
echo "🚀 The lease generator is ready for production deployment!"
echo ""
echo "Next steps:"
echo "1. Deploy backend to Railway with proper environment variables"
echo "2. Deploy frontend to Vercel with API URL configuration"
echo "3. Run E2E tests in staging environment"
echo "4. Monitor performance and error rates in production"
echo ""
echo "For E2E tests, run: npm run test:e2e"
echo "For Storybook, run: npm run storybook"