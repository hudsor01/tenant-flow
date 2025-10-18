-- RLS SECURITY VALIDATION TESTS
-- Run these tests to verify that Row Level Security policies are working correctly
-- These tests should be run by different authenticated users to verify isolation

-- =============================================================================
-- TEST SETUP INSTRUCTIONS
-- =============================================================================

/*
1. Create test users in Supabase Auth
2. Run these queries as each user 
3. Verify that users can only see their own data
4. All cross-user queries should return 0 results

Test Users Needed:
- user1@test.com (property owner)  
- user2@test.com (property owner)
- tenant1@test.com (tenant)
- tenant2@test.com (tenant)
*/

-- =============================================================================
-- CRITICAL TEST: TENANT ISOLATION
-- =============================================================================

-- Test 1: Verify tenant records isolation
-- Run as user1, should return 0 if user1 has no tenant records for other users
SELECT 
  'TEST 1: Tenant Isolation' as test_name,
  COUNT(*) as unauthorized_records,
  CASE 
    WHEN COUNT(*) = 0 THEN 'PASS' 
    ELSE 'FAIL - CAN ACCESS OTHER USERS TENANTS' 
  END as result
FROM "tenant" 
WHERE "userId" != auth.uid()::text OR "userId" IS NULL;

-- Test 1b: Verify tenant can only see their own record  
-- Run as tenant1@test.com
SELECT 
  'TEST 1b: Tenant Self-Access' as test_name,
  COUNT(*) as own_records,
  CASE 
    WHEN COUNT(*) >= 1 THEN 'PASS' 
    ELSE 'FAIL - CANNOT ACCESS OWN TENANT RECORD' 
  END as result
FROM "tenant" 
WHERE "userId" = auth.uid()::text;

-- =============================================================================
-- PROPERTY OWNERSHIP TESTS  
-- =============================================================================

-- Test 2: Verify property isolation
-- Run as user1, should return 0
SELECT 
  'TEST 2: Property Isolation' as test_name,
  COUNT(*) as unauthorized_records,
  CASE 
    WHEN COUNT(*) = 0 THEN 'PASS' 
    ELSE 'FAIL - CAN ACCESS OTHER USERS PROPERTIES' 
  END as result
FROM "property" 
WHERE "ownerId" != auth.uid()::text;

-- Test 3: Verify unit access via property ownership
-- Run as user1, should return 0  
SELECT 
  'TEST 3: Unit Access Control' as test_name,
  COUNT(*) as unauthorized_records,
  CASE 
    WHEN COUNT(*) = 0 THEN 'PASS' 
    ELSE 'FAIL - CAN ACCESS UNITS FROM OTHER PROPERTIES' 
  END as result
FROM "unit" u
JOIN "property" p ON u."propertyId" = p.id
WHERE p."ownerId" != auth.uid()::text;

-- Test 4: Verify lease access via property chain
-- Run as user1, should return 0
SELECT 
  'TEST 4: Lease Access Control' as test_name,
  COUNT(*) as unauthorized_records,
  CASE 
    WHEN COUNT(*) = 0 THEN 'PASS' 
    ELSE 'FAIL - CAN ACCESS LEASES FROM OTHER PROPERTIES' 
  END as result
FROM "lease" l
JOIN "unit" u ON l."unitId" = u.id  
JOIN "property" p ON u."propertyId" = p.id
WHERE p."ownerId" != auth.uid()::text;

-- =============================================================================
-- FINANCIAL DATA TESTS
-- =============================================================================

-- Test 5: Verify expense isolation
-- Run as user1, should return 0
SELECT 
  'TEST 5: Expense Access Control' as test_name,
  COUNT(*) as unauthorized_records,
  CASE 
    WHEN COUNT(*) = 0 THEN 'PASS' 
    ELSE 'FAIL - CAN ACCESS EXPENSES FROM OTHER PROPERTIES' 
  END as result
FROM "expense" e
JOIN "property" p ON e."propertyId" = p.id
WHERE p."ownerId" != auth.uid()::text;

-- Test 6: Verify rent charge isolation  
-- Run as user1, should return 0
SELECT 
  'TEST 6: Rent Charge Access Control' as test_name,
  COUNT(*) as unauthorized_records,
  CASE 
    WHEN COUNT(*) = 0 THEN 'PASS' 
    ELSE 'FAIL - CAN ACCESS RENT CHARGES FROM OTHER PROPERTIES' 
  END as result
