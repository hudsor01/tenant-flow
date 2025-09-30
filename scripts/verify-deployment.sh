#!/bin/bash

# Deployment Health Check Verification Script
# Run this after deploying to Railway

set -e

echo "STARTING: Railway Deployment Health Check"
echo "=================================="
echo ""

# Get the deployment URL
DEPLOYMENT_URL=${1:-"https://api.tenantflow.app"}

echo "CHECKING: Deployment at: $DEPLOYMENT_URL"
echo ""

# Function to check endpoint
check_endpoint() {
    local endpoint=$1
    local description=$2
    
    echo -n "  Checking $endpoint... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOYMENT_URL$endpoint" 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ]; then
        echo "SUCCESS: $description"
        return 0
    elif [ "$response" = "000" ]; then
        echo "ERROR: Connection failed"
        return 1
    else
        echo "WARNING:  HTTP $response"
        return 1
    fi
}

# Function to get JSON response
get_json() {
    local endpoint=$1
    curl -s "$DEPLOYMENT_URL$endpoint" 2>/dev/null | python3 -m json.tool 2>/dev/null || echo "{}"
}

echo "1. Basic Connectivity"
echo "------------------------"
check_endpoint "/health/ping" "Basic ping endpoint"
echo ""

echo "2. Database Connection"
echo "------------------------"
check_endpoint "/health/ready" "Database quick ping"
check_endpoint "/health" "Full health check"
echo ""

echo "3. Debug Information"
echo "------------------------"
if check_endpoint "/health/debug" "Debug endpoint"; then
    echo ""
    echo "  Debug Info:"
    get_json "/health/debug" | grep -E "(NODE_ENV|PORT|RAILWAY_ENVIRONMENT|hasSupabaseUrl|hasServiceKey)" | sed 's/^/    /'
fi
echo ""

echo "4. API Endpoints"
echo "------------------------"
check_endpoint "/api" "API root"
check_endpoint "/docs" "Swagger documentation"
echo ""

# Final verdict
echo "=================================="
if check_endpoint "/health" "Final health check" > /dev/null 2>&1; then
    echo "SUCCESS: DEPLOYMENT HEALTHY - Ready for production traffic!"
    echo ""
    echo "Next steps:"
    echo "  1. Monitor logs: railway logs -f"
    echo "  2. Check metrics: railway status"
    echo "  3. Test API endpoints with your frontend"
else
    echo "ERROR: DEPLOYMENT UNHEALTHY - Requires attention!"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check logs: railway logs"
    echo "  2. Verify environment variables are set:"
    echo "     - SUPABASE_URL"
    echo "     - SUPABASE_SERVICE_ROLE_KEY"
    echo "     - SUPABASE_JWT_SECRET"
    echo "     - JWT_SECRET"
    echo "     - STRIPE_SECRET_KEY"
    echo "  3. Verify database connection"
    echo "  4. Check Railway deployment status: railway status"
fi

echo ""
echo "Run 'railway logs -f' to monitor live logs"
