#!/bin/bash

# TanStack Query Test Runner
# Comprehensive test execution for TanStack Query functionality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Test configuration
TEST_DIR="tests/tanstack"
CONFIG_FILE="tests/tanstack/playwright.config.ts"
RESULTS_DIR="tanstack-test-results"

echo -e "${BLUE}🚀 TenantFlow TanStack Query Test Suite${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Function to run specific test suite
run_test_suite() {
    local test_file=$1
    local description=$2
    local extra_args=${3:-""}
    
    echo -e "${YELLOW}Running: $description${NC}"
    echo -e "${PURPLE}File: $test_file${NC}"
    echo ""
    
    if npx playwright test "$test_file" --config="$CONFIG_FILE" $extra_args; then
        echo -e "${GREEN}✅ $description - PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ $description - FAILED${NC}"
        return 1
    fi
}

# Parse command line arguments
TEST_TYPE=${1:-"all"}
BROWSER=${2:-"chromium"}
MODE=${3:-"normal"}

echo -e "${BLUE}Test Configuration:${NC}"
echo -e "  Test Type: $TEST_TYPE"
echo -e "  Browser: $BROWSER"
echo -e "  Mode: $MODE"
echo ""

# Set browser project
PROJECT_ARG=""
case $BROWSER in
    "chrome"|"chromium")
        PROJECT_ARG="--project=tanstack-query-chrome"
        ;;
    "mobile")
        PROJECT_ARG="--project=tanstack-query-mobile"
        ;;
    "network")
        PROJECT_ARG="--project=tanstack-query-network-sim"
        ;;
    *)
        PROJECT_ARG="--project=tanstack-query-chrome"
        ;;
esac

# Set mode arguments
MODE_ARGS=""
case $MODE in
    "debug")
        MODE_ARGS="--debug --headed"
        ;;
    "trace")
        MODE_ARGS="--trace=on"
        ;;
    "video")
        MODE_ARGS="--video=on"
        ;;
    "ui")
        MODE_ARGS="--ui"
        ;;
    *)
        MODE_ARGS=""
        ;;
esac

# Ensure results directory exists
mkdir -p "$RESULTS_DIR"

# Track test results
PASSED_TESTS=0
FAILED_TESTS=0
TOTAL_TESTS=0

