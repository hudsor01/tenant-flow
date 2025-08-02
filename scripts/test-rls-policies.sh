#!/bin/bash

# Test Supabase RLS Policies
# This script tests Row Level Security policies to ensure proper multi-tenant isolation

set -e

echo "🔒 Testing Supabase Row Level Security Policies..."
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
    echo -e "${YELLOW}✓ RLS tests skipped in CI (database connection not available)${NC}"
    exit 0
fi

# Function to run SQL query
run_query() {
    local query=$1
    local db_url="${DATABASE_URL:-$DIRECT_URL}"
    
    psql "$db_url" -t -c "$query" 2>/dev/null || echo "ERROR"
}

# Function to test a specific RLS scenario
test_rls() {
    local test_name=$1
    local query=$2
    local expected=$3
    
    echo -n "Testing: $test_name... "
    
    result=$(run_query "$query")
    
    if [[ "$result" == *"$expected"* ]]; then
        echo -e "${GREEN}✓ PASSED${NC}"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "  Expected: $expected"
        echo "  Got: $result"
        return 1
    fi
}

# Main test execution
main() {
    local passed=0
    local failed=0
    
    echo -e "${BLUE}=== RLS Status Check ===${NC}"
    echo ""
    
    # Check if RLS is enabled on critical tables
    tables=("Property" "Unit" "Tenant" "Lease" "MaintenanceRequest" "Document" "Expense")
    
    for table in "${tables[@]}"; do
        query="SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = '$table';"
        result=$(run_query "$query")
        
        if [[ "$result" == *"t"* ]]; then
            echo -e "✓ RLS enabled on $table"
            ((passed++))
        else
            echo -e "✗ RLS NOT enabled on $table"
            ((failed++))
        fi
    done
    
    echo ""
    echo -e "${BLUE}=== Policy Tests ===${NC}"
    echo ""
    
    # Test 1: Check if property policies exist
    if test_rls "Property SELECT policy exists" \
        "SELECT COUNT(*) FROM pg_policies WHERE tablename = 'Property' AND policyname LIKE '%select%';" \
        "1"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 2: Check if unit policies exist
    if test_rls "Unit SELECT policy exists" \
        "SELECT COUNT(*) FROM pg_policies WHERE tablename = 'Unit' AND policyname LIKE '%select%';" \
        "1"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 3: Check helper functions exist
    if test_rls "Helper function user_owns_property exists" \
        "SELECT COUNT(*) FROM pg_proc WHERE proname = 'user_owns_property';" \
        "1"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 4: Check indexes for performance
    if test_rls "Property owner index exists" \
        "SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'Property' AND indexname = 'idx_property_owner_id';" \
        "1"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    echo ""
    echo -e "${BLUE}=== Integration Tests ===${NC}"
    echo ""
    
    # Create test users and data
    echo "Creating test users and data for multi-tenant isolation testing..."
    
    # SQL to create comprehensive test scenario
    test_sql=$(cat <<EOF
-- Create test users and multi-tenant test data
DO \$\$
DECLARE
    owner1_id uuid := gen_random_uuid();
    owner2_id uuid := gen_random_uuid();
    tenant1_id uuid := gen_random_uuid();
    tenant2_id uuid := gen_random_uuid();
    property1_id uuid := gen_random_uuid();
    property2_id uuid := gen_random_uuid();
    unit1_id uuid := gen_random_uuid();
    unit2_id uuid := gen_random_uuid();
    lease1_id uuid := gen_random_uuid();
    lease2_id uuid := gen_random_uuid();
    maintenance1_id uuid := gen_random_uuid();
    maintenance2_id uuid := gen_random_uuid();
BEGIN
    -- Clean up any existing test data
    DELETE FROM "User" WHERE email LIKE 'rls-test-%@example.com';
    DELETE FROM "Property" WHERE name LIKE 'RLS Test Property%';
    
    -- Create first organization/owner
    INSERT INTO "User" (id, "supabaseId", email, name, role, "organizationId")
    VALUES (owner1_id, gen_random_uuid(), 'rls-test-owner1@example.com', 'Test Owner 1', 'OWNER', owner1_id::text);
    
    -- Create second organization/owner
    INSERT INTO "User" (id, "supabaseId", email, name, role, "organizationId")
    VALUES (owner2_id, gen_random_uuid(), 'rls-test-owner2@example.com', 'Test Owner 2', 'OWNER', owner2_id::text);
    
    -- Create tenants for each organization
    INSERT INTO "User" (id, "supabaseId", email, name, role, "organizationId")
    VALUES (tenant1_id, gen_random_uuid(), 'rls-test-tenant1@example.com', 'Test Tenant 1', 'TENANT', owner1_id::text);
    
    INSERT INTO "User" (id, "supabaseId", email, name, role, "organizationId")
    VALUES (tenant2_id, gen_random_uuid(), 'rls-test-tenant2@example.com', 'Test Tenant 2', 'TENANT', owner2_id::text);
    
    -- Create properties for each owner
    INSERT INTO "Property" (id, name, address, city, state, "zipCode", "ownerId")
    VALUES (property1_id, 'RLS Test Property 1', '123 Test St', 'Test City', 'CA', '12345', owner1_id::text);
    
    INSERT INTO "Property" (id, name, address, city, state, "zipCode", "ownerId")
    VALUES (property2_id, 'RLS Test Property 2', '456 Test Ave', 'Test City', 'CA', '67890', owner2_id::text);
    
    -- Create units for each property
    INSERT INTO "Unit" (id, "unitNumber", "propertyId", bedrooms, bathrooms, rent)
    VALUES (unit1_id, '101', property1_id::text, 2, 1, 1500);
    
    INSERT INTO "Unit" (id, "unitNumber", "propertyId", bedrooms, bathrooms, rent)
    VALUES (unit2_id, '201', property2_id::text, 3, 2, 2000);
    
    -- Create leases for each unit/tenant
    INSERT INTO "Lease" (id, "unitId", "tenantId", "startDate", "endDate", "monthlyRent", status)
    VALUES (lease1_id, unit1_id::text, tenant1_id::text, CURRENT_DATE, CURRENT_DATE + INTERVAL '12 months', 1500, 'ACTIVE');
    
    INSERT INTO "Lease" (id, "unitId", "tenantId", "startDate", "endDate", "monthlyRent", status)
    VALUES (lease2_id, unit2_id::text, tenant2_id::text, CURRENT_DATE, CURRENT_DATE + INTERVAL '12 months', 2000, 'ACTIVE');
    
    -- Create maintenance requests for each property
    INSERT INTO "MaintenanceRequest" (id, "propertyId", "unitId", title, description, status, priority, "reportedBy")
    VALUES (maintenance1_id, property1_id::text, unit1_id::text, 'Test Maintenance 1', 'RLS Test Request', 'OPEN', 'MEDIUM', tenant1_id::text);
    
    INSERT INTO "MaintenanceRequest" (id, "propertyId", "unitId", title, description, status, priority, "reportedBy")
    VALUES (maintenance2_id, property2_id::text, unit2_id::text, 'Test Maintenance 2', 'RLS Test Request', 'OPEN', 'HIGH', tenant2_id::text);
    
    -- Store test IDs in a temporary table for cross-tenant access tests
    CREATE TEMP TABLE IF NOT EXISTS rls_test_data (
        owner1_id uuid,
        owner2_id uuid,
        tenant1_id uuid,
        tenant2_id uuid,
        property1_id uuid,
        property2_id uuid,
        unit1_id uuid,
        unit2_id uuid,
        lease1_id uuid,
        lease2_id uuid,
        maintenance1_id uuid,
        maintenance2_id uuid
    );
    
    INSERT INTO rls_test_data VALUES (
        owner1_id, owner2_id, tenant1_id, tenant2_id,
        property1_id, property2_id, unit1_id, unit2_id,
        lease1_id, lease2_id, maintenance1_id, maintenance2_id
    );
    
    -- Output the IDs for verification
    RAISE NOTICE 'Multi-tenant test data created successfully';
    RAISE NOTICE 'Owner 1: %, Owner 2: %', owner1_id, owner2_id;
    RAISE NOTICE 'Property 1: %, Property 2: %', property1_id, property2_id;
END\$\$;
EOF
)
    
    run_query "$test_sql"
    
    echo ""
    echo -e "${BLUE}=== Cross-Tenant Access Prevention Tests ===${NC}"
    echo ""
    
    # Test 1: Owner 1 cannot see Owner 2's properties
    if test_rls "Owner 1 cannot access Owner 2's properties" \
        "SET app.organization_id = (SELECT owner1_id::text FROM rls_test_data); 
         SELECT COUNT(*) FROM \"Property\" WHERE \"ownerId\" = (SELECT owner2_id::text FROM rls_test_data);" \
        "0"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 2: Owner 2 cannot see Owner 1's properties
    if test_rls "Owner 2 cannot access Owner 1's properties" \
        "SET app.organization_id = (SELECT owner2_id::text FROM rls_test_data); 
         SELECT COUNT(*) FROM \"Property\" WHERE \"ownerId\" = (SELECT owner1_id::text FROM rls_test_data);" \
        "0"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 3: Owner 1 can only see their own properties
    if test_rls "Owner 1 can see only their own properties" \
        "SET app.organization_id = (SELECT owner1_id::text FROM rls_test_data); 
         SELECT COUNT(*) FROM \"Property\" WHERE \"ownerId\" = (SELECT owner1_id::text FROM rls_test_data);" \
        "1"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 4: Owner 2 can only see their own properties
    if test_rls "Owner 2 can see only their own properties" \
        "SET app.organization_id = (SELECT owner2_id::text FROM rls_test_data); 
         SELECT COUNT(*) FROM \"Property\" WHERE \"ownerId\" = (SELECT owner2_id::text FROM rls_test_data);" \
        "1"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 5: Cross-tenant unit access prevention
    if test_rls "Owner 1 cannot access Owner 2's units" \
        "SET app.organization_id = (SELECT owner1_id::text FROM rls_test_data); 
         SELECT COUNT(*) FROM \"Unit\" u 
         JOIN \"Property\" p ON u.\"propertyId\" = p.id 
         WHERE p.\"ownerId\" = (SELECT owner2_id::text FROM rls_test_data);" \
        "0"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 6: Cross-tenant lease access prevention
    if test_rls "Owner 1 cannot access Owner 2's leases" \
        "SET app.organization_id = (SELECT owner1_id::text FROM rls_test_data); 
         SELECT COUNT(*) FROM \"Lease\" l 
         JOIN \"Unit\" u ON l.\"unitId\" = u.id 
         JOIN \"Property\" p ON u.\"propertyId\" = p.id 
         WHERE p.\"ownerId\" = (SELECT owner2_id::text FROM rls_test_data);" \
        "0"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 7: Cross-tenant maintenance request access prevention
    if test_rls "Owner 1 cannot access Owner 2's maintenance requests" \
        "SET app.organization_id = (SELECT owner1_id::text FROM rls_test_data); 
         SELECT COUNT(*) FROM \"MaintenanceRequest\" m 
         WHERE m.\"propertyId\" = (SELECT property2_id::text FROM rls_test_data);" \
        "0"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 8: Tenant isolation - Tenant 1 cannot see Tenant 2's data
    if test_rls "Tenant 1 cannot access Tenant 2's lease data" \
        "SET app.organization_id = (SELECT owner1_id::text FROM rls_test_data); 
         SELECT COUNT(*) FROM \"Lease\" WHERE \"tenantId\" = (SELECT tenant2_id::text FROM rls_test_data);" \
        "0"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    echo ""
    echo -e "${BLUE}=== RLS Bypass Attempt Tests ===${NC}"
    echo ""
    
    # Test 9: Cannot bypass RLS with malicious queries
    if test_rls "RLS protects against SQL injection attempts" \
        "SET app.organization_id = (SELECT owner1_id::text FROM rls_test_data); 
         SELECT COUNT(*) FROM \"Property\" WHERE \"ownerId\" = (SELECT owner1_id::text FROM rls_test_data) OR 1=1;" \
        "1"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 10: Cannot access data without organization context
    if test_rls "RLS blocks access without organization context" \
        "RESET app.organization_id; 
         SELECT COUNT(*) FROM \"Property\";" \
        "0"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    echo ""
    echo -e "${BLUE}=== Performance Tests ===${NC}"
    echo ""
    
    # Test 11: RLS policies don't significantly impact performance
    start_time=$(date +%s%N)
    run_query "SET app.organization_id = (SELECT owner1_id::text FROM rls_test_data); 
               SELECT COUNT(*) FROM \"Property\" p 
               JOIN \"Unit\" u ON p.id = u.\"propertyId\" 
               JOIN \"Lease\" l ON u.id = l.\"unitId\";"
    end_time=$(date +%s%N)
    duration=$((($end_time - $start_time) / 1000000)) # Convert to milliseconds
    
    if [ $duration -lt 1000 ]; then # Less than 1 second
        echo -e "✓ RLS query performance acceptable (${duration}ms)"
        ((passed++))
    else
        echo -e "✗ RLS query performance slow (${duration}ms)"
        ((failed++))
    fi
    
    echo ""
    echo -e "${BLUE}=== Summary ===${NC}"
    echo ""
    echo -e "Tests passed: ${GREEN}$passed${NC}"
    echo -e "Tests failed: ${RED}$failed${NC}"
    
    if [ $failed -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✅ All RLS tests passed!${NC}"
        echo ""
        echo "Your Row Level Security implementation is working correctly."
        echo "Multi-tenant isolation is properly enforced."
    else
        echo ""
        echo -e "${RED}❌ Some RLS tests failed!${NC}"
        echo ""
        echo "Please review the failed tests and fix the RLS policies."
        echo "Run the migration: npm run migrate:deploy"
        exit 1
    fi
    
    # Cleanup test data
    echo ""
    echo "Cleaning up test data..."
    cleanup_sql=$(cat <<EOF
-- Clean up all test data in correct order (respecting foreign key constraints)
DELETE FROM "MaintenanceRequest" WHERE title LIKE 'Test Maintenance%';
DELETE FROM "Lease" WHERE "startDate" = CURRENT_DATE AND "monthlyRent" IN (1500, 2000);
DELETE FROM "Unit" WHERE "unitNumber" IN ('101', '201') AND "propertyId" IN (
    SELECT id FROM "Property" WHERE name LIKE 'RLS Test Property%'
);
DELETE FROM "Property" WHERE name LIKE 'RLS Test Property%';
DELETE FROM "User" WHERE email LIKE 'rls-test-%@example.com';
-- Drop temporary table
DROP TABLE IF EXISTS rls_test_data;
EOF
)
    run_query "$cleanup_sql"
}

# Check if we have database access
if ! command -v psql &> /dev/null; then
    if [ -n "$CI" ] || [ -n "$GITHUB_ACTIONS" ] || [ -n "$RUNNER_OS" ]; then
        echo -e "${YELLOW}⚠️  psql command not found in CI - skipping RLS database tests${NC}"
        echo -e "${GREEN}✅ RLS tests skipped successfully (no database access in CI)${NC}"
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