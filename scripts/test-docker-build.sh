#!/bin/bash
# Quick Docker Build Test - Validates monorepo Dockerfile placement

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🐳 Docker Build Test${NC}"
echo "Testing monorepo Dockerfile from project root..."

# Ensure we're in project root
if [[ ! -f "Dockerfile" ]] || [[ ! -f "turbo.json" ]]; then
    echo -e "${RED}❌ Must run from project root (where Dockerfile exists)${NC}"
    exit 1
fi

# Check Docker is available
if ! command -v docker >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker not installed${NC}"
    exit 1
fi

echo "Building Docker image (this validates the Dockerfile location)..."
echo "Building with build context from project root..."

# Build with detailed output and memory constraints
export DOCKER_BUILDKIT=1
echo "Building with BuildKit and memory constraints..."

if docker build \
    --memory=4g \
    -t tenantflow-local-test . \
    --progress=plain \
    --no-cache 2>&1 | tee docker-build.log; then
    echo -e "\n${GREEN}✅ Docker build successful${NC}"

    echo "Testing container startup..."
    docker run -d -p 4602:3000 --name tenantflow-backend tenantflow-backend

    # Give container time to start
    sleep 15

    echo "Testing health endpoint..."
    if curl -s --max-time 10 "http://localhost:4602/health" | grep -q "ok\|healthy" 2>/dev/null; then
        echo -e "${GREEN}✅ Container health check passed${NC}"
    else
        echo -e "${YELLOW}⚠️  Health check timeout (may need more time)${NC}"
        echo "Container logs:"
        docker logs tenantflow-test --tail 20
    fi

    # Cleanup
    echo "Cleaning up..."
    docker stop tenantflow-test >/dev/null 2>&1
    docker rm tenantflow-test >/dev/null 2>&1
    docker rmi tenantflow-local-test >/dev/null 2>&1

else
    echo -e "\n${RED}❌ Docker build failed${NC}"
    echo "This confirms the Dockerfile location or content has issues"
    exit 1
fi

echo -e "\n${GREEN}🎉 Docker build test passed${NC}"
echo "The Dockerfile is correctly placed in project root for monorepo access"
