#!/bin/bash

# Health Check Test Script for TenantFlow Backend
# This script tests the health endpoints used by Railway in production

echo "🏥 TenantFlow Backend Health Check Test"
echo "========================================"
echo ""

# Configuration
BACKEND_PORT=${PORT:-4600}
BACKEND_URL="http://localhost:${BACKEND_PORT}"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if backend is running
check_backend_running() {
    echo "Checking if backend is running on port ${BACKEND_PORT}..."
    if lsof -i :${BACKEND_PORT} | grep -q LISTEN; then
        echo -e "${GREEN}✅ Backend is running on port ${BACKEND_PORT}${NC}"
        return 0
    else
        echo -e "${RED}❌ Backend is not running on port ${BACKEND_PORT}${NC}"
        echo ""
        echo "Starting backend..."
        cd /Users/richard/Developer/tenant-flow/apps/backend
        npm run dev > backend.log 2>&1 &
        BACKEND_PID=$!
        echo "Waiting for backend to start (PID: ${BACKEND_PID})..."
        sleep 10
        
        if lsof -i :${BACKEND_PORT} | grep -q LISTEN; then
            echo -e "${GREEN}✅ Backend started successfully${NC}"
            return 0
        else
            echo -e "${RED}❌ Failed to start backend${NC}"
            echo "Check backend.log for errors"
            return 1
        fi
    fi
}

# Function to test health endpoint
test_health_endpoint() {
    local endpoint=$1
    local description=$2
    
    echo ""
    echo "Testing: ${description}"
    echo "Endpoint: ${BACKEND_URL}${endpoint}"
    echo "---"
    
    # Make the request and capture response and status code
    response=$(curl -s -w "\n%{http_code}" "${BACKEND_URL}${endpoint}" 2>/dev/null)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" == "200" ]; then
        echo -e "${GREEN}✅ HTTP Status: ${http_code}${NC}"
        
        # Parse and display JSON response
        if command -v jq &> /dev/null; then
            echo "Response:"
            echo "$body" | jq .
            
            # Check specific fields for /health endpoint
            if [ "$endpoint" == "/health" ]; then
                status=$(echo "$body" | jq -r '.status')
                database=$(echo "$body" | jq -r '.database')
                uptime=$(echo "$body" | jq -r '.uptime')
                
                echo ""
                echo "Health Status Summary:"
                echo "  - Overall Status: $([ "$status" == "ok" ] && echo -e "${GREEN}${status}${NC}" || echo -e "${YELLOW}${status}${NC}")"
                echo "  - Database: $([ "$database" == "healthy" ] && echo -e "${GREEN}${database}${NC}" || echo -e "${YELLOW}${database}${NC}")"
                echo "  - Uptime: ${uptime} seconds"
            fi
        else
            echo "Response: $body"
        fi
    else
        echo -e "${RED}❌ HTTP Status: ${http_code}${NC}"
        echo "Response: $body"
        return 1
    fi
}

# Function to test database connectivity through health check
test_database_health() {
    echo ""
    echo "Testing Database Connectivity..."
    echo "---"
    
    response=$(curl -s "${BACKEND_URL}/health/detailed" 2>/dev/null)
    
    if command -v jq &> /dev/null; then
        db_status=$(echo "$response" | jq -r '.database')
        db_response_time=$(echo "$response" | jq -r '.databaseResponseTime')
        
        if [ "$db_status" == "healthy" ]; then
            echo -e "${GREEN}✅ Database is healthy${NC}"
            [ "$db_response_time" != "null" ] && echo "  Response time: ${db_response_time}ms"
        else
            echo -e "${YELLOW}⚠️ Database status: ${db_status}${NC}"
        fi
        
        # Show pool stats if available
        pool_stats=$(echo "$response" | jq '.poolStats')
        if [ "$pool_stats" != "null" ]; then
            echo "  Connection pool stats:"
            echo "$pool_stats" | jq .
        fi
    fi
}

# Function to run load test
run_load_test() {
    echo ""
    echo "Running Load Test (10 concurrent requests)..."
    echo "---"
    
    if command -v ab &> /dev/null; then
        ab -n 10 -c 5 -q "${BACKEND_URL}/health" 2>&1 | grep -E "Requests per second:|Time per request:|Failed requests:"
    else
        echo "Apache Bench (ab) not installed. Skipping load test."
        echo "Install with: brew install httpd (macOS) or apt-get install apache2-utils (Linux)"
    fi
}

# Main execution
echo "Configuration:"
echo "  Backend URL: ${BACKEND_URL}"
echo "  Backend Port: ${BACKEND_PORT}"
echo ""

# Check if backend is running
if ! check_backend_running; then
    exit 1
fi

# Test endpoints
test_health_endpoint "/" "Root Endpoint"
test_health_endpoint "/health" "Health Check Endpoint (Used by Railway)"
test_health_endpoint "/health/detailed" "Detailed Health Check"

# Test database health
test_database_health

# Run load test
run_load_test

echo ""
echo "========================================"
echo "Health Check Test Complete!"
echo ""

# Recommendations for frontend
echo "📝 Frontend Configuration Recommendations:"
echo ""
echo "For local development, update your frontend's .env.local file:"
echo -e "${YELLOW}NEXT_PUBLIC_API_URL=http://localhost:${BACKEND_PORT}/api/v1${NC}"
echo ""
echo "Current frontend is pointing to:"
grep "NEXT_PUBLIC_API_URL" /Users/richard/Developer/tenant-flow/apps/frontend/.env.local 2>/dev/null || echo "Not configured"
echo ""
echo "This mismatch will cause the frontend to fail connecting to your local backend!"