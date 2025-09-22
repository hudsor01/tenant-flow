#!/bin/bash

# Dashboard UI/UX Testing Script with Screenshot and Console Capture
# This script runs comprehensive tests on all dashboard views and generates reports

set -e

echo "🚀 Starting TenantFlow Dashboard UI/UX Testing Suite"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create test results directory
mkdir -p test-results
mkdir -p test-results/screenshots
mkdir -p test-results/console-logs

# Function to check if server is running
check_server() {
    echo "⏳ Checking if development server is running..."
    if curl -s http://localhost:3005 > /dev/null; then
        echo -e "${GREEN}✓ Development server is running${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠ Development server not detected${NC}"
        return 1
    fi
}

# Function to start dev server if needed
start_server() {
    if ! check_server; then
        echo "🔧 Starting development server..."
        pnpm dev &
        SERVER_PID=$!

        # Wait for server to be ready
        echo "⏳ Waiting for server to be ready..."
        for i in {1..30}; do
            if curl -s http://localhost:3005 > /dev/null; then
                echo -e "${GREEN}✓ Server is ready${NC}"
                break
            fi
            sleep 2
        done
    fi
}

# Function to run tests
run_tests() {
    echo ""
    echo "🧪 Running Playwright tests..."
    echo "------------------------------"

    # Run tests with different configurations
    npx playwright test dashboard-complete.spec.ts \
        --project=chromium-mvp \
        --reporter=html,json,list \
        --output=test-results \
        || TEST_FAILED=1

    # Run mobile tests
    echo ""
    echo "📱 Running mobile responsiveness tests..."
    npx playwright test dashboard-complete.spec.ts \
        --project=mobile-chrome \
        --grep="Responsive" \
        || MOBILE_TEST_FAILED=1
}

# Function to generate report
generate_report() {
    echo ""
    echo "📊 Generating test report..."
    echo "---------------------------"

    # Create markdown report
    cat > test-results/dashboard-test-report.md << EOF
# TenantFlow Dashboard Test Report
Generated: $(date)

## Test Summary

### ✅ Tested Views:
- Dashboard Overview
- Properties List & New Property Form
- Tenants Management
- Leases Management
- Payments & Invoices
- Maintenance Requests

### 📸 Screenshots
All screenshots are available in \`test-results/screenshots/\`

### 📝 Console Logs
Console outputs are captured in \`test-results/console-logs/\`

### 🎭 Visual Regression Tests
Baseline screenshots are stored for comparison

## Test Results
EOF

    # Parse JSON results if available
    if [ -f "test-results/results.json" ]; then
        echo "" >> test-results/dashboard-test-report.md
        echo "### Detailed Results:" >> test-results/dashboard-test-report.md
        node -e "
            const results = require('./test-results/results.json');
            const { suites } = results;
            suites.forEach(suite => {
                console.log('- **' + suite.title + '**');
                suite.specs.forEach(spec => {
                    const status = spec.ok ? '✅' : '❌';
                    console.log('  ' + status + ' ' + spec.title);
                });
            });
        " >> test-results/dashboard-test-report.md 2>/dev/null || echo "Could not parse JSON results" >> test-results/dashboard-test-report.md
    fi

    echo -e "${GREEN}✓ Report generated at test-results/dashboard-test-report.md${NC}"
}

# Function to open reports
open_reports() {
    echo ""
    echo "📂 Opening test reports..."

    # Open HTML report if available
    if [ -f "test-results/html/index.html" ]; then
        echo "Opening HTML report..."
        open test-results/html/index.html 2>/dev/null || xdg-open test-results/html/index.html 2>/dev/null || echo "Please open test-results/html/index.html manually"
    fi

    # Show summary
    echo ""
    echo "=================================================="
    echo -e "${GREEN}🎉 Testing Complete!${NC}"
    echo ""
    echo "📁 Test artifacts location:"
    echo "  - HTML Report: test-results/html/index.html"
    echo "  - Screenshots: test-results/screenshots/"
    echo "  - Console Logs: test-results/console-logs/"
    echo "  - Markdown Report: test-results/dashboard-test-report.md"
    echo ""

    if [ "$TEST_FAILED" = "1" ] || [ "$MOBILE_TEST_FAILED" = "1" ]; then
        echo -e "${RED}⚠️  Some tests failed. Check the reports for details.${NC}"
        exit 1
    else
        echo -e "${GREEN}✅ All tests passed successfully!${NC}"
    fi
}

# Main execution
main() {
    # Check dependencies
    if ! command -v npx &> /dev/null; then
        echo -e "${RED}❌ npx is not installed${NC}"
        exit 1
    fi

    # Install Playwright if needed
    if ! npx playwright --version &> /dev/null; then
        echo "📦 Installing Playwright..."
        npx playwright install
    fi

    # Start server if needed
    start_server

    # Run tests
    run_tests

    # Generate report
    generate_report

    # Open reports
    open_reports

    # Cleanup
    if [ ! -z "$SERVER_PID" ]; then
        echo "🧹 Stopping development server..."
        kill $SERVER_PID 2>/dev/null || true
    fi
}

# Handle interruption
trap 'echo ""; echo "🛑 Test interrupted"; [ ! -z "$SERVER_PID" ] && kill $SERVER_PID 2>/dev/null; exit 1' INT

# Run main function
main