# Function to update test counters
update_counters() {
    if [ $1 -eq 0 ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

echo -e "${BLUE}Starting test execution...${NC}"
echo ""

case $TEST_TYPE in
    "optimistic"|"opt")
        run_test_suite "optimistic-updates.spec.ts" "Optimistic Updates Tests" "$PROJECT_ARG $MODE_ARGS"
        update_counters $?
        ;;
        
    "infinite"|"scroll")
        run_test_suite "infinite-scrolling.spec.ts" "Infinite Scrolling Tests" "$PROJECT_ARG $MODE_ARGS"
        update_counters $?
        ;;
        
    "error"|"errors")
        run_test_suite "error-handling.spec.ts" "Error Handling Tests" "$PROJECT_ARG $MODE_ARGS"
        update_counters $?
        ;;
        
    "cache")
        run_test_suite "cache-behavior.spec.ts" "Cache Behavior Tests" "$PROJECT_ARG $MODE_ARGS"
        update_counters $?
        ;;
        
    "workflow"|"workflows")
        run_test_suite "real-user-workflows.spec.ts" "Real User Workflow Tests" "$PROJECT_ARG $MODE_ARGS"
        update_counters $?
        ;;
        
    "critical")
        echo -e "${YELLOW}Running Critical Test Suite${NC}"
        echo ""
        
        run_test_suite "optimistic-updates.spec.ts" "Optimistic Updates (Critical)" "$PROJECT_ARG $MODE_ARGS"
        update_counters $?
        echo ""
        
        run_test_suite "infinite-scrolling.spec.ts" "Infinite Scrolling (Critical)" "$PROJECT_ARG $MODE_ARGS"
        update_counters $?
        echo ""
        
        run_test_suite "real-user-workflows.spec.ts" "User Workflows (Critical)" "$PROJECT_ARG $MODE_ARGS"
        update_counters $?
        ;;
        
    "regression")
        echo -e "${YELLOW}Running Regression Test Suite${NC}"
        echo ""
        
        run_test_suite "cache-behavior.spec.ts" "Cache Behavior (Regression)" "$PROJECT_ARG $MODE_ARGS"
        update_counters $?
        echo ""
        
        run_test_suite "error-handling.spec.ts" "Error Handling (Regression)" "$PROJECT_ARG $MODE_ARGS"
        update_counters $?
        ;;
        
    "performance"|"perf")
        echo -e "${YELLOW}Running Performance Test Suite${NC}"
        echo ""
        
        # Run with performance monitoring
        PERF_ARGS="$PROJECT_ARG $MODE_ARGS --reporter=json --output-dir=$RESULTS_DIR"
        
        run_test_suite "infinite-scrolling.spec.ts" "Infinite Scroll Performance" "$PERF_ARGS"
        update_counters $?
        echo ""
        
        run_test_suite "real-user-workflows.spec.ts" "Workflow Performance" "$PERF_ARGS"
        update_counters $?
        ;;
        
    "smoke")
        echo -e "${YELLOW}Running Smoke Test Suite${NC}"
        echo ""
        
        # Quick smoke tests with shorter timeouts
        SMOKE_ARGS="$PROJECT_ARG --timeout=30000 --grep='should show immediate UI update|should load first page|should handle complete network failure'"
        
        run_test_suite "optimistic-updates.spec.ts" "Optimistic Updates (Smoke)" "$SMOKE_ARGS"
        update_counters $?
        echo ""
        
        run_test_suite "infinite-scrolling.spec.ts" "Infinite Scrolling (Smoke)" "$SMOKE_ARGS"
        update_counters $?
        ;;
        
    "all"|*)
        echo -e "${YELLOW}Running Complete Test Suite${NC}"
        echo ""
        
        run_test_suite "optimistic-updates.spec.ts" "Optimistic Updates" "$PROJECT_ARG $MODE_ARGS"
        update_counters $?
        echo ""
        
        run_test_suite "infinite-scrolling.spec.ts" "Infinite Scrolling" "$PROJECT_ARG $MODE_ARGS"
        update_counters $?
        echo ""
        
        run_test_suite "error-handling.spec.ts" "Error Handling" "$PROJECT_ARG $MODE_ARGS"
        update_counters $?
        echo ""
        
        run_test_suite "cache-behavior.spec.ts" "Cache Behavior" "$PROJECT_ARG $MODE_ARGS"
        update_counters $?
        echo ""
        
        run_test_suite "real-user-workflows.spec.ts" "Real User Workflows" "$PROJECT_ARG $MODE_ARGS"
        update_counters $?
        ;;
esac

echo ""
echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}Test Execution Summary${NC}"
echo -e "${BLUE}===============================================${NC}"
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed successfully!${NC}"
    
    # Generate success report
    echo -e "${BLUE}📊 Generating test report...${NC}"
    npx playwright show-report "$RESULTS_DIR" || echo "Report generation skipped"
    
    exit 0
else
    echo -e "${RED}💥 Some tests failed. Check the reports for details.${NC}"
    
    # Show failed test information
    echo -e "${YELLOW}📋 Test Reports Available:${NC}"
    echo -e "  HTML Report: $RESULTS_DIR/index.html"
    echo -e "  JSON Results: $RESULTS_DIR/results.json"
    
    # Open report if in interactive mode
    if [ -t 1 ] && [ "$MODE" != "ci" ]; then
        echo ""
        read -p "Open test report? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            npx playwright show-report "$RESULTS_DIR"
        fi
    fi
    
    exit 1
fi