FROM "RentCharge" rc
JOIN "unit" u ON rc."unitId" = u.id
JOIN "property" p ON u."propertyId" = p.id  
WHERE p."ownerId" != auth.uid()::text;

-- Test 7: Verify payment method isolation
-- Run as tenant1, should return 0 (can't see other tenants' payment methods)
SELECT 
  'TEST 7: Payment Method Access Control' as test_name,
  COUNT(*) as unauthorized_records,
  CASE 
    WHEN COUNT(*) = 0 THEN 'PASS' 
    ELSE 'FAIL - CAN ACCESS OTHER TENANTS PAYMENT METHODS' 
  END as result
FROM "PaymentMethod" pm
WHERE pm."tenantId" NOT IN (
  SELECT id FROM "tenant" WHERE "userId" = auth.uid()::text
);

-- =============================================================================
-- MAINTENANCE AND FILE TESTS
-- =============================================================================

-- Test 8: Verify maintenance request isolation
-- Run as user1, should return 0
SELECT 
  'TEST 8: Maintenance Request Access Control' as test_name,
  COUNT(*) as unauthorized_records,
  CASE 
    WHEN COUNT(*) = 0 THEN 'PASS' 
    ELSE 'FAIL - CAN ACCESS MAINTENANCE FROM OTHER PROPERTIES' 
  END as result
FROM "maintenance_request" mr
JOIN "unit" u ON mr."unitId" = u.id
JOIN "property" p ON u."propertyId" = p.id
WHERE p."ownerId" != auth.uid()::text;

-- Test 9: Verify file access control
-- Run as user1, should return 0 (files not uploaded by user or linked to their properties)
SELECT 
  'TEST 9: File Access Control' as test_name,
  COUNT(*) as unauthorized_records,
  CASE 
    WHEN COUNT(*) = 0 THEN 'PASS' 
    ELSE 'FAIL - CAN ACCESS FILES FROM OTHER USERS/PROPERTIES' 
  END as result
FROM "File" f
LEFT JOIN "property" p ON f."propertyId" = p.id
LEFT JOIN "maintenance_request" mr ON f."maintenanceRequestId" = mr.id
LEFT JOIN "unit" u ON mr."unitId" = u.id  
LEFT JOIN "property" p2 ON u."propertyId" = p2.id
WHERE f."uploadedById" != auth.uid()::text
  AND (p.id IS NULL OR p."ownerId" != auth.uid()::text)
  AND (p2.id IS NULL OR p2."ownerId" != auth.uid()::text);

-- =============================================================================
-- COMMUNICATION TESTS
-- =============================================================================

-- Test 10: Verify message participant access only
-- Run as user1, should return 0 (messages where user is neither sender nor receiver)
SELECT 
  'TEST 10: Message Access Control' as test_name,
  COUNT(*) as unauthorized_records,
  CASE 
    WHEN COUNT(*) = 0 THEN 'PASS' 
    ELSE 'FAIL - CAN ACCESS MESSAGES NOT INVOLVING USER' 
  END as result
FROM "Message" m
WHERE m."senderId" != auth.uid()::text 
  AND m."receiverId" != auth.uid()::text;

-- =============================================================================
-- USER DATA ISOLATION TESTS
-- =============================================================================

-- Test 11: Verify user record isolation
-- Run as user1, should return 0
SELECT 
  'TEST 11: User Record Isolation' as test_name,
  COUNT(*) as unauthorized_records,
  CASE 
    WHEN COUNT(*) = 0 THEN 'PASS' 
    ELSE 'FAIL - CAN ACCESS OTHER USERS RECORDS' 
  END as result
FROM "users" 
WHERE id != auth.uid()::text;

-- Test 12: Verify invoice isolation
-- Run as user1, should return 0
SELECT 
  'TEST 12: Invoice Access Control' as test_name,
  COUNT(*) as unauthorized_records,
  CASE 
    WHEN COUNT(*) = 0 THEN 'PASS' 
    ELSE 'FAIL - CAN ACCESS OTHER USERS INVOICES' 
  END as result
FROM "invoice" 
WHERE "userId" != auth.uid()::text;

-- Test 13: Verify subscription isolation
-- Run as user1, should return 0  
SELECT 
  'TEST 13: Subscription Access Control' as test_name,
  COUNT(*) as unauthorized_records,
  CASE 
    WHEN COUNT(*) = 0 THEN 'PASS' 
    ELSE 'FAIL - CAN ACCESS OTHER USERS SUBSCRIPTIONS' 
  END as result
