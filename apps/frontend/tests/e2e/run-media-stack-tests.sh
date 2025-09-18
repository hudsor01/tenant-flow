#!/bin/bash

# Media Stack Services Test Runner
# Runs comprehensive tests against all media stack services

echo "🎬 Starting Media Stack Services Health Check"
echo "=============================================="

# Set script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_DIR"

echo "📁 Project Directory: $PROJECT_DIR"
echo "🧪 Test Directory: $SCRIPT_DIR"

# Create test results directory
mkdir -p "./tests/e2e/media-stack-test"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules not found. Installing dependencies..."
    npm install
fi

echo ""
echo "🚀 Running Media Stack Tests..."
echo ""

# Run tests with standalone configuration
if [ "$1" == "all" ]; then
    echo "Running all individual service tests..."
    npx playwright test --config=./tests/e2e/media-stack.config.ts --project=media-stack-chrome
else
    echo "Running comprehensive test (all services at once)..."
    npx playwright test --config=./tests/e2e/media-stack.config.ts --project=media-stack-chrome --grep "All Media Stack Services - Comprehensive Check"
fi

TEST_EXIT_CODE=$?

echo ""
echo "=============================================="

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ Media Stack Tests Completed Successfully"
else
    echo "⚠️  Media Stack Tests Completed with Issues"
fi

# Check if HTML report was generated
HTML_REPORT="./tests/e2e/media-stack-test/media-stack-report.html"
JSON_REPORT="./tests/e2e/media-stack-test/media-stack-results.json"

if [ -f "$HTML_REPORT" ]; then
    echo "📊 HTML Report: $HTML_REPORT"
    echo "   Open this file in your browser to view the detailed report"
fi

if [ -f "$JSON_REPORT" ]; then
    echo "📋 JSON Results: $JSON_REPORT"
    echo "   Machine-readable results for automation"
fi

# List screenshots
SCREENSHOT_DIR="./tests/e2e/media-stack-test"
if [ -d "$SCREENSHOT_DIR" ] && [ "$(ls -A "$SCREENSHOT_DIR"/*.png 2>/dev/null)" ]; then
    echo ""
    echo "📸 Screenshots saved:"
    ls -la "$SCREENSHOT_DIR"/*.png 2>/dev/null | while read line; do
        echo "   $(echo "$line" | awk '{print $9}')"
    done
fi

echo ""
echo "💡 Usage:"
echo "   ./run-media-stack-tests.sh       # Run comprehensive test"
echo "   ./run-media-stack-tests.sh all   # Run all individual tests"
echo ""

exit $TEST_EXIT_CODE