#!/bin/bash
set -e

# CRUD E2E Test Runner Script
# Quick helper for running CRUD tests with common configurations

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 TenantFlow - E2E CRUD Test Runner${NC}\n"

# Check if backend is running
if ! curl -s http://localhost:4600/health > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Backend not running at http://localhost:4600${NC}"
    echo -e "${YELLOW}   Please start backend first: ${GREEN}pnpm dev${NC}\n"
    exit 1
fi

echo -e "${GREEN}✓${NC} Backend is running\n"

# Check environment variables
if [ -z "$E2E_OWNER_EMAIL" ] && [ -z "$TEST_OWNER_EMAIL" ]; then
    echo -e "${RED}❌ Missing E2E_OWNER_EMAIL or TEST_OWNER_EMAIL${NC}"
    echo -e "   Set in .env.local:\n"
    echo -e "   ${YELLOW}E2E_OWNER_EMAIL=your-test-owner@example.com${NC}"
    echo -e "   ${YELLOW}E2E_OWNER_PASSWORD=your-secure-password${NC}\n"
    exit 1
fi

echo -e "${GREEN}✓${NC} Environment variables configured\n"

# Parse command line arguments
MODE=${1:-quick}

case $MODE in
    quick)
        echo -e "${BLUE}Running tests in headless mode (fastest)${NC}\n"
        pnpm test:e2e crud-full-workflow.spec.ts
        ;;

    ui)
        echo -e "${BLUE}Opening Playwright UI (visual debugging)${NC}\n"
        pnpm test:e2e:ui
        ;;

    headed)
        echo -e "${BLUE}Running with visible browser${NC}\n"
        pnpm test:e2e --headed crud-full-workflow.spec.ts
        ;;

    debug)
        echo -e "${BLUE}Running in debug mode (step-through)${NC}\n"
        PWDEBUG=1 pnpm test:e2e crud-full-workflow.spec.ts
        ;;

    watch)
        echo -e "${BLUE}Running in watch mode (auto-rerun on changes)${NC}\n"
        pnpm test:e2e --watch crud-full-workflow.spec.ts
        ;;

    report)
        echo -e "${BLUE}Opening last test report${NC}\n"
        npx playwright show-report
        ;;

    help|--help|-h)
        echo -e "${BLUE}Usage:${NC} $0 [mode]"
        echo -e ""
        echo -e "${BLUE}Modes:${NC}"
        echo -e "  ${GREEN}quick${NC}    - Run tests headless (default, fastest)"
        echo -e "  ${GREEN}ui${NC}       - Open Playwright UI for visual debugging"
        echo -e "  ${GREEN}headed${NC}   - Run with visible browser"
        echo -e "  ${GREEN}debug${NC}    - Run in debug mode (step-through)"
        echo -e "  ${GREEN}watch${NC}    - Run in watch mode (auto-rerun)"
        echo -e "  ${GREEN}report${NC}   - Open last test report"
        echo -e "  ${GREEN}help${NC}     - Show this help message"
        echo -e ""
        echo -e "${BLUE}Examples:${NC}"
        echo -e "  ${YELLOW}$0${NC}              # Quick headless run"
        echo -e "  ${YELLOW}$0 ui${NC}           # Visual debugging"
        echo -e "  ${YELLOW}$0 headed${NC}       # See browser"
        echo -e "  ${YELLOW}$0 debug${NC}        # Step-through debugging"
        echo -e ""
        exit 0
        ;;

    *)
        echo -e "${RED}❌ Unknown mode: $MODE${NC}"
        echo -e "   Run ${YELLOW}$0 help${NC} to see available modes\n"
        exit 1
        ;;
esac

# After test completes, show summary
if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ Tests completed successfully!${NC}\n"
    echo -e "📸 Screenshots: ${BLUE}apps/e2e-tests/test-results/${NC}"
    echo -e "🎬 Videos: ${BLUE}apps/e2e-tests/test-results/${NC}"
    echo -e "📊 Report: ${YELLOW}$0 report${NC}\n"
else
    echo -e "\n${RED}❌ Tests failed${NC}\n"
    echo -e "🔍 Check test results:"
    echo -e "   ${YELLOW}ls -la apps/e2e-tests/test-results/${NC}\n"
    echo -e "📊 View detailed report:"
    echo -e "   ${YELLOW}$0 report${NC}\n"
    exit 1
fi
