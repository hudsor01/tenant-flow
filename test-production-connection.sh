#!/bin/bash

# PRODUCTION CONNECTION TEST
# Tests REAL connection between Vercel frontend and Railway backend
# Run this to verify your deployment is actually working!

set -e

echo "🚀 Testing Production Connection: Vercel → Railway"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get current environment
FRONTEND_URL=${NEXT_PUBLIC_FRONTEND_URL:-"https://app.tenantflow.app"}
BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL:-"https://api.tenantflow.app"}

echo -e "${BLUE}Frontend URL:${NC} $FRONTEND_URL"
echo -e "${BLUE}Backend URL:${NC} $BACKEND_URL"
echo ""

# Function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected_status=$3
    
    echo -n "Testing $name... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✅ OK (HTTP $response)${NC}"
        return 0
    elif [ "$response" = "000" ]; then
        echo -e "${RED}❌ FAILED (Connection refused)${NC}"
        return 1
    else
        echo -e "${YELLOW}⚠️ UNEXPECTED (HTTP $response, expected $expected_status)${NC}"
        return 1
    fi
}

# Function to test with timing
test_with_timing() {
    local name=$1
    local url=$2
    
    echo -n "Testing $name performance... "
    
    start_time=$(date +%s%3N)
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")
    end_time=$(date +%s%3N)
    
    duration=$((end_time - start_time))
    
    if [ "$response" = "200" ]; then
        if [ $duration -lt 500 ]; then
            echo -e "${GREEN}✅ FAST (${duration}ms)${NC}"
        elif [ $duration -lt 2000 ]; then
            echo -e "${YELLOW}⚠️ SLOW (${duration}ms)${NC}"
        else
            echo -e "${RED}❌ VERY SLOW (${duration}ms)${NC}"
        fi
    else
        echo -e "${RED}❌ FAILED (HTTP $response)${NC}"
    fi
}

# Function to test JSON response
test_json_response() {
    local name=$1
    local url=$2
    local field=$3
    
    echo -n "Testing $name JSON response... "
    
    response=$(curl -s "$url")
    
    if echo "$response" | jq -e ".$field" > /dev/null 2>&1; then
        value=$(echo "$response" | jq -r ".$field")
        echo -e "${GREEN}✅ Valid JSON (${field}: ${value})${NC}"
    else
        echo -e "${RED}❌ Invalid JSON or missing field${NC}"
    fi
}

echo "1. Basic Connectivity Tests"
echo "----------------------------"
test_endpoint "Backend Health" "$BACKEND_URL/health" "200"
test_endpoint "Backend Root" "$BACKEND_URL/" "200"
test_endpoint "Frontend Home" "$FRONTEND_URL" "200"
echo ""

echo "2. Performance Tests"
echo "--------------------"
test_with_timing "Backend Health" "$BACKEND_URL/health"
test_with_timing "Frontend Home" "$FRONTEND_URL"
echo ""

echo "3. API Response Tests"
echo "---------------------"
test_json_response "Health Check" "$BACKEND_URL/health" "status"
test_json_response "Database Status" "$BACKEND_URL/health" "database"
test_json_response "Stripe Status" "$BACKEND_URL/health" "stripe"
echo ""

echo "4. Security Tests"
echo "-----------------"
echo -n "Testing CORS headers... "
cors_headers=$(curl -s -I -X OPTIONS \
    -H "Origin: $FRONTEND_URL" \
    -H "Access-Control-Request-Method: POST" \
    "$BACKEND_URL/auth/login" 2>/dev/null | grep -i "access-control")

if [ -n "$cors_headers" ]; then
    echo -e "${GREEN}✅ CORS configured${NC}"
else
    echo -e "${RED}❌ CORS not configured${NC}"
fi

echo -n "Testing security headers... "
security_headers=$(curl -s -I "$BACKEND_URL/health" 2>/dev/null | grep -iE "x-content-type|x-frame|strict-transport")

if [ -n "$security_headers" ]; then
    echo -e "${GREEN}✅ Security headers present${NC}"
else
    echo -e "${YELLOW}⚠️ Some security headers missing${NC}"
fi
echo ""

echo "5. Protected Endpoints Test"
echo "---------------------------"
echo -n "Testing auth requirement... "
auth_response=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/properties")

if [ "$auth_response" = "401" ]; then
    echo -e "${GREEN}✅ Auth required (401 Unauthorized)${NC}"
else
    echo -e "${RED}❌ Unexpected response (HTTP $auth_response)${NC}"
fi
echo ""

echo "6. Webhook Endpoints Test"
echo "-------------------------"
test_endpoint "Stripe Webhook" "$BACKEND_URL/billing/stripe/webhook" "400"
echo ""

echo "7. Error Handling Test"
echo "----------------------"
test_endpoint "404 Handler" "$BACKEND_URL/this-does-not-exist" "404"

echo -n "Testing validation errors... "
validation_response=$(curl -s -X POST "$BACKEND_URL/auth/signup" \
    -H "Content-Type: application/json" \
    -d '{"email":"invalid","password":"123"}' \
    -o /dev/null -w "%{http_code}")

if [ "$validation_response" = "400" ]; then
    echo -e "${GREEN}✅ Validation working (400 Bad Request)${NC}"
else
    echo -e "${RED}❌ Validation not working (HTTP $validation_response)${NC}"
fi
echo ""

echo "8. Vercel Rewrites Test"
echo "-----------------------"
if [ "$FRONTEND_URL" = "https://app.tenantflow.app" ]; then
    echo -n "Testing /api/v1/* rewrite... "
    rewrite_response=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL/api/v1/health")
    
    if [ "$rewrite_response" = "200" ]; then
        echo -e "${GREEN}✅ Vercel rewrites working${NC}"
    else
        echo -e "${YELLOW}⚠️ Vercel rewrites may not be configured (HTTP $rewrite_response)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ Skipping (not on production)${NC}"
fi
echo ""

# Summary
echo "=================================================="
echo -e "${BLUE}Connection Test Complete!${NC}"
echo ""
echo "Frontend: $FRONTEND_URL"
echo "Backend: $BACKEND_URL"
echo ""
echo "If any tests failed, check:"
echo "1. Railway backend is deployed and running"
echo "2. Vercel frontend is deployed"
echo "3. Environment variables are set correctly"
echo "4. CORS is configured for your domain"
echo "5. Database connections are working"