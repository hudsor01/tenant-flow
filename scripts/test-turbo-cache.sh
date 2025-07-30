#!/bin/bash

# Test Turbo Remote Cache
# This script verifies that remote caching is working correctly

set -e

echo "🧪 Testing Turbo Remote Cache..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to measure time
measure_time() {
    local start_time=$(date +%s)
    "$@"
    local end_time=$(date +%s)
    echo $((end_time - start_time))
}

# Function to check if remote cache is being used
check_remote_cache() {
    if grep -q "Remote computation cache hit" "$1"; then
        return 0
    else
        return 1
    fi
}

# Main test flow
main() {
    echo "📋 Test Plan:"
    echo "1. Clear local cache"
    echo "2. Run initial build (populate remote cache)"
    echo "3. Clear local cache again"
    echo "4. Run build again (should use remote cache)"
    echo "5. Compare build times"
    echo ""
    
    # Step 1: Clear local cache
    echo "🗑️  Clearing local Turbo cache..."
    rm -rf node_modules/.cache/turbo
    echo -e "${GREEN}✓ Local cache cleared${NC}"
    echo ""
    
    # Step 2: Initial build
    echo "🔨 Running initial build (this will populate remote cache)..."
    BUILD1_LOG=$(mktemp)
    BUILD1_TIME=$(measure_time npm run build -- --force 2>&1 | tee "$BUILD1_LOG")
    echo -e "${GREEN}✓ Initial build completed in ${BUILD1_TIME} seconds${NC}"
    echo ""
    
    # Check if remote cache was written
    if grep -q "Remote caching enabled" "$BUILD1_LOG"; then
        echo -e "${GREEN}✓ Remote caching is enabled${NC}"
    else
        echo -e "${RED}✗ Remote caching does not appear to be enabled${NC}"
        echo "Please run ./scripts/setup-turbo-remote-cache.sh first"
        exit 1
    fi
    
    # Step 3: Clear local cache again
    echo "🗑️  Clearing local cache again..."
    rm -rf node_modules/.cache/turbo
    echo -e "${GREEN}✓ Local cache cleared${NC}"
    echo ""
    
    # Step 4: Second build (should use remote cache)
    echo "🚀 Running build again (should use remote cache)..."
    BUILD2_LOG=$(mktemp)
    BUILD2_TIME=$(measure_time npm run build 2>&1 | tee "$BUILD2_LOG")
    echo -e "${GREEN}✓ Second build completed in ${BUILD2_TIME} seconds${NC}"
    echo ""
    
    # Step 5: Analyze results
    echo "📊 Results:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Count cache hits
    CACHE_HITS=$(grep -c "cache hit" "$BUILD2_LOG" || true)
    REMOTE_HITS=$(grep -c "remote cache hit" "$BUILD2_LOG" || true)
    
    echo "Initial build time: ${BUILD1_TIME}s"
    echo "Cached build time: ${BUILD2_TIME}s"
    
    if [ $BUILD1_TIME -gt 0 ] && [ $BUILD2_TIME -gt 0 ]; then
        SPEEDUP=$(awk "BEGIN {printf \"%.1f\", $BUILD1_TIME/$BUILD2_TIME}")
        SAVINGS=$(($BUILD1_TIME - $BUILD2_TIME))
        echo "Speedup: ${SPEEDUP}x faster"
        echo "Time saved: ${SAVINGS}s"
    fi
    
    echo ""
    echo "Cache hits: $CACHE_HITS"
    echo "Remote cache hits: $REMOTE_HITS"
    echo ""
    
    # Determine success
    if [ $REMOTE_HITS -gt 0 ]; then
        echo -e "${GREEN}✅ Remote cache is working correctly!${NC}"
        echo ""
        echo "🎉 Your builds are now:"
        echo "   • Shared across team members"
        echo "   • Cached in CI/CD pipelines"
        echo "   • Up to ${SPEEDUP}x faster"
    else
        echo -e "${YELLOW}⚠️  Remote cache hits not detected${NC}"
        echo ""
        echo "Possible reasons:"
        echo "   • Not authenticated (run: npx turbo login)"
        echo "   • Repository not linked (run: npx turbo link)"
        echo "   • Network issues"
        echo "   • First time running (cache needs to be populated)"
    fi
    
    # Cleanup
    rm -f "$BUILD1_LOG" "$BUILD2_LOG"
}

# Run main function
main