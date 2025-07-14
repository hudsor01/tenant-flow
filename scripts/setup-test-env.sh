#!/bin/bash

# TenantFlow E2E Test Environment Setup Script
# This script sets up the complete testing environment

set -e  # Exit on any error

echo "🚀 Setting up TenantFlow E2E test environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if required commands exist
check_dependencies() {
    log_info "Checking dependencies..."
    
    commands=("node" "npm" "npx")
    for cmd in "${commands[@]}"; do
        if ! command -v $cmd &> /dev/null; then
            log_error "$cmd is not installed. Please install Node.js and npm first."
            exit 1
        fi
    done
    
    log_success "All dependencies are available"
}

# Setup environment variables
setup_env_vars() {
    log_info "Setting up environment variables..."
    
    # Copy example env files if they don't exist
    if [ ! -f ".env.test" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env.test
            log_success "Created .env.test from .env.example"
        else
            log_warning ".env.example not found, creating basic .env.test"
            cat > .env.test << EOF
NODE_ENV=test
TEST_DATABASE_URL=postgresql://postgres:password@localhost:5432/tenantflow_test
PLAYWRIGHT_BASE_URL=http://localhost:5173
EOF
        fi
    fi
    
    # Setup backend test env
    if [ ! -f "apps/backend/.env.test" ]; then
        if [ -f "apps/backend/.env.example" ]; then
            cp apps/backend/.env.example apps/backend/.env.test
            log_success "Created apps/backend/.env.test"
        else
            log_warning "Creating basic backend test environment"
            cat > apps/backend/.env.test << EOF
NODE_ENV=test
DATABASE_URL=\${TEST_DATABASE_URL}
JWT_SECRET=test-jwt-secret-key-for-e2e-testing
JWT_REFRESH_SECRET=test-refresh-secret-key-for-e2e-testing
FRONTEND_URL=http://localhost:5173
EOF
        fi
    fi
    
    # Setup frontend test env
    if [ ! -f "apps/frontend/.env.local.test" ]; then
        if [ -f "apps/frontend/.env.local.example" ]; then
            cp apps/frontend/.env.local.example apps/frontend/.env.local.test
            log_success "Created apps/frontend/.env.local.test"
        else
            log_warning "Creating basic frontend test environment"
            cat > apps/frontend/.env.local.test << EOF
VITE_API_URL=http://localhost:3000/api/v1
VITE_FRONTEND_URL=http://localhost:5173
NODE_ENV=test
EOF
        fi
    fi
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    # Install root dependencies
    npm install
    
    # Install Playwright browsers
    npx playwright install
    
    log_success "Dependencies installed successfully"
}

# Setup test database
setup_test_database() {
    log_info "Setting up test database..."
    
    # Check if PostgreSQL is running
    if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
        log_warning "PostgreSQL is not running on localhost:5432"
        log_info "Please ensure PostgreSQL is running or update TEST_DATABASE_URL in .env.test"
        log_info "You can also use Docker: docker run --name postgres-test -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:15"
    else
        log_success "PostgreSQL is running"
        
        # Create test database if it doesn't exist
        export PGPASSWORD=password
        if ! psql -h localhost -U postgres -lqt | cut -d \| -f 1 | grep -qw tenantflow_test; then
            createdb -h localhost -U postgres tenantflow_test
            log_success "Created test database: tenantflow_test"
        else
            log_success "Test database already exists"
        fi
    fi
}

# Build applications
build_applications() {
    log_info "Building applications..."
    
    # Build backend first
    cd apps/backend
    npm run generate
    npm run build
    cd ../..
    
    # Build frontend
    cd apps/frontend
    npm run build
    cd ../..
    
    log_success "Applications built successfully"
}

# Create test result directories
setup_test_directories() {
    log_info "Setting up test directories..."
    
    mkdir -p test-results/screenshots
    mkdir -p test-results/videos
    mkdir -p test-results/traces
    mkdir -p test-results/downloads
    
    log_success "Test directories created"
}

# Verify installation
verify_installation() {
    log_info "Verifying installation..."
    
    # Check if Playwright can run
    if npx playwright --version >/dev/null 2>&1; then
        log_success "Playwright is properly installed"
    else
        log_error "Playwright installation failed"
        exit 1
    fi
    
    # Check if backend can start (quick check)
    log_info "Checking backend health..."
    cd apps/backend
    timeout 10s npm run start:prod >/dev/null 2>&1 || log_warning "Backend health check timeout (this is normal)"
    cd ../..
    
    log_success "Installation verification completed"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up test processes..."
    # Kill any remaining test processes
    pkill -f "vite.*5173" >/dev/null 2>&1 || true
    pkill -f "nest.*3000" >/dev/null 2>&1 || true
    pkill -f "node.*backend" >/dev/null 2>&1 || true
}

# Setup signal handlers
trap cleanup EXIT
trap cleanup INT
trap cleanup TERM

# Main execution
main() {
    echo "📋 TenantFlow E2E Test Environment Setup"
    echo "========================================"
    
    check_dependencies
    setup_env_vars
    install_dependencies
    setup_test_database
    build_applications
    setup_test_directories
    verify_installation
    
    echo ""
    log_success "🎉 E2E test environment setup completed successfully!"
    echo ""
    echo "📚 Usage:"
    echo "  npm run test:e2e          - Run E2E tests headless"
    echo "  npm run test:e2e:headed   - Run E2E tests with browser"
    echo "  npm run test:e2e:ui       - Run E2E tests with Playwright UI"
    echo "  npm run test:all          - Run all tests (unit + E2E)"
    echo ""
    echo "🔧 Debugging:"
    echo "  npm run test:seed         - Seed test data"
    echo "  npm run test:cleanup      - Clean test data"
    echo ""
    echo "📖 View test reports at: test-results/playwright-report/index.html"
    echo ""
}

# Run main function
main "$@"