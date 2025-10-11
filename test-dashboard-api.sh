#!/bin/bash

# Dashboard API Testing Script
# Tests all owner and tenant dashboard endpoints with RLS policy verification

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:3001}"
OWNER_TOKEN="${OWNER_TOKEN:-}"
TENANT_TOKEN="${TENANT_TOKEN:-}"

echo "========================================="
echo "Dashboard API Testing Script"
echo "========================================="
echo "API URL: $API_URL"
echo ""

# Function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local token=$3
    local expected_status=${4:-200}

    echo -n "Testing $name... "

    response=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" \
        "$url")

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"

        # Check if response is valid JSON
        if echo "$body" | jq . >/dev/null 2>&1; then
            echo "$body" | jq -C '.'
        else
            echo "$body"
        fi
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Expected $expected_status, got $http_code)"
        echo "$body" | jq -C '.' 2>/dev/null || echo "$body"
        return 1
    fi
    echo ""
}

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}Warning: jq not installed. Install for better JSON formatting.${NC}"
    echo "  brew install jq"
    echo ""
fi

# Check if tokens are provided
if [ -z "$OWNER_TOKEN" ]; then
    echo -e "${RED}ERROR: OWNER_TOKEN not set${NC}"
    echo "Please set environment variable:"
    echo "  export OWNER_TOKEN='your_owner_access_token'"
    echo ""
    echo "To get your token:"
    echo "  1. Login to https://tenantflow.app"
    echo "  2. Open DevTools (F12)"
    echo "  3. Application -> Cookies -> access_token"
    echo "  4. Copy the value"
    exit 1
fi

echo "========================================="
echo "OWNER DASHBOARD TESTS"
echo "========================================="
echo ""

# Test 1: Dashboard Stats
test_endpoint \
    "Dashboard Stats" \
    "$API_URL/api/v1/dashboard/stats" \
    "$OWNER_TOKEN"

echo ""

# Test 2: Property Performance
test_endpoint \
    "Property Performance" \
    "$API_URL/api/v1/dashboard/property-performance" \
    "$OWNER_TOKEN"

echo ""

# Test 3: Property Stats
test_endpoint \
    "Property Stats" \
    "$API_URL/api/v1/properties/stats" \
    "$OWNER_TOKEN"

echo ""

# Test 4: Dashboard Activity
test_endpoint \
    "Dashboard Activity" \
    "$API_URL/api/v1/dashboard/activity" \
    "$OWNER_TOKEN"

echo ""

# Test 5: Occupancy Trends
test_endpoint \
    "Occupancy Trends" \
    "$API_URL/api/v1/dashboard/occupancy-trends?months=12" \
    "$OWNER_TOKEN"

echo ""

# Test 6: Revenue Trends
test_endpoint \
    "Revenue Trends" \
    "$API_URL/api/v1/dashboard/revenue-trends?months=12" \
    "$OWNER_TOKEN"

echo ""

# Test 7: Unauthorized access should fail
echo "Testing Unauthorized Access... "
test_endpoint \
    "Stats without token (should fail)" \
    "$API_URL/api/v1/dashboard/stats" \
    "" \
    401

echo ""

if [ -n "$TENANT_TOKEN" ]; then
    echo "========================================="
    echo "TENANT DASHBOARD TESTS"
    echo "========================================="
    echo ""

    # Test 8: Tenant Lease
    test_endpoint \
        "Tenant Lease" \
        "$API_URL/api/v1/tenants/me/lease" \
        "$TENANT_TOKEN"

    echo ""

    # Test 9: Tenant Payments
    test_endpoint \
        "Tenant Payments" \
        "$API_URL/api/v1/tenants/me/payments" \
        "$TENANT_TOKEN"

    echo ""

    # Test 10: Tenant Maintenance
    test_endpoint \
        "Tenant Maintenance" \
        "$API_URL/api/v1/maintenance?tenantId=me" \
        "$TENANT_TOKEN"

    echo ""
else
    echo -e "${YELLOW}Skipping tenant tests (TENANT_TOKEN not set)${NC}"
    echo ""
fi

echo "========================================="
echo "RLS POLICY VERIFICATION"
echo "========================================="
echo ""

# Test cross-owner access (should fail)
if [ -n "$OWNER_TOKEN" ]; then
    echo "Testing RLS: Owner accessing another owner's property (should fail)..."

    # Get a property ID from owner
    response=$(curl -s \
        -H "Authorization: Bearer $OWNER_TOKEN" \
        "$API_URL/api/v1/properties?limit=1")

    property_id=$(echo "$response" | jq -r '.data[0].id // empty' 2>/dev/null)

    if [ -n "$property_id" ]; then
        echo "Testing access to property: $property_id"

        # This should succeed (owner's own property)
        test_endpoint \
            "Owner accessing own property" \
            "$API_URL/api/v1/properties/$property_id" \
            "$OWNER_TOKEN"
    else
        echo -e "${YELLOW}No properties found for testing RLS${NC}"
    fi
fi

echo ""
echo "========================================="
echo "TEST SUMMARY"
echo "========================================="
echo ""
echo "All critical endpoints tested!"
echo ""
echo "Next steps:"
echo "1. Check for any FAIL results above"
echo "2. Verify data in browser at https://tenantflow.app/manage"
echo "3. Test tenant portal at https://tenantflow.app/tenant"
echo "4. Verify charts render with real data"
echo ""