FROM "subscription" 
WHERE "userId" != auth.uid()::text;

-- =============================================================================
-- NOTIFICATION ISOLATION TESTS  
-- =============================================================================

-- Test 14: Verify notification isolation
-- Run as user1, should return 0
SELECT 
  'TEST 14: Notification Access Control' as test_name,
  COUNT(*) as unauthorized_records,
  CASE 
    WHEN COUNT(*) = 0 THEN 'PASS' 
    ELSE 'FAIL - CAN ACCESS OTHER USERS NOTIFICATIONS' 
  END as result
FROM "InAppNotification" 
WHERE "userId" != auth.uid()::text;

-- Test 15: Verify notification table isolation  
-- Run as user1, should return 0
SELECT 
  'TEST 15: Notifications Table Access Control' as test_name,
  COUNT(*) as unauthorized_records,
  CASE 
    WHEN COUNT(*) = 0 THEN 'PASS' 
    ELSE 'FAIL - CAN ACCESS OTHER USERS NOTIFICATION RECORDS' 
  END as result
FROM "notifications" 
WHERE recipient_id != auth.uid()::text;

-- =============================================================================
-- COMPREHENSIVE TEST SUMMARY
-- =============================================================================

-- Run this query to get a summary of all test results
WITH test_results AS (
  -- Add all the above test queries here with UNION ALL
  -- This is a template - you'd need to combine all tests
  SELECT 'Sample Test' as test_name, 0 as unauthorized_records, 'PASS' as result
)
SELECT 
  'SECURITY TEST SUMMARY' as summary,
  COUNT(*) as total_tests,
  SUM(CASE WHEN result LIKE 'PASS%' THEN 1 ELSE 0 END) as passed_tests,
  SUM(CASE WHEN result LIKE 'FAIL%' THEN 1 ELSE 0 END) as failed_tests,
  CASE 
    WHEN SUM(CASE WHEN result LIKE 'FAIL%' THEN 1 ELSE 0 END) = 0 
    THEN 'ALL SECURITY TESTS PASSED' 
    ELSE 'SECURITY VULNERABILITIES DETECTED' 
  END as overall_status
FROM test_results;

-- =============================================================================
-- PERFORMANCE IMPACT TESTS  
-- =============================================================================

-- Test P1: Check policy performance on large table scans
EXPLAIN ANALYZE 
SELECT COUNT(*) FROM "property" WHERE "ownerId" = auth.uid()::text;

-- Test P2: Check join performance with RLS
EXPLAIN ANALYZE
SELECT COUNT(*) 
FROM "unit" u 
JOIN "property" p ON u."propertyId" = p.id 
WHERE p."ownerId" = auth.uid()::text;

-- =============================================================================
-- EDGE CASE TESTS
-- =============================================================================

-- Test E1: Verify NULL handling in policies
SELECT 
  'TEST E1: NULL Handling' as test_name,
  COUNT(*) as null_user_records,
  CASE 
    WHEN COUNT(*) = 0 THEN 'PASS' 
    ELSE 'WARNING - NULL USER RECORDS ACCESSIBLE' 
  END as result
FROM "tenant" 
WHERE "userId" IS NULL;

-- Test E2: Verify empty string handling  
SELECT 
  'TEST E2: Empty String Handling' as test_name,
  COUNT(*) as empty_user_records,
  CASE 
    WHEN COUNT(*) = 0 THEN 'PASS' 
    ELSE 'WARNING - EMPTY USER RECORDS ACCESSIBLE' 
  END as result
FROM "tenant" 
WHERE "userId" = '';

-- =============================================================================
-- INSTRUCTIONS FOR RUNNING TESTS
-- =============================================================================

/*
TO RUN THESE TESTS:

1. Connect to Supabase with different authenticated users
2. Run each test query as that user  
3. Verify all unauthorized_records counts are 0
4. Any non-zero counts indicate RLS policy failures

EXPECTED RESULTS:
- All "unauthorized_records" should be 0
- All results should show "PASS"  
- Any "FAIL" indicates a security vulnerability

EMERGENCY RESPONSE:
If any tests fail:
1. Immediately investigate the failing policy
2. Review the policy logic for the affected table
3. Fix the policy and re-run tests
4. Document the fix in SecurityAuditLog
*/