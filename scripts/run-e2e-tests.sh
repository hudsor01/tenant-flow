#!/bin/bash

# TenantFlow E2E Test Runner Script
# This script manages the complete E2E test execution pipeline

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Default values
MODE="headless"
BROWSER="chromium"
WORKERS=1
GREP=""
PROJECT=""
UPDATE_SNAPSHOTS=false
DEBUG=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --headed)
            MODE="headed"
            shift
            ;;
        --ui)
            MODE="ui"
            shift
            ;;
        --browser)
            BROWSER="$2"
            shift 2
            ;;
        --workers)
            WORKERS="$2"
            shift 2
            ;;
        --grep)
            GREP="$2"
            shift 2
            ;;
        --project)
            PROJECT="$2"
            shift 2
            ;;
        --update-snapshots)
            UPDATE_SNAPSHOTS=true
            shift
            ;;
        --debug)
            DEBUG=true
            shift
            ;;
        -h|--help)
            echo "TenantFlow E2E Test Runner"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --headed              Run tests with browser visible"
            echo "  --ui                  Run tests with Playwright UI"
            echo "  --browser BROWSER     Run on specific browser (chromium, firefox, webkit)"
            echo "  --workers NUM         Number of parallel workers (default: 1)"
            echo "  --grep PATTERN        Run tests matching pattern"
            echo "  --project PROJECT     Run specific project only"
            echo "  --update-snapshots    Update visual snapshots"
            echo "  --debug               Enable debug mode"
            echo "  -h, --help           Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                    Run all tests headless"
            echo "  $0 --headed           Run tests with browser visible"
            echo "  $0 --ui               Open Playwright UI"
            echo "  $0 --grep \"auth\"      Run only authentication tests"
            echo "  $0 --browser firefox  Run tests in Firefox"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Global variables for process management
FRONTEND_PID=""
BACKEND_PID=""
TEST_EXIT_CODE=0

# Cleanup function
cleanup() {
    log_info "Cleaning up test environment..."
    
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID >/dev/null 2>&1 || true
        log_info "Stopped frontend server (PID: $FRONTEND_PID)"
    fi
    
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID >/dev/null 2>&1 || true
        log_info "Stopped backend server (PID: $BACKEND_PID)"
    fi
    
    # Kill any remaining processes
    pkill -f "vite.*5173" >/dev/null 2>&1 || true
    pkill -f "nest.*3000" >/dev/null 2>&1 || true
    
    log_success "Cleanup completed"
}

# Setup signal handlers
trap cleanup EXIT
trap cleanup INT
trap cleanup TERM

# Check if services are already running
check_existing_services() {
    if curl -s http://tenantflow.app >/dev/null 2>&1; then
        log_warning "Frontend service already running on port 5173"
        log_info "Using existing frontend service"
        FRONTEND_RUNNING=true
    else
        FRONTEND_RUNNING=false
    fi
    
    if curl -s http://tenantflow.app/health >/dev/null 2>&1; then
        log_warning "Backend service already running on port 3000"
        log_info "Using existing backend service"
        BACKEND_RUNNING=true
    else
        BACKEND_RUNNING=false
    fi
}

# Start development servers
start_services() {
    log_info "Starting development servers..."
    
    # Start backend if not running
    if [ "$BACKEND_RUNNING" = false ]; then
        log_info "Starting backend server..."
        cd apps/backend
        npm run dev > ../../backend.log 2>&1 &
        BACKEND_PID=$!
        cd ../..
        
        # Wait for backend to be ready
        log_info "Waiting for backend to be ready..."
        for i in {1..30}; do
            if curl -s http://tenantflow.app/health >/dev/null 2>&1; then
                log_success "Backend is ready"
                break
            fi
            if [ $i -eq 30 ]; then
                log_error "Backend failed to start within 30 seconds"
                exit 1
            fi
            sleep 1
        done
    fi
    
    # Start frontend if not running
    if [ "$FRONTEND_RUNNING" = false ]; then
        log_info "Starting frontend server..."
        cd apps/frontend
        npm run dev > ../../frontend.log 2>&1 &
        FRONTEND_PID=$!
        cd ../..
        
        # Wait for frontend to be ready
        log_info "Waiting for frontend to be ready..."
        for i in {1..30}; do
            if curl -s http://tenantflow.app >/dev/null 2>&1; then
                log_success "Frontend is ready"
                break
            fi
            if [ $i -eq 30 ]; then
                log_error "Frontend failed to start within 30 seconds"
                exit 1
            fi
            sleep 1
        done
    fi
}

