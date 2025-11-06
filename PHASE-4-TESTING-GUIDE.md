# Phase 4 Testing Guide

**Date**: 2025-11-06
**Status**: Ready to Execute (Requires Local Environment with Doppler)

---

## ⚠️ Prerequisites

**Required Tools**:
- ✅ Doppler CLI installed and configured
- ✅ Access to production Supabase project
- ✅ Backend running locally or accessible
- ✅ All environment variables loaded via Doppler

**Environment Variables Required**:
```bash
SUPABASE_URL=https://bshjmbshupiibfiewpxb.supabase.co
SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_ROLE_KEY=eyJh...
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

---

## 🧪 Test Execution Order

### 1. Backend Integration Tests (RLS Policies)

**Purpose**: Verify Row-Level Security policies enforce data isolation

**Command**:
```bash
doppler run -- pnpm --filter @repo/backend test:integration
```

**Test Suites** (3 files, ~50 tests):
- `payment-isolation.integration.spec.ts` - Payment RLS policies
- `property-isolation.integration.spec.ts` - Property/Unit RLS policies
- `tenant-isolation.integration.spec.ts` - Tenant RLS policies

**What's Being Tested**:
- ✅ Owners can only see their own properties
- ✅ Tenants can only see their own payments
- ✅ Payment methods are isolated by tenant
- ✅ Service role can bypass RLS for system operations
- ✅ Cross-tenant data access is prevented

**Expected Duration**: 2-3 minutes

**Success Criteria**:
```
Test Suites: 3 passed, 3 total
Tests:       ~50 passed, 50 total
Time:        < 180s
```

**Common Issues**:
1. **Authentication failures**: Test users not created
   - Fix: Run `node scripts/create-test-users.js`
2. **RLS policy errors**: Policies not applied
   - Fix: Check migrations applied with verification queries
3. **Timeout errors**: Database slow or unreachable
   - Fix: Check network connectivity to Supabase

---

### 2. Frontend Integration Tests (API + UI)

**Purpose**: Verify frontend can interact with RLS-protected APIs correctly

**Command**:
```bash
doppler run -- pnpm --filter @repo/frontend test:integration
```

**Test Suites** (6 files):
- `use-properties-crud.test.tsx` - Property CRUD operations
- `use-tenants-crud.test.tsx` - Tenant CRUD operations
- `use-leases-crud.test.tsx` - Lease CRUD operations
- `use-units-crud.test.tsx` - Unit CRUD operations
- `use-maintenance-crud.test.tsx` - Maintenance CRUD operations
- `use-rent-payments-crud.test.tsx` - Payment operations

**What's Being Tested**:
- ✅ TanStack Query hooks work with RLS policies
- ✅ Create operations succeed with correct ownership
- ✅ Read operations only return authorized data
- ✅ Update operations enforce ownership
- ✅ Optimistic locking with version fields works
- ✅ Error handling for unauthorized access

**Expected Duration**: 3-5 minutes

**Success Criteria**:
```
Test Files: 6 passed, 6 total
Tests:      ~40 passed, 40 total
Time:       < 300s
```

**Prerequisites**:
- Backend must be running on http://localhost:3001
- Test subscription must be active (uses `setup-test-subscription.ts`)

**Common Issues**:
1. **Backend not running**: Frontend tests need backend API
   - Fix: Start backend with `pnpm --filter @repo/backend dev`
2. **Subscription errors**: Test subscription plan missing
   - Fix: Check Stripe test mode has active subscription
3. **RLS blocks operations**: Frontend trying invalid operations
   - Fix: This is expected - verify tests assert proper error messages

---

### 3. Manual Security Testing

**Purpose**: Verify security boundaries with real user interactions

#### Test Scenarios

**Scenario 1: Payment Isolation**
```bash
# Login as Tenant A
# Navigate to /tenant/payments
# Expected: See only own payments
# Try: Direct API call to get other tenant's payment
curl -H "Authorization: Bearer $TENANT_A_TOKEN" \
  http://localhost:3001/api/v1/rent-payments/{other_tenant_payment_id}
# Expected: 403 Forbidden or empty result
```

**Scenario 2: Payment Method Isolation**
```bash
# Login as Tenant A
# Navigate to /tenant/payment-methods
# Expected: See only own payment methods
# Try: Direct database query via Supabase client
const { data } = await supabase
  .from('tenant_payment_method')
  .select('*')
# Expected: Only returns tenant A's payment methods
```

**Scenario 3: Frontend Cannot Create Payments**
```bash
# Login as any user
# Try: Direct Supabase insert
const { error } = await supabase
  .from('rent_payment')
  .insert({ /* payment data */ })
# Expected: Error - RLS policy blocks INSERT for authenticated role
```

**Scenario 4: Service Role CAN Create Payments**
```bash
# Use service role key
const { data, error } = await supabase
  .from('rent_payment')
  .insert({ /* payment data */ })
# Expected: Success - service role bypasses RLS
```

**Scenario 5: Property Ownership**
```bash
# Login as Owner A
# Try: Read Owner B's property
const { data } = await supabase
  .from('property')
  .select('*')
  .eq('id', owner_b_property_id)
# Expected: Empty result - RLS blocks access
```

---

## 🔍 Database Verification Queries

Run these queries after migrations to verify RLS is configured correctly:

### Query 1: Check RLS Enabled
```sql
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('rent_payment', 'tenant_payment_method', 'property', 'unit')
AND schemaname = 'public';
```

**Expected Output**:
```
tablename                | rowsecurity
------------------------|------------
rent_payment            | t
tenant_payment_method   | t
property                | t
unit                    | t
```

### Query 2: Count Policies Per Table
```sql
SELECT
  t.tablename,
  COUNT(p.policyname) as policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename
WHERE t.tablename IN ('rent_payment', 'tenant_payment_method', 'property', 'unit')
AND t.schemaname = 'public'
GROUP BY t.tablename
ORDER BY t.tablename;
```

**Expected Output**:
```
tablename                | policy_count
------------------------|-------------
property                | 6-8
rent_payment            | 4
tenant_payment_method   | 5-6
unit                    | 6-8
```

### Query 3: List All Policies
```sql
SELECT
  tablename,
  policyname,
  cmd as command
FROM pg_policies
WHERE tablename IN ('rent_payment', 'tenant_payment_method', 'property', 'unit')
ORDER BY tablename, policyname;
```

**Expected**: All policies from migrations listed

### Query 4: Test Current User Function (if using helper functions)
```sql
-- Check if helper functions exist
SELECT
  proname as function_name,
  pg_get_functiondef(oid)::text as definition
FROM pg_proc
WHERE proname IN ('get_current_user_id', 'get_current_tenant', 'get_tenant_id_for_current_user')
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
```

**Expected**: Functions exist (if migrations use them)

---

## 📊 Test Results Template

Use this template to document your test results:

### Backend Integration Tests
- **Date**: ___________
- **Environment**: [ ] Local [ ] Staging [ ] Production
- **Test Command**: `doppler run -- pnpm --filter @repo/backend test:integration`
- **Result**: [ ] PASS [ ] FAIL
- **Total Tests**: ___ passed, ___ failed, ___ total
- **Duration**: ___ seconds
- **Issues Found**:
  - [ ] None
  - [ ] List issues here

### Frontend Integration Tests
- **Date**: ___________
- **Environment**: [ ] Local [ ] Staging [ ] Production
- **Test Command**: `doppler run -- pnpm --filter @repo/frontend test:integration`
- **Result**: [ ] PASS [ ] FAIL
- **Total Tests**: ___ passed, ___ failed, ___ total
- **Duration**: ___ seconds
- **Issues Found**:
  - [ ] None
  - [ ] List issues here

### Manual Security Tests
- **Date**: ___________
- **Environment**: [ ] Local [ ] Staging [ ] Production
- **Scenarios Tested**:
  - [ ] Payment isolation (Scenario 1)
  - [ ] Payment method isolation (Scenario 2)
  - [ ] Frontend cannot create payments (Scenario 3)
  - [ ] Service role CAN create payments (Scenario 4)
  - [ ] Property ownership (Scenario 5)
- **Result**: [ ] PASS [ ] FAIL
- **Issues Found**:
  - [ ] None
  - [ ] List issues here

### Database Verification
- **Date**: ___________
- **Environment**: [ ] Local [ ] Staging [ ] Production
- **Queries Executed**:
  - [ ] RLS enabled check (Query 1)
  - [ ] Policy count check (Query 2)
  - [ ] Policy list check (Query 3)
  - [ ] Helper functions check (Query 4)
- **Result**: [ ] PASS [ ] FAIL
- **Issues Found**:
  - [ ] None
  - [ ] List issues here

---

## 🚨 Troubleshooting

### Issue: Backend Tests Fail with "fetch failed"

**Cause**: Missing environment variables or database unreachable

**Fix**:
```bash
# Verify doppler is configured
doppler setup

# Test connection
doppler run -- psql $DATABASE_URL -c "SELECT 1"

# Check test users exist
node scripts/check-test-users.js
```

### Issue: Frontend Tests Timeout

**Cause**: Backend not running or not healthy

**Fix**:
```bash
# Start backend in separate terminal
doppler run -- pnpm --filter @repo/backend dev

# Wait for health check
curl http://localhost:3001/health

# Then run frontend tests
doppler run -- pnpm --filter @repo/frontend test:integration
```

### Issue: RLS Blocks Valid Operations

**Cause**: Policies too restrictive or user context not set correctly

**Fix**:
1. Check user is authenticated: Verify JWT token exists
2. Check ownership: Verify ownerId/tenantId matches auth.uid()
3. Check role: Verify service_role used for system operations
4. Review policy definitions in migrations

### Issue: Tests Pass Locally, Fail in CI

**Cause**: Environment differences or missing test data

**Fix**:
1. Ensure CI has doppler access
2. Verify test users created in CI database
3. Check CI uses same Supabase project
4. Review CI logs for specific errors

---

## ✅ Success Checklist

- [ ] All 3 backend RLS test suites pass
- [ ] All 6 frontend integration test suites pass
- [ ] All 5 manual security scenarios verified
- [ ] All 4 database verification queries return expected results
- [ ] No console errors or warnings in test output
- [ ] Test coverage remains above 80%
- [ ] Performance metrics acceptable (tests < 5min total)

---

## 📝 Next Steps After Tests Pass

1. **Update PHASE-4-COMPLETION-SUMMARY.md** with test results
2. **Create PR** with test evidence included
3. **Request code review** from team
4. **Deploy to staging** for final verification
5. **Monitor production** after deployment

---

## 🔗 Related Documents

- **Phase 4 Plan**: `PHASE-4-PLAN.md`
- **Phase 4 Completion**: `PHASE-4-COMPLETION-SUMMARY.md`
- **Migration Guide**: `MIGRATIONS-TO-APPLY.md`
- **Auth Hook Setup**: `AUTH-HOOK-SETUP.md`
