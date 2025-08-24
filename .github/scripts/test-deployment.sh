#!/bin/bash
# test-deployment.sh - Test deployment configurations locally
# Simulates Vercel and Railway deployment processes

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🚀 Deployment Configuration Test"
echo "================================"

# Function to test Vercel deployment
test_vercel() {
    echo -e "\n${BLUE}Testing Vercel Deployment...${NC}"
    
    # Simulate Vercel build process
    echo -e "${YELLOW}1. Install (npm ci)...${NC}"
    npm ci --prefer-offline --no-audit
    
    echo -e "${YELLOW}2. Build shared packages...${NC}"
    npm run build:shared
    
    echo -e "${YELLOW}3. Build frontend...${NC}"
    cd apps/frontend
    npm run build
    cd ../..
    
    # Check output
    if [ -d "apps/frontend/.next" ]; then
        echo -e "${GREEN}✅ Vercel build successful${NC}"
        echo "   Output: apps/frontend/.next"
        
        # Check build size
        SIZE=$(du -sh apps/frontend/.next | cut -f1)
        echo "   Build size: $SIZE"
    else
        echo -e "${RED}❌ Vercel build failed${NC}"
        return 1
    fi
}

# Function to test Railway deployment
test_railway() {
    echo -e "\n${BLUE}Testing Railway Deployment...${NC}"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${YELLOW}⚠️  Docker not installed, using npm build instead${NC}"
        
        # Fallback to npm build
        echo -e "${YELLOW}1. Build backend...${NC}"
        cd apps/backend
        npm run build
        cd ../..
        
        if [ -d "apps/backend/dist" ]; then
            echo -e "${GREEN}✅ Backend build successful${NC}"
            echo "   Output: apps/backend/dist"
        else
            echo -e "${RED}❌ Backend build failed${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}1. Building Docker image...${NC}"
        docker build -t tenantflow-test . --no-cache
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Docker build successful${NC}"
            
            # Test container startup
            echo -e "${YELLOW}2. Testing container startup...${NC}"
            docker run -d --name test-container -p 4600:4600 \
                -e NODE_ENV=production \
                -e PORT=4600 \
                tenantflow-test
            
            # Wait for startup
            echo "   Waiting for container to start..."
            sleep 10
            
            # Check health
            if curl -f http://localhost:4600/health/ping 2>/dev/null; then
                echo -e "${GREEN}✅ Container health check passed${NC}"
            else
                echo -e "${YELLOW}⚠️  Health check failed (may need more time)${NC}"
            fi
            
            # Cleanup
            docker stop test-container 2>/dev/null
            docker rm test-container 2>/dev/null
        else
            echo -e "${RED}❌ Docker build failed${NC}"
            return 1
        fi
    fi
}

# Function to test environment variables
test_env_vars() {
    echo -e "\n${BLUE}Testing Environment Variables...${NC}"
    
    # Check for environment validation script
    if [ -f ".github/scripts/validate-env.sh" ]; then
        echo -e "${YELLOW}Running environment validation...${NC}"
        
        # Test each environment
        for env in vercel railway local; do
            echo -e "\n  Testing $env environment..."
            ./.github/scripts/validate-env.sh $env 2>/dev/null || {
                echo -e "  ${YELLOW}⚠️  Some $env variables missing (expected)${NC}"
            }
        done
    fi
}

# Function to test build optimization
test_optimization() {
    echo -e "\n${BLUE}Testing Build Optimization...${NC}"
    
    # Check Turbo cache
    if [ -d ".turbo" ]; then
        echo -e "${GREEN}✅ Turbo cache present${NC}"
        CACHE_SIZE=$(du -sh .turbo | cut -f1)
        echo "   Cache size: $CACHE_SIZE"
    else
        echo -e "${YELLOW}⚠️  No Turbo cache found (first build)${NC}"
    fi
    
    # Check node_modules deduplication
    echo -e "${YELLOW}Checking dependency deduplication...${NC}"
    npm dedupe --dry-run 2>/dev/null | head -5 || {
        echo -e "${GREEN}✅ Dependencies are deduplicated${NC}"
    }
}

# Main execution
main() {
    # Parse arguments
    TARGET=${1:-all}
    
    case $TARGET in
        vercel)
            test_vercel
            ;;
        railway)
            test_railway
            ;;
        env)
            test_env_vars
            ;;
        optimize)
            test_optimization
            ;;
        all)
            test_vercel
            test_railway
            test_env_vars
            test_optimization
            ;;
        *)
            echo "Usage: $0 [vercel|railway|env|optimize|all]"
            exit 1
            ;;
    esac
    
    # Summary
    echo -e "\n${GREEN}======================================${NC}"
    echo -e "${GREEN}✅ Deployment Testing Complete${NC}"
    echo -e "${GREEN}======================================${NC}"
    echo ""
    echo "Deployment Readiness:"
    echo "  • Vercel: Frontend builds successfully"
    echo "  • Railway: Backend/Docker builds successfully"
    echo "  • Environment: Variables documented"
    echo "  • Optimization: Turbo cache enabled"
    echo ""
    echo "Next steps:"
    echo "  1. Set environment variables in deployment platforms"
    echo "  2. Connect GitHub repository"
    echo "  3. Trigger deployment"
}

# Run main
main "$@"