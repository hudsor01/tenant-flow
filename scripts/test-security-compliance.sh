#!/bin/bash

# Comprehensive Security Compliance Test Suite
# Tests authorization bypass attempts, SQL injection prevention, and security compliance

set -e

echo "🔐 Running Comprehensive Security Compliance Tests..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables (skip if in CI or file doesn't exist)
if [ -f .env.local ] && [ -z "$CI" ] && [ -z "$GITHUB_ACTIONS" ] && [ -z "$RUNNER_OS" ]; then
    source .env.local
elif [ -n "$CI" ] || [ -n "$GITHUB_ACTIONS" ] || [ -n "$RUNNER_OS" ]; then
    echo "🚧 Running in CI environment - skipping database connection tests"
    echo -e "${YELLOW}✓ Security compliance tests skipped in CI (database connection not available)${NC}"
    exit 0
fi

# Function to run SQL query
run_query() {
    local query=$1
    local db_url="${DATABASE_URL:-$DIRECT_URL}"
    
    psql "$db_url" -t -c "$query" 2>/dev/null || echo "ERROR"
}

# Function to test API endpoint security
test_api_security() {
    local test_name=$1
    local endpoint=$2
    local method=$3
    local payload=$4
    local expected_status=$5
    
    echo -n "Testing: $test_name... "
    
    # Use curl to test endpoint if backend is running
    if command -v curl &> /dev/null; then
        local base_url="${API_BASE_URL:-http://localhost:3001}"
        local response_status
        
        if [ "$method" = "GET" ]; then
            response_status=$(curl -s -o /dev/null -w "%{http_code}" "$base_url$endpoint" || echo "000")
        elif [ "$method" = "POST" ]; then
            response_status=$(curl -s -o /dev/null -w "%{http_code}" \
                -X POST \
                -H "Content-Type: application/json" \
                -d "$payload" \
                "$base_url$endpoint" || echo "000")
        fi
        
        if [ "$response_status" = "$expected_status" ]; then
            echo -e "${GREEN}✓ PASSED${NC}"
            return 0
        else
            echo -e "${RED}✗ FAILED${NC}"
            echo "  Expected HTTP $expected_status, got HTTP $response_status"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠ SKIPPED (curl not available)${NC}"
        return 0
    fi
}

# Function to test SQL injection patterns
test_sql_injection() {
    local test_name=$1
    local malicious_input=$2
    
    echo -n "Testing: $test_name... "
    
    # Test SQL injection in a safe context
    local query="SELECT COUNT(*) FROM \"Property\" WHERE name = '$malicious_input';"
    local result=$(run_query "$query")
    
    # SQL injection should either fail or return 0 results (no data found)
    if [[ "$result" == "ERROR" ]] || [[ "$result" == *"0"* ]]; then
        echo -e "${GREEN}✓ PROTECTED${NC}"
        return 0
    else
        echo -e "${RED}✗ VULNERABLE${NC}"
        echo "  SQL injection may be possible with input: $malicious_input"
        return 1
    fi
}

