#!/usr/bin/env bash

# Railway Health Check Script
# Verifies that the Railway deployment is healthy

set -e

echo "=‚ Railway Health Check"
echo "======================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${RAILWAY_API_URL:-https://api.tenantflow.app}"
MAX_RETRIES=10
RETRY_DELAY=5

echo -e "${YELLOW}Checking Railway deployment at: $API_URL${NC}"

# Function to check health endpoint
check_health() {
    local endpoint=$1
    local description=$2
    
    echo -e "\n${YELLOW}Checking $description...${NC}"
    
    for i in $(seq 1 $MAX_RETRIES); do
        echo -n "  Attempt $i/$MAX_RETRIES: "
        
        RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL$endpoint" 2>/dev/null || echo "000")
        
        if [ "$RESPONSE" = "200" ]; then
            echo -e "${GREEN} Success (HTTP 200)${NC}"
            return 0
        elif [ "$RESPONSE" = "000" ]; then
            echo -e "${RED}Connection failed${NC}"
        else
            echo -e "${YELLOW}HTTP $RESPONSE${NC}"
        fi
        
        if [ $i -lt $MAX_RETRIES ]; then
            echo "  Retrying in $RETRY_DELAY seconds..."
            sleep $RETRY_DELAY
        fi
    done
    
    echo -e "${RED} Failed after $MAX_RETRIES attempts${NC}"
    return 1
}

# Check ping endpoint (most basic health check)
if check_health "/health/ping" "Ping endpoint"; then
    echo -e "${GREEN} Basic connectivity confirmed${NC}"
else
    echo -e "${RED} Basic connectivity failed${NC}"
    exit 1
fi

# Check main health endpoint
if check_health "/health" "Main health endpoint"; then
    echo -e "${GREEN} Application health confirmed${NC}"
    
    # Get detailed health data
    echo -e "\n${YELLOW}Fetching detailed health information...${NC}"
    HEALTH_DATA=$(curl -s "$API_URL/health" 2>/dev/null || echo '{}')
    
    if echo "$HEALTH_DATA" | grep -q '"status":"ok"'; then
        echo -e "${GREEN} Health status: OK${NC}"
        
        # Parse and display health details if jq is available
        if command -v jq &> /dev/null; then
            echo -e "\n${YELLOW}Health Details:${NC}"
            echo "$HEALTH_DATA" | jq '.'
        else
            echo -e "\n${YELLOW}Raw health data:${NC}"
            echo "$HEALTH_DATA"
        fi
    else
        echo -e "${YELLOW}  Unexpected health response:${NC}"
        echo "$HEALTH_DATA"
    fi
else
    echo -e "${RED} Application health check failed${NC}"
    exit 1
fi

# Check API versioning
echo -e "\n${YELLOW}Checking API version...${NC}"
VERSION_RESPONSE=$(curl -s "$API_URL/api/v1/health" 2>/dev/null || echo '{}')
if echo "$VERSION_RESPONSE" | grep -q '"status"'; then
    echo -e "${GREEN} API v1 endpoint accessible${NC}"
else
    echo -e "${YELLOW}  API v1 endpoint may not be configured${NC}"
fi

# Summary
echo -e "\n======================"
echo -e "${GREEN} Railway deployment is healthy!${NC}"
echo -e "API URL: $API_URL"
echo -e "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"