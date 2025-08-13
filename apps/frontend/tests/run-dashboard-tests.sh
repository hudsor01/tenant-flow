#!/bin/bash

# Dashboard Modernization Test Runner
# Runs comprehensive tests for all new dashboard features

set -e

echo "🚀 Starting Dashboard Modernization Tests"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if dev server is running
check_server() {
    echo "Checking if development server is running..."
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        print_status "Development server is running"
        return 0
    else
        print_warning "Development server not detected, tests will start it automatically"
        return 1
    fi
}

# Run specific test suites
run_tests() {
    echo ""
    echo "Running Dashboard Modernization Tests..."
    echo "----------------------------------------"
    
    # Run only our new dashboard demo tests
    npx playwright test tests/e2e/dashboard-features-demo.spec.ts --reporter=html,line
    
    if [ $? -eq 0 ]; then
        print_status "All dashboard feature tests passed!"
    else
        print_error "Some dashboard tests failed"
        return 1
    fi
}

# Run visual regression tests
run_visual_tests() {
    echo ""
    echo "Running Visual Regression Tests..."
    echo "----------------------------------"
    
    npx playwright test tests/e2e/dashboard-visual-demo.spec.ts --reporter=html,line
    
    if [ $? -eq 0 ]; then
        print_status "All visual regression tests passed!"
    else
        print_warning "Visual regression tests failed (this is normal on first run)"
        echo "Run 'npx playwright test --update-snapshots' to update baseline screenshots"
    fi
}

# Run mobile-specific tests
run_mobile_tests() {
    echo ""
    echo "Running Mobile Tests..."
    echo "-----------------------"
    
    npx playwright test tests/e2e/dashboard-features-demo.spec.ts --project=mobile-chrome --reporter=line
    
    if [ $? -eq 0 ]; then
        print_status "Mobile tests passed!"
    else
        print_error "Mobile tests failed"
        return 1
    fi
}

# Main execution
main() {
    check_server
    
    # Using demo route - no authentication setup needed
    print_status "Using demo route for testing (auth bypass enabled)"
    
    # Run the test suites
    run_tests
    
    # Optional: Run visual tests (may fail on first run)
    if [ "$1" = "--with-visual" ]; then
        run_visual_tests
    fi
    
    # Optional: Run mobile tests
    if [ "$1" = "--with-mobile" ] || [ "$2" = "--with-mobile" ]; then
        run_mobile_tests
    fi
    
    echo ""
    echo "🎉 Dashboard Modernization Tests Complete!"
    echo "=========================================="
    echo ""
    echo "📊 View detailed results:"
    echo "  npx playwright show-report"
    echo ""
    echo "📸 Update visual baselines (if needed):"
    echo "  npx playwright test --update-snapshots tests/e2e/dashboard-visual-demo.spec.ts"
    echo ""
    echo "🔄 Run specific tests:"
    echo "  npx playwright test tests/e2e/dashboard-features-demo.spec.ts --grep 'command palette'"
    echo "  npx playwright test tests/e2e/dashboard-features-demo.spec.ts --grep 'theme'"
    echo "  npx playwright test tests/e2e/dashboard-features-demo.spec.ts --grep 'mobile'"
}

# Help text
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Dashboard Modernization Test Runner"
    echo ""
    echo "Usage: ./run-dashboard-tests.sh [options]"
    echo ""
    echo "Options:"
    echo "  --with-visual    Include visual regression tests"
    echo "  --with-mobile    Include mobile-specific tests"
    echo "  --help, -h       Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./run-dashboard-tests.sh                    # Basic tests only"
    echo "  ./run-dashboard-tests.sh --with-visual      # Include visual tests"
    echo "  ./run-dashboard-tests.sh --with-mobile      # Include mobile tests"
    echo "  ./run-dashboard-tests.sh --with-visual --with-mobile  # All tests"
    exit 0
fi

# Run main function
main "$@"