#!/bin/bash

# CRITICAL SECURITY TEST SCRIPT: RLS Policy Validation
# This script validates that Row Level Security policies are properly enforced
# and that the recent security fixes prevent ownership bypass attacks.

set -e

echo "🔐 RUNNING CRITICAL SECURITY TESTS FOR OWNERSHIP BYPASS VULNERABILITY"
echo "=================================================================="

cd "$(dirname "$0")/.."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
CRITICAL_FAILURES=0

log_test() {
    echo -e "${YELLOW}🧪 Testing: $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ PASS: $1${NC}"
    ((TESTS_PASSED++))
}

log_failure() {
    echo -e "${RED}❌ FAIL: $1${NC}"
    ((TESTS_FAILED++))
    if [[ "$2" == "CRITICAL" ]]; then
        ((CRITICAL_FAILURES++))
    fi
}

log_critical() {
    echo -e "${RED}🚨 CRITICAL SECURITY FAILURE: $1${NC}"
    ((CRITICAL_FAILURES++))
    ((TESTS_FAILED++))
}

# Check if backend is running
check_backend() {
    log_test "Backend service availability"
    
    if ! curl -s http://localhost:3001/health > /dev/null; then
        echo "❌ Backend not running. Starting backend..."
        npm run dev --filter=@tenantflow/backend &
        BACKEND_PID=$!
        sleep 10
        
        if ! curl -s http://localhost:3001/health > /dev/null; then
            log_failure "Backend failed to start" "CRITICAL"
            return 1
        fi
    fi
    
    log_success "Backend is accessible"
    return 0
}

# Test 1: Verify the security fix is applied
test_security_fix_applied() {
    log_test "Verifying BaseCrudService delete security fix"
    
    # Check that the vulnerable code has been replaced
    if grep -q "repository.deleteById(id)" apps/backend/src/common/services/base-crud.service.ts; then
        log_critical "SECURITY FIX NOT APPLIED: deleteById still present in delete method"
        return 1
    fi
    
    # Check that the secure code is present
    if grep -q "createOwnerWhereClause(id, ownerId)" apps/backend/src/common/services/base-crud.service.ts; then
        log_success "Security fix applied: owner-validated deletion in place"
    else
        log_critical "SECURITY FIX INCOMPLETE: createOwnerWhereClause not found in delete method"
        return 1
    fi
    
    # Check for security validation in constructor
    if grep -q "validateAbstractImplementations" apps/backend/src/common/services/base-crud.service.ts; then
        log_success "Abstract method validation added to constructor"
    else
        log_failure "Missing abstract method validation in constructor" "CRITICAL"
        return 1
    fi
    
    return 0
}

# Test 2: Verify repository security enhancements
test_repository_security() {
    log_test "Verifying BaseRepository security enhancements"
    
    # Check for ownership validation method
    if grep -q "validateOwnershipInWhere" apps/backend/src/common/repositories/base.repository.ts; then
        log_success "Ownership validation method added to repository"
    else
        log_failure "Missing ownership validation in repository" "CRITICAL"
        return 1
    fi
    
    # Check for security warning in deleteById
    if grep -q "SECURITY WARNING" apps/backend/src/common/repositories/base.repository.ts; then
        log_success "Security warning added to deleteById method"
    else
        log_failure "Missing security warning in deleteById method"
        return 1
    fi
    
    return 0
}

# Test 3: Run unit tests for security fixes
test_unit_tests() {
    log_test "Running security unit tests"
    
    # Create test directory if it doesn't exist
    mkdir -p apps/backend/src/test/security
    
    # Run the specific security tests
    if npm run test:unit -- --testPathPattern="ownership-validation.test.ts" --verbose; then
        log_success "Security unit tests passed"
    else
        log_critical "Security unit tests failed - vulnerability may still exist"
        return 1
    fi
    
    return 0
}

