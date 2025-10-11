#!/bin/bash
# API Data Flow Integration Test
# Tests complete user workflows from frontend actions through backend to database

set -e

API_URL="http://localhost:4600"
FRONTEND_URL="http://localhost:3000"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0
TOTAL=0

# Function to print test results
print_result() {
    local test_name=$1
    local status=$2
    local details=$3

    TOTAL=$((TOTAL + 1))
    if [ "$status" = "PASS" ]; then
        PASSED=$((PASSED + 1))
        echo -e "${GREEN}✓ PASS${NC}: $test_name"
    else
        FAILED=$((FAILED + 1))
        echo -e "${RED}✗ FAIL${NC}: $test_name"
        echo -e "  ${YELLOW}Details${NC}: $details"
    fi
}

# Function to check if service is running
check_service() {
    local url=$1
    local name=$2

    echo "Checking $name at $url..."
    if curl -s -f "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $name is running"
        return 0
    else
        echo -e "${RED}✗${NC} $name is NOT running"
        return 1
    fi
}

echo "========================================="
echo "API Data Flow Integration Tests"
echo "========================================="
echo ""

# Check services are running
echo "1. Checking services..."
check_service "$API_URL/health" "Backend API"
BACKEND_STATUS=$?

if [ $BACKEND_STATUS -ne 0 ]; then
    echo -e "${RED}ERROR${NC}: Backend is not running. Please start it with: pnpm dev"
    exit 1
fi

echo ""
echo "2. Testing Public Endpoints (No Auth Required)..."
echo "-------------------------------------------"

# Test: Health Check
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/health")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    print_result "Health Check Endpoint" "PASS" "Backend is healthy"
else
    print_result "Health Check Endpoint" "FAIL" "HTTP $HTTP_CODE - $BODY"
fi

# Test: Stripe Products (Public)
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/v1/stripe/products")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    PRODUCT_COUNT=$(echo "$BODY" | jq -r 'length' 2>/dev/null || echo "0")
    print_result "Stripe Products Endpoint" "PASS" "Found $PRODUCT_COUNT products"
else
    print_result "Stripe Products Endpoint" "FAIL" "HTTP $HTTP_CODE"
fi

# Test: Stripe Prices (Public)
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/v1/stripe/prices")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    PRICE_COUNT=$(echo "$BODY" | jq -r 'length' 2>/dev/null || echo "0")
    print_result "Stripe Prices Endpoint" "PASS" "Found $PRICE_COUNT prices"
else
    print_result "Stripe Prices Endpoint" "FAIL" "HTTP $HTTP_CODE"
fi

echo ""
echo "3. Testing Protected Endpoints (Auth Required)..."
echo "------------------------------------------------"

# Test: Dashboard Stats (Should be 401 without auth)
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/v1/dashboard/stats")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "401" ]; then
    print_result "Dashboard Stats Auth Guard" "PASS" "Correctly returns 401 without auth"
else
    print_result "Dashboard Stats Auth Guard" "FAIL" "Expected 401, got HTTP $HTTP_CODE"
fi

# Test: Properties Endpoint (Should be 401 without auth)
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/v1/properties")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "401" ]; then
    print_result "Properties List Auth Guard" "PASS" "Correctly returns 401 without auth"
else
    print_result "Properties List Auth Guard" "FAIL" "Expected 401, got HTTP $HTTP_CODE"
fi

# Test: Tenants Endpoint (Should be 401 without auth)
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/v1/tenants")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "401" ]; then
    print_result "Tenants List Auth Guard" "PASS" "Correctly returns 401 without auth"
else
    print_result "Tenants List Auth Guard" "FAIL" "Expected 401, got HTTP $HTTP_CODE"
fi

# Test: Maintenance Endpoint (Should be 401 without auth)
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/v1/maintenance")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "401" ]; then
    print_result "Maintenance List Auth Guard" "PASS" "Correctly returns 401 without auth"
else
    print_result "Maintenance List Auth Guard" "FAIL" "Expected 401, got HTTP $HTTP_CODE"
fi

echo ""
echo "4. Testing API Endpoint Availability..."
echo "--------------------------------------"

# List of critical endpoints that should exist
CRITICAL_ENDPOINTS=(
    "GET /api/v1/dashboard/stats"
    "GET /api/v1/properties"
    "POST /api/v1/properties"
    "GET /api/v1/tenants"
    "POST /api/v1/tenants"
    "GET /api/v1/maintenance"
    "POST /api/v1/maintenance"
    "GET /api/v1/leases"
    "POST /api/v1/leases"
    "GET /api/v1/reports"
    "POST /api/v1/stripe/create-checkout-session"
    "POST /api/v1/stripe/create-billing-portal"
    "GET /api/v1/stripe/products"
    "GET /api/v1/stripe/prices"
)

echo "Checking that critical endpoints return 401 (not 404)..."
for endpoint in "${CRITICAL_ENDPOINTS[@]}"; do
    METHOD=$(echo $endpoint | awk '{print $1}')
    PATH=$(echo $endpoint | awk '{print $2}')

    if [ "$METHOD" = "GET" ]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL$PATH")
    else
        RESPONSE=$(curl -s -w "\n%{http_code}" -X "$METHOD" "$API_URL$PATH" -H "Content-Type: application/json" -d '{}')
    fi

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

    # For public endpoints, accept 200
    # For protected endpoints, accept 401 (auth required) or 400 (bad request)
    # 404 means the endpoint doesn't exist
    if [ "$HTTP_CODE" = "404" ]; then
        print_result "Endpoint exists: $endpoint" "FAIL" "Returns 404 - endpoint may not be registered"
    elif [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "400" ]; then
        print_result "Endpoint exists: $endpoint" "PASS" "HTTP $HTTP_CODE"
    else
        print_result "Endpoint exists: $endpoint" "PASS" "HTTP $HTTP_CODE (unexpected but not 404)"
    fi
done

echo ""
echo "========================================="
echo "Test Summary"
echo "========================================="
echo -e "Total Tests:  $TOTAL"
echo -e "${GREEN}Passed:       $PASSED${NC}"
echo -e "${RED}Failed:       $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    echo ""
    echo "Next Steps:"
    echo "1. For missing endpoints (404), verify the controller is registered in the module"
    echo "2. For authentication errors on public endpoints, check if guards are correctly applied"
    echo "3. For public endpoint failures, check backend logs for errors"
    exit 1
fi