# Seed test data
seed_test_data() {
    log_info "Seeding test data..."
    npm run test:seed
    log_success "Test data seeded successfully"
}

# Run the actual tests
run_tests() {
    log_info "Running E2E tests..."
    
    # Build Playwright command
    PLAYWRIGHT_CMD="npx playwright test"
    
    # Add options based on mode
    case $MODE in
        "headed")
            PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --headed"
            ;;
        "ui")
            PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --ui"
            ;;
    esac
    
    # Add browser filter
    if [ ! -z "$BROWSER" ] && [ "$BROWSER" != "all" ]; then
        PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --project=$BROWSER"
    fi
    
    # Add project filter
    if [ ! -z "$PROJECT" ]; then
        PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --project=$PROJECT"
    fi
    
    # Add grep filter
    if [ ! -z "$GREP" ]; then
        PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --grep=\"$GREP\""
    fi
    
    # Add workers
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --workers=$WORKERS"
    
    # Add update snapshots
    if [ "$UPDATE_SNAPSHOTS" = true ]; then
        PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --update-snapshots"
    fi
    
    # Add debug mode
    if [ "$DEBUG" = true ]; then
        PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --debug"
    fi
    
    log_info "Executing: $PLAYWRIGHT_CMD"
    
    # Run the tests
    eval $PLAYWRIGHT_CMD
    TEST_EXIT_CODE=$?
    
    if [ $TEST_EXIT_CODE -eq 0 ]; then
        log_success "All tests passed! 🎉"
    else
        log_error "Some tests failed"
    fi
}

# Generate test report
generate_report() {
    log_info "Generating test report..."
    
    if [ -d "test-results" ]; then
        # Generate HTML report
        npx playwright show-report test-results/playwright-report
        
        log_success "Test report generated at test-results/playwright-report/index.html"
    else
        log_warning "No test results found"
    fi
}

# Cleanup test data
cleanup_test_data() {
    log_info "Cleaning up test data..."
    npm run test:cleanup
    log_success "Test data cleaned up"
}

# Main execution function
main() {
    echo "🧪 TenantFlow E2E Test Runner"
    echo "============================="
    echo ""
    
    log_info "Test configuration:"
    echo "  Mode: $MODE"
    echo "  Browser: $BROWSER"
    echo "  Workers: $WORKERS"
    [ ! -z "$GREP" ] && echo "  Grep: $GREP"
    [ ! -z "$PROJECT" ] && echo "  Project: $PROJECT"
    [ "$UPDATE_SNAPSHOTS" = true ] && echo "  Update Snapshots: Yes"
    [ "$DEBUG" = true ] && echo "  Debug Mode: Yes"
    echo ""
    
    # Execute test pipeline
    check_existing_services
    start_services
    seed_test_data
    
    # Run tests
    run_tests
    
    # Post-test actions
    cleanup_test_data
    
    # Show results
    if [ $TEST_EXIT_CODE -eq 0 ]; then
        log_success "🎉 E2E test run completed successfully!"
    else
        log_error "❌ E2E test run failed"
    fi
    
    # Generate report if tests were run
    if [ "$MODE" != "ui" ]; then
        generate_report
    fi
    
    exit $TEST_EXIT_CODE
}

# Run main function
main "$@"