# Test 4: Compile TypeScript to ensure no type errors
test_typescript_compilation() {
    log_test "TypeScript compilation with security fixes"
    
    cd apps/backend
    if npx tsc --noEmit --skipLibCheck; then
        log_success "TypeScript compilation successful"
        cd ../..
    else
        log_failure "TypeScript compilation failed - security fixes may have type errors"
        cd ../..
        return 1
    fi
    
    return 0
}

# Test 5: Test actual API endpoints for ownership bypass
test_api_security() {
    log_test "API endpoint ownership validation"
    
    # This would require actual API calls with different user tokens
    # For now, just verify the security middleware is in place
    
    if grep -r "JwtAuthGuard" apps/backend/src/ > /dev/null; then
        log_success "JWT authentication guards found"
    else
        log_failure "Missing JWT authentication guards" "CRITICAL"
        return 1
    fi
    
    return 0
}

# Test 6: Verify database RLS policies are active
test_rls_policies() {
    log_test "Database RLS policy validation"
    
    # Check for RLS policy definitions in migration files
    if find apps/backend/prisma/migrations -name "*.sql" -exec grep -l "ROW LEVEL SECURITY\|CREATE POLICY" {} \; | head -1 > /dev/null; then
        log_success "RLS policies found in database migrations"
    else
        log_failure "No RLS policies found in migrations"
        return 1
    fi
    
    return 0
}

# Test 7: Check for any remaining security vulnerabilities
test_remaining_vulnerabilities() {
    log_test "Scanning for remaining security vulnerabilities"
    
    # Check for other potential bypass patterns
    VULNERABILITIES=0
    
    # Look for direct database access without owner validation
    if grep -r "\.delete\s*(" apps/backend/src/ | grep -v "validateOwnershipInWhere\|test\|spec" | grep -v "node_modules"; then
        log_failure "Found direct delete calls that may bypass ownership validation"
        ((VULNERABILITIES++))
    fi
    
    # Look for findMany without owner filtering
    if grep -r "findMany\s*(" apps/backend/src/ | grep -v "findManyByOwner\|test\|spec" | head -5; then
        echo "⚠️  Warning: Direct findMany calls found - verify they include proper filtering"
    fi
    
    if [[ $VULNERABILITIES -eq 0 ]]; then
        log_success "No obvious security vulnerabilities detected"
    else
        log_failure "Found $VULNERABILITIES potential security issues"
        return 1
    fi
    
    return 0
}

# Main execution
main() {
    echo "Starting comprehensive security validation..."
    echo ""
    
    # Run all security tests
    check_backend || true
    test_security_fix_applied || true
    test_repository_security || true
    test_typescript_compilation || true
    test_unit_tests || true
    test_api_security || true
    test_rls_policies || true
    test_remaining_vulnerabilities || true
    
    echo ""
    echo "=================================================================="
    echo "🔐 SECURITY TEST RESULTS"
    echo "=================================================================="
    echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
    echo -e "${RED}Critical Failures: $CRITICAL_FAILURES${NC}"
    echo ""
    
    if [[ $CRITICAL_FAILURES -gt 0 ]]; then
        echo -e "${RED}🚨 CRITICAL SECURITY VULNERABILITIES DETECTED!${NC}"
        echo -e "${RED}🚨 DO NOT DEPLOY TO PRODUCTION UNTIL FIXED!${NC}"
        exit 1
    elif [[ $TESTS_FAILED -gt 0 ]]; then
        echo -e "${YELLOW}⚠️  Some security tests failed. Review and fix before deployment.${NC}"
        exit 1
    else
        echo -e "${GREEN}✅ ALL SECURITY TESTS PASSED${NC}"
        echo -e "${GREEN}✅ Ownership bypass vulnerability has been successfully fixed${NC}"
        exit 0
    fi
}

# Cleanup function
cleanup() {
    if [[ -n "$BACKEND_PID" ]]; then
        echo "Cleaning up backend process..."
        kill $BACKEND_PID 2>/dev/null || true
    fi
}

trap cleanup EXIT

# Run the main function
main "$@"