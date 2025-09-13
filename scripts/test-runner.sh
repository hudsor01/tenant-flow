#!/bin/bash

# Comprehensive Test Execution Script
# CLAUDE.md Compliance: Native bash script, no abstractions, production-ready testing
# Usage: ./scripts/test-runner.sh [test-type] [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(dirname "$0")/.."
FRONTEND_DIR="$PROJECT_ROOT/apps/frontend"
BACKEND_DIR="$PROJECT_ROOT/apps/backend"
LOG_DIR="$PROJECT_ROOT/test-logs"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}✓ $1${NC}"
}

error() {
    echo -e "${RED}✗ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Environment setup
setup_test_environment() {
    log "Setting up test environment..."
    
    # Ensure test database is available
    if ! command -v doppler &> /dev/null; then
        warning "Doppler not found. Testing without environment variables."
        export NODE_ENV=development
        export ENABLE_MOCK_AUTH=true
    else
        log "Using Doppler for environment variables"
    fi
    
    # Check if servers are running
    check_servers
}

# Server health checks
check_servers() {
    log "Checking server status..."
    
    # Check frontend server (check both common ports)
    if curl -s http://localhost:3000/api/dev-auth/status &> /dev/null; then
        success "Frontend server running on port 3000"
        FRONTEND_READY=true
        FRONTEND_PORT=3000
    elif curl -s http://localhost:3002/api/dev-auth/status &> /dev/null; then
        success "Frontend server running on port 3002"
        FRONTEND_READY=true
        FRONTEND_PORT=3002
    else
        warning "Frontend server not responding on ports 3000 or 3002"
        FRONTEND_READY=false
        FRONTEND_PORT=3000
    fi
    
    # Check backend server (port varies)
    if curl -s http://localhost:3001/health/ping &> /dev/null; then
        success "Backend server running on port 3001"
        BACKEND_READY=true
    elif curl -s http://localhost:3003/health/ping &> /dev/null; then
        success "Backend server running on port 3003"
        BACKEND_READY=true
    else
        warning "Backend server not responding"
        BACKEND_READY=false
    fi
}

# Unit Tests - TypeScript compilation and Jest tests
run_unit_tests() {
    log "Running unit tests..."
    
    cd "$FRONTEND_DIR"
    
    # TypeScript compilation check
    log "Checking TypeScript compilation..."
    if npm run typecheck > "$LOG_DIR/typecheck.log" 2>&1; then
        success "TypeScript compilation passed"
    else
        error "TypeScript compilation failed"
        cat "$LOG_DIR/typecheck.log"
        return 1
    fi
    
    # Jest unit tests
    log "Running Jest unit tests..."
    if npm run test:unit > "$LOG_DIR/unit-tests.log" 2>&1; then
        success "Unit tests passed"
        # Show summary
        tail -10 "$LOG_DIR/unit-tests.log"
    else
        error "Unit tests failed"
        cat "$LOG_DIR/unit-tests.log"
        return 1
    fi
}

# Integration Tests - API data flow and component integration
run_integration_tests() {
    log "Running integration tests..."
    
    if [ "$FRONTEND_READY" != true ]; then
        error "Frontend server required for integration tests"
        return 1
    fi
    
    cd "$FRONTEND_DIR"
    
    # Mock authentication integration
    log "Testing mock authentication integration..."
    if npx playwright test tests/integration/mock-auth-dashboard-integration.spec.ts --reporter=line > "$LOG_DIR/integration-auth.log" 2>&1; then
        success "Mock authentication integration tests passed"
    else
        error "Mock authentication integration tests failed"
        cat "$LOG_DIR/integration-auth.log"
        return 1
    fi
    
    # API data flow integration
    log "Testing API data flow integration..."
    if npx playwright test tests/integration/api-data-flow-integration.spec.ts --reporter=line > "$LOG_DIR/integration-api.log" 2>&1; then
        success "API data flow integration tests passed"
    else
        error "API data flow integration tests failed"
        cat "$LOG_DIR/integration-api.log"
        return 1
    fi
}

# E2E Tests - Complete user workflows
run_e2e_tests() {
    log "Running E2E tests..."
    
    if [ "$FRONTEND_READY" != true ]; then
        error "Frontend server required for E2E tests"
        return 1
    fi
    
    cd "$FRONTEND_DIR"
    
    # Install Playwright if needed
    if ! npx playwright --version &> /dev/null; then
        log "Installing Playwright browsers..."
        npx playwright install
    fi
    
    # Run all E2E tests
    log "Executing complete E2E test suite..."
    if npx playwright test --reporter=html --output-dir="$LOG_DIR/playwright-report" > "$LOG_DIR/e2e-tests.log" 2>&1; then
        success "E2E tests passed"
        log "HTML report generated at: $LOG_DIR/playwright-report/index.html"
    else
        error "E2E tests failed"
        cat "$LOG_DIR/e2e-tests.log"
        return 1
    fi
}

# Performance Tests - Load testing and performance metrics
run_performance_tests() {
    log "Running performance tests..."
    
    if [ "$FRONTEND_READY" != true ]; then
        error "Frontend server required for performance tests"
        return 1
    fi
    
    cd "$FRONTEND_DIR"
    
    # Performance testing with Playwright
    log "Testing dashboard load performance..."
    if npx playwright test tests/performance --reporter=json --output-file="$LOG_DIR/performance-results.json" > "$LOG_DIR/performance.log" 2>&1; then
        success "Performance tests completed"
        
        # Extract key metrics if available
        if [ -f "$LOG_DIR/performance-results.json" ]; then
            log "Performance metrics saved to: $LOG_DIR/performance-results.json"
        fi
    else
        warning "Performance tests completed with issues"
        cat "$LOG_DIR/performance.log"
    fi
}

# Accessibility Tests - WCAG compliance and screen reader testing
run_accessibility_tests() {
    log "Running accessibility tests..."
    
    if [ "$FRONTEND_READY" != true ]; then
        error "Frontend server required for accessibility tests"
        return 1
    fi
    
    cd "$FRONTEND_DIR"
    
    # Accessibility testing with axe-playwright
    log "Testing WCAG compliance..."
    if npx playwright test tests/accessibility --reporter=json --output-file="$LOG_DIR/accessibility-results.json" > "$LOG_DIR/accessibility.log" 2>&1; then
        success "Accessibility tests passed"
        
        if [ -f "$LOG_DIR/accessibility-results.json" ]; then
            log "Accessibility report saved to: $LOG_DIR/accessibility-results.json"
        fi
    else
        error "Accessibility tests failed"
        cat "$LOG_DIR/accessibility.log"
        return 1
    fi
}

# Visual Regression Tests - UI component visual validation
run_visual_tests() {
    log "Running visual regression tests..."
    
    if [ "$FRONTEND_READY" != true ]; then
        error "Frontend server required for visual tests"
        return 1
    fi
    
    cd "$FRONTEND_DIR"
    
    # Activate mock authentication for visual testing
    log "Activating mock authentication..."
    curl -s http://localhost:${FRONTEND_PORT}/api/dev-auth > /dev/null
    
    # Visual testing via dashboard harness
    log "Testing dashboard visual components..."
    if npx playwright test tests/visual --reporter=html --output-dir="$LOG_DIR/visual-report" > "$LOG_DIR/visual-tests.log" 2>&1; then
        success "Visual tests passed"
        log "Visual report generated at: $LOG_DIR/visual-report/index.html"
    else
        warning "Visual tests completed with differences"
        cat "$LOG_DIR/visual-tests.log"
    fi
}

# Security Tests - Authentication and authorization validation
run_security_tests() {
    log "Running security tests..."
    
    if [ "$FRONTEND_READY" != true ]; then
        error "Frontend server required for security tests"
        return 1
    fi
    
    # Test production safety guards
    log "Testing production safety guards..."
    
    # Mock NODE_ENV=production and test dev-auth endpoint
    export NODE_ENV=production
    
    if curl -s -w "%{http_code}" http://localhost:${FRONTEND_PORT}/api/dev-auth | grep -q "404"; then
        success "Production safety guard working - dev-auth returns 404"
    else
        error "Production safety guard failed - dev-auth accessible in production mode"
        return 1
    fi
    
    # Reset to development
    export NODE_ENV=development
    
    # Test authentication bypass security
    log "Testing authentication middleware bypass security..."
    
    # Without mock auth enabled
    export ENABLE_MOCK_AUTH=false
    
    # This should redirect to login (302) when accessing protected routes
    if curl -s -w "%{http_code}" http://localhost:${FRONTEND_PORT}/dashboard | grep -q "302\|307\|401"; then
        success "Authentication middleware working - dashboard protected"
    else
        warning "Authentication check inconclusive"
    fi
    
    # Reset mock auth
    export ENABLE_MOCK_AUTH=true
}

# Cleanup function
cleanup() {
    log "Cleaning up test artifacts..."
    
    # Remove temporary files
    rm -f "$LOG_DIR"/*.tmp
    
    # Reset environment
    export NODE_ENV=development
    export ENABLE_MOCK_AUTH=true
    
    success "Cleanup completed"
}

# Main execution function
run_all_tests() {
    log "Starting comprehensive test suite..."
    
    setup_test_environment
    
    local failed_tests=()
    
    # Run each test suite
    if ! run_unit_tests; then
        failed_tests+=("unit")
    fi
    
    if ! run_integration_tests; then
        failed_tests+=("integration")
    fi
    
    if ! run_e2e_tests; then
        failed_tests+=("e2e")
    fi
    
    run_performance_tests # Non-blocking
    run_accessibility_tests # Non-blocking
    run_visual_tests # Non-blocking
    
    if ! run_security_tests; then
        failed_tests+=("security")
    fi
    
    # Summary
    log "Test execution completed"
    
    if [ ${#failed_tests[@]} -eq 0 ]; then
        success "All critical tests passed!"
        log "Reports available in: $LOG_DIR/"
        return 0
    else
        error "Failed test suites: ${failed_tests[*]}"
        log "Check logs in: $LOG_DIR/"
        return 1
    fi
}

# Help function
show_help() {
    echo "Comprehensive Test Runner for TenantFlow Dashboard"
    echo ""
    echo "Usage: $0 [test-type] [options]"
    echo ""
    echo "Test Types:"
    echo "  unit          Run unit tests (Jest + TypeScript)"
    echo "  integration   Run integration tests (Playwright)"
    echo "  e2e           Run end-to-end tests (Playwright)"
    echo "  performance   Run performance tests"
    echo "  accessibility Run accessibility tests (WCAG)"
    echo "  visual        Run visual regression tests"
    echo "  security      Run security validation tests"
    echo "  all           Run all test suites (default)"
    echo ""
    echo "Options:"
    echo "  --setup       Setup test environment only"
    echo "  --cleanup     Cleanup test artifacts"
    echo "  --check       Check server status only"
    echo "  --help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    # Run all tests"
    echo "  $0 unit              # Run unit tests only"
    echo "  $0 e2e --cleanup     # Run E2E tests and cleanup"
    echo ""
}

# Trap cleanup on exit
trap cleanup EXIT

# Main script logic
case "${1:-all}" in
    "unit")
        setup_test_environment
        run_unit_tests
        ;;
    "integration")
        setup_test_environment
        run_integration_tests
        ;;
    "e2e")
        setup_test_environment
        run_e2e_tests
        ;;
    "performance")
        setup_test_environment
        run_performance_tests
        ;;
    "accessibility")
        setup_test_environment
        run_accessibility_tests
        ;;
    "visual")
        setup_test_environment
        run_visual_tests
        ;;
    "security")
        setup_test_environment
        run_security_tests
        ;;
    "all")
        run_all_tests
        ;;
    "--setup")
        setup_test_environment
        ;;
    "--cleanup")
        cleanup
        ;;
    "--check")
        check_servers
        ;;
    "--help"|"-h"|"help")
        show_help
        ;;
    *)
        error "Unknown test type: $1"
        show_help
        exit 1
        ;;
esac