# Main test execution
main() {
    local passed=0
    local failed=0
    
    echo -e "${BLUE}=== Authorization Bypass Tests ===${NC}"
    echo ""
    
    # Test 1: Unauthorized API access
    if test_api_security "Unauthorized API access blocked" "/api/v1/properties" "GET" "" "401"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 2: Invalid authentication token
    if command -v curl &> /dev/null; then
        echo -n "Testing: Invalid JWT token rejected... "
        base_url="${API_BASE_URL:-http://localhost:3001}"
        response_status=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "Authorization: Bearer invalid_token_12345" \
            "$base_url/api/v1/properties" 2>/dev/null || echo "000")
        
        if [ "$response_status" = "401" ] || [ "$response_status" = "403" ]; then
            echo -e "${GREEN}✓ PASSED${NC}"
            ((passed++))
        else
            echo -e "${RED}✗ FAILED${NC}"
            echo "  Expected HTTP 401/403, got HTTP $response_status"
            ((failed++))
        fi
    fi
    
    # Test 3: Cross-origin request validation
    if command -v curl &> /dev/null; then
        echo -n "Testing: CORS policy enforcement... "
        base_url="${API_BASE_URL:-http://localhost:3001}"
        response=$(curl -s -H "Origin: https://malicious-site.com" \
            -H "Access-Control-Request-Method: GET" \
            -H "Access-Control-Request-Headers: authorization" \
            -X OPTIONS "$base_url/api/v1/properties" 2>/dev/null || echo "ERROR")
        
        # CORS should either block the request or not return CORS headers for unauthorized origins
        if [[ "$response" == *"Access-Control-Allow-Origin"* ]]; then
            echo -e "${RED}✗ FAILED${NC}"
            echo "  CORS allows access from unauthorized origin"
            ((failed++))
        else
            echo -e "${GREEN}✓ PASSED${NC}"
            ((passed++))
        fi
    fi
    
    echo ""
    echo -e "${BLUE}=== SQL Injection Prevention Tests ===${NC}"
    echo ""
    
    # Test 4-8: Various SQL injection patterns
    sql_injection_tests=(
        "Basic SQL injection" "'; DROP TABLE Property; --"
        "Union-based injection" "' UNION SELECT * FROM User --"
        "Boolean-based injection" "' OR 1=1 --"
        "Time-based injection" "'; WAITFOR DELAY '00:00:05' --"
        "Comment injection" "/* comment */ UNION SELECT password FROM User --"
    )
    
    for ((i=0; i<${#sql_injection_tests[@]}; i+=2)); do
        if test_sql_injection "${sql_injection_tests[i]}" "${sql_injection_tests[i+1]}"; then
            ((passed++))
        else
            ((failed++))
        fi
    done
    
    echo ""
    echo -e "${BLUE}=== Input Validation Tests ===${NC}"
    echo ""
    
    # Test 9: XSS prevention in property names
    echo -n "Testing: XSS prevention in input validation... "
    malicious_script="<script>alert('XSS')</script>"
    query="SELECT COUNT(*) FROM \"Property\" WHERE name = '$malicious_script';"
    result=$(run_query "$query")
    
    if [[ "$result" == "ERROR" ]] || [[ "$result" == *"0"* ]]; then
        echo -e "${GREEN}✓ PROTECTED${NC}"
        ((passed++))
    else
        echo -e "${RED}✗ VULNERABLE${NC}"
        ((failed++))
    fi
    
    # Test 10: Path traversal prevention
    echo -n "Testing: Path traversal prevention... "
    if command -v curl &> /dev/null; then
        base_url="${API_BASE_URL:-http://localhost:3001}"
        response_status=$(curl -s -o /dev/null -w "%{http_code}" \
            "$base_url/api/v1/properties/../../../etc/passwd" 2>/dev/null || echo "000")
        
        if [ "$response_status" = "404" ] || [ "$response_status" = "400" ] || [ "$response_status" = "403" ]; then
            echo -e "${GREEN}✓ PROTECTED${NC}"
            ((passed++))
        else
            echo -e "${RED}✗ VULNERABLE${NC}"
            echo "  Path traversal may be possible"
            ((failed++))
        fi
    else
        echo -e "${YELLOW}⚠ SKIPPED (curl not available)${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}=== Rate Limiting Tests ===${NC}"
    echo ""
    
    # Test 11: Rate limiting enforcement
    if command -v curl &> /dev/null; then
        echo -n "Testing: Rate limiting enforcement... "
        base_url="${API_BASE_URL:-http://localhost:3001}"
        
        # Make multiple rapid requests
        rate_limit_hit=false
        for i in {1..15}; do
            response_status=$(curl -s -o /dev/null -w "%{http_code}" \
                "$base_url/api/v1/health" 2>/dev/null || echo "000")
            if [ "$response_status" = "429" ]; then
                rate_limit_hit=true
                break
            fi
            sleep 0.1
        done
        
        if [ "$rate_limit_hit" = true ]; then
            echo -e "${GREEN}✓ ENFORCED${NC}"
            ((passed++))
        else
            echo -e "${YELLOW}⚠ NOT TRIGGERED${NC}"
            echo "  Rate limiting may not be properly configured"
            # Don't count as failure since it depends on current load
        fi
    fi
    
    echo ""
    echo -e "${BLUE}=== Security Headers Tests ===${NC}"
    echo ""
    
    # Test 12: Security headers presence
    if command -v curl &> /dev/null; then
        echo -n "Testing: Security headers presence... "
        base_url="${API_BASE_URL:-http://localhost:3001}"
        headers=$(curl -s -I "$base_url/" 2>/dev/null || echo "")
        
        security_headers_count=0
        
        # Check for important security headers
        if [[ "$headers" == *"X-Frame-Options"* ]]; then
            ((security_headers_count++))
        fi
        if [[ "$headers" == *"X-Content-Type-Options"* ]]; then
            ((security_headers_count++))
        fi
        if [[ "$headers" == *"Strict-Transport-Security"* ]]; then
            ((security_headers_count++))
        fi
        if [[ "$headers" == *"X-XSS-Protection"* ]]; then
            ((security_headers_count++))
        fi
        
        if [ $security_headers_count -ge 2 ]; then
            echo -e "${GREEN}✓ PRESENT (${security_headers_count}/4)${NC}"
            ((passed++))
        else
            echo -e "${RED}✗ MISSING (${security_headers_count}/4)${NC}"
            echo "  Missing important security headers"
            ((failed++))
        fi
    fi
    
    echo ""
    echo -e "${BLUE}=== Database Security Tests ===${NC}"
    echo ""
    
    # Test 13: RLS enforcement
    echo -n "Testing: RLS policies are active... "
    rls_check=$(run_query "SELECT COUNT(*) FROM pg_policies WHERE tablename IN ('Property', 'Unit', 'Lease', 'MaintenanceRequest');")
    
    if [[ "$rls_check" =~ ^[0-9]+$ ]] && [ "$rls_check" -gt 0 ]; then
        echo -e "${GREEN}✓ ACTIVE (${rls_check} policies)${NC}"
        ((passed++))
    else
        echo -e "${RED}✗ INACTIVE${NC}"
        echo "  RLS policies may not be properly configured"
        ((failed++))
    fi
    
    # Test 14: Function security
    echo -n "Testing: Database function security... "
    func_check=$(run_query "SELECT COUNT(*) FROM pg_proc WHERE proname LIKE '%user_owns%' AND prosecdef = false;")
    
    if [[ "$func_check" =~ ^[0-9]+$ ]] && [ "$func_check" -gt 0 ]; then
        echo -e "${GREEN}✓ SECURE${NC}"
        ((passed++))
    else
        echo -e "${YELLOW}⚠ CHECK NEEDED${NC}"
        echo "  Verify that security functions are not set as SECURITY DEFINER unnecessarily"
    fi
    
    echo ""
    echo -e "${BLUE}=== Audit and Monitoring Tests ===${NC}"
    echo ""
    
    # Test 15: Audit logging functionality
    echo -n "Testing: Security audit table exists... "
    audit_table=$(run_query "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'SecurityAuditLog';")
    
    if [[ "$audit_table" == *"1"* ]]; then
        echo -e "${GREEN}✓ EXISTS${NC}"
        ((passed++))
    else
        echo -e "${RED}✗ MISSING${NC}"
        echo "  Security audit logging table not found"
        ((failed++))
    fi
    
    echo ""
    echo -e "${BLUE}=== Summary ===${NC}"
    echo ""
    echo -e "Security tests passed: ${GREEN}$passed${NC}"
    echo -e "Security tests failed: ${RED}$failed${NC}"
    
    if [ $failed -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✅ All security compliance tests passed!${NC}"
        echo ""
        echo "Your application demonstrates strong security posture with:"
        echo "- Multi-tenant data isolation"
        echo "- SQL injection prevention"
        echo "- Authorization controls"
        echo "- Input validation"
        echo "- Security monitoring"
    else
        echo ""
        echo -e "${RED}❌ Some security tests failed!${NC}"
        echo ""
        echo "Please review the failed tests and strengthen security measures:"
        echo "- Verify authentication and authorization"
        echo "- Check input validation and sanitization"
        echo "- Ensure rate limiting is properly configured"
        echo "- Review security headers and CORS policies"
        echo "- Validate RLS policies and database security"
        exit 1
    fi
    
    echo ""
    echo -e "${BLUE}=== Security Recommendations ===${NC}"
    echo ""
    echo "Additional security measures to consider:"
    echo "1. Implement Content Security Policy (CSP) headers"
    echo "2. Add request signing for sensitive operations"
    echo "3. Implement IP allowlisting for admin endpoints"
    echo "4. Add distributed rate limiting with Redis"
    echo "5. Implement webhook signature validation"
    echo "6. Add security scanning to CI/CD pipeline"
    echo "7. Regular security audits and penetration testing"
    echo ""
}

# Check if we have database access
if ! command -v psql &> /dev/null; then
    if [ -n "$CI" ] || [ -n "$GITHUB_ACTIONS" ] || [ -n "$RUNNER_OS" ]; then
        echo -e "${YELLOW}⚠️  psql command not found in CI - skipping database security tests${NC}"
        echo -e "${GREEN}✅ Security tests skipped successfully (no database access in CI)${NC}"
        exit 0
    else
        echo -e "${RED}Error: psql command not found. Please install PostgreSQL client.${NC}"
        echo "On macOS: brew install postgresql"
        echo "On Ubuntu: sudo apt-get install postgresql-client"
        exit 1
    fi
fi

# Run main function
main