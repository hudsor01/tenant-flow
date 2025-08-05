#!/bin/bash

# Generate Visual Baseline Screenshots for Landing Page
# This script creates baseline screenshots for visual regression testing

set -e

echo "🎯 Generating Visual Baselines for Landing Page"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Please run this script from the project root${NC}"
    exit 1
fi

# Check if playwright is installed
if ! npx playwright --version > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Playwright not found, installing...${NC}"
    npx playwright install
fi

# Ensure frontend is built
echo -e "${BLUE}🔨 Building frontend...${NC}"
npm run build --filter=@tenantflow/frontend

# Start the frontend server in the background
echo -e "${BLUE}🚀 Starting frontend server...${NC}"
npm run dev --filter=@tenantflow/frontend &
FRONTEND_PID=$!

# Wait for server to be ready
echo -e "${YELLOW}⏳ Waiting for server to be ready...${NC}"
timeout=60
while ! curl -s http://localhost:3000 > /dev/null; do
    sleep 2
    timeout=$((timeout - 2))
    if [ $timeout -le 0 ]; then
        echo -e "${RED}❌ Frontend server failed to start within 60 seconds${NC}"
        kill $FRONTEND_PID 2>/dev/null || true
        exit 1
    fi
done

echo -e "${GREEN}✅ Frontend server is ready${NC}"

# Function to cleanup on exit
cleanup() {
    echo -e "${YELLOW}🧹 Cleaning up...${NC}"
    kill $FRONTEND_PID 2>/dev/null || true
    wait $FRONTEND_PID 2>/dev/null || true
}

# Set trap to cleanup on script exit
trap cleanup EXIT

# Generate baseline screenshots
echo -e "${BLUE}📸 Generating baseline screenshots...${NC}"
npx playwright test tests/e2e/specs/visual/landing-page.visual.spec.ts --update-snapshots

# Check if screenshots were generated
SCREENSHOT_DIR="tests/e2e/specs/visual/landing-page.visual.spec.ts-snapshots"
if [ -d "$SCREENSHOT_DIR" ] && [ "$(ls -A $SCREENSHOT_DIR)" ]; then
    echo -e "${GREEN}✅ Baseline screenshots generated successfully!${NC}"
    echo -e "${BLUE}📁 Screenshots saved to: $SCREENSHOT_DIR${NC}"
    
    # List generated screenshots
    echo -e "${BLUE}📋 Generated screenshots:${NC}"
    ls -la "$SCREENSHOT_DIR" | grep -E '\.(png|jpg|jpeg)$' | awk '{print "   " $9}'
else
    echo -e "${RED}❌ No screenshots were generated${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 Visual baseline generation completed!${NC}"
echo ""
echo -e "${BLUE}ℹ️  Next steps:${NC}"
echo "1. Review the generated screenshots to ensure they look correct"
echo "2. Commit the screenshots to version control"
echo "3. Run 'npm run test:e2e:visual' to run visual regression tests"
echo ""
echo -e "${YELLOW}💡 Tip: Use 'npx playwright show-report' to view test results in browser${NC}"