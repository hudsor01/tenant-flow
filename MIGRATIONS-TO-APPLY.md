# Pending Database Migrations

**Date**: 2025-11-05
**Status**: Ready to Apply
**Environment**: Production (requires doppler + database access)

---

## Critical Security Migrations (MUST APPLY FIRST)

These migrations contain critical security fixes identified in PR #376 and Phase 3 work.

### 1. Payment RLS Migration ⚠️ **CRITICAL**

**File**: `supabase/migrations/20250215120000_add_rent_payment_rls.sql`
**Priority**: **P0 - SECURITY CRITICAL**
**Risk**: HIGH (affects payment security)
**Dependencies**: None

**What It Does**:
- Enables RLS on `rent_payment` table
- Creates `get_current_user_id()` helper function (performance optimization)
- **CRITICAL**: Restricts INSERT/UPDATE to `service_role` only
- Landlords/tenants can SELECT their own payments
- Enforces payment field immutability (amount, landlordId, tenantId cannot change)

**Impact**:
- ✅ Prevents unauthorized payment creation via frontend
- ✅ Prevents payment amount tampering
- ✅ Enforces accounting best practices (immutability)

**Command**:
```bash
doppler run -- psql $DIRECT_URL -f supabase/migrations/20250215120000_add_rent_payment_rls.sql
```

**Verification**:
```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename = 'rent_payment';
-- Expected: rowsecurity = true

-- Check policies
SELECT policyname, roles, cmd FROM pg_policies
WHERE tablename = 'rent_payment'
ORDER BY policyname;
-- Expected:
-- rent_payment_owner_or_tenant_select | authenticated | SELECT
-- rent_payment_system_insert | service_role | INSERT
-- rent_payment_system_update | service_role | UPDATE

-- Test authenticated user CANNOT insert (should return error)
-- (Run as authenticated user via application)
INSERT INTO rent_payment (tenantId, landlordId, leaseId, amount, status)
VALUES ('test', 'test', 'test', 100, 'pending');
-- Expected: ERROR - new row violates row-level security policy
```

**Rollback** (if needed):
```sql
DROP POLICY IF EXISTS "rent_payment_system_insert" ON rent_payment;
DROP POLICY IF EXISTS "rent_payment_system_update" ON rent_payment;
DROP POLICY IF EXISTS "rent_payment_owner_or_tenant_select" ON rent_payment;
DROP FUNCTION IF EXISTS get_current_user_id();
ALTER TABLE rent_payment DISABLE ROW LEVEL SECURITY;
```

---

### 2. Payment Method RLS Migration ⚠️ **CRITICAL**

**File**: `supabase/migrations/20250215120001_add_payment_method_rls.sql`
**Priority**: **P0 - SECURITY CRITICAL (PCI DSS)**
**Risk**: HIGH (PCI compliance violation if not applied)
**Dependencies**: None

**What It Does**:
- Enables RLS on `tenant_payment_method` table
- Creates `get_current_tenant()` helper function
- Tenants can CRUD ONLY their own payment methods
- Landlords CANNOT view tenant payment methods (PCI restriction)

**Impact**:
- ✅ PCI DSS compliance (tenant payment method isolation)
- ✅ Prevents cross-tenant payment method access
- ✅ Principle of least privilege

**Command**:
```bash
doppler run -- psql $DIRECT_URL -f supabase/migrations/20250215120001_add_payment_method_rls.sql
```

**Verification**:
```sql
-- Check RLS enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename = 'tenant_payment_method';

-- Check policies
SELECT policyname, roles, cmd FROM pg_policies
WHERE tablename = 'tenant_payment_method'
ORDER BY policyname;
-- Expected:
-- tenant_payment_method_owner_select | authenticated | SELECT
-- tenant_payment_method_owner_insert | authenticated | INSERT
-- tenant_payment_method_owner_update | authenticated | UPDATE
-- tenant_payment_method_owner_delete | authenticated | DELETE
```

**Rollback**:
```sql
DROP POLICY IF EXISTS "tenant_payment_method_owner_select" ON tenant_payment_method;
DROP POLICY IF EXISTS "tenant_payment_method_owner_insert" ON tenant_payment_method;
DROP POLICY IF EXISTS "tenant_payment_method_owner_update" ON tenant_payment_method;
DROP POLICY IF EXISTS "tenant_payment_method_owner_delete" ON tenant_payment_method;
DROP FUNCTION IF EXISTS get_current_tenant();
ALTER TABLE tenant_payment_method DISABLE ROW LEVEL SECURITY;
```

---

### 3. Notification Preferences Migration

**File**: `supabase/migrations/20250216000000_add_notification_preferences.sql`
**Priority**: P1 - Feature Enhancement
**Risk**: LOW (additive change)
**Dependencies**: None

**What It Does**:
- Adds `notification_preferences` column to `tenant` table
- Stores tenant notification settings (email, SMS, push)

**Command**:
```bash
doppler run -- psql $DIRECT_URL -f supabase/migrations/20250216000000_add_notification_preferences.sql
```

**Verification**:
```sql
-- Check column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tenant'
AND column_name = 'notification_preferences';
```

---

### 4. Emergency Contact Migration ✅ **ALREADY APPLIED** (Verify Only)

**File**: `supabase/migrations/20250216000100_create_tenant_emergency_contact.sql`
**Priority**: P1 - Feature Enhancement
**Status**: ✅ Applied (per git logs) - verification only
**Risk**: LOW

**What It Does**:
- Creates `tenant_emergency_contact` table
- Adds RLS policies for tenant-scoped CRUD
- Stores emergency contact info for tenants

**Verification Only** (no need to apply):
```sql
-- Table exists
SELECT * FROM pg_tables WHERE tablename = 'tenant_emergency_contact';

-- RLS enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename = 'tenant_emergency_contact';

-- Policies exist
SELECT policyname, roles, cmd FROM pg_policies
WHERE tablename = 'tenant_emergency_contact'
ORDER BY policyname;
-- Expected:
-- tenant_emergency_contact_select | authenticated | SELECT
-- tenant_emergency_contact_insert | authenticated | INSERT
-- tenant_emergency_contact_update | authenticated | UPDATE
-- tenant_emergency_contact_delete | authenticated | DELETE
```

---

## Post-Migration Tasks

### 5. Regenerate Supabase Types ⚠️ **REQUIRED**

**Command**:
```bash
doppler run -- npx supabase gen types typescript \
  --project-id "bshjmbshupiibfiewpxb" \
  --schema public \
  > packages/shared/src/types/supabase-generated.ts
```

**Why Required**:
- Current `supabase-generated.ts` is empty (0 bytes)
- Backend typecheck fails without generated types
- Must include `notification_preferences` column
- Must include `tenant_emergency_contact` table

**Verification**:
```bash
# Check file is not empty
wc -l packages/shared/src/types/supabase-generated.ts
# Expected: > 1000 lines

# Verify types compile
pnpm --filter @repo/shared build
pnpm --filter @repo/backend typecheck
pnpm --filter @repo/frontend typecheck
# All should pass
```

---

## Migration Application Order

**CRITICAL - Apply in this exact order**:

1. ⚠️ **Payment RLS** (`20250215120000_add_rent_payment_rls.sql`) - **SECURITY CRITICAL**
2. ⚠️ **Payment Method RLS** (`20250215120001_add_payment_method_rls.sql`) - **PCI CRITICAL**
3. **Notification Preferences** (`20250216000000_add_notification_preferences.sql`)
4. ✅ **Emergency Contact** - Already applied, verify only
5. 🔧 **Regenerate Types** - Run after all migrations

---

## Migration Checklist

### Pre-Migration

- [ ] Backup production database
- [ ] Verify doppler access works: `doppler run -- echo "test"`
- [ ] Verify database connection: `doppler run -- psql $DIRECT_URL -c "SELECT version();"`
- [ ] Review rollback plans for each migration
- [ ] Notify team of maintenance window

### Apply Migrations (Staging First)

- [ ] **Migration 1**: Payment RLS (`20250215120000`)
  - [ ] Apply migration
  - [ ] Run verification SQL
  - [ ] Test backend payment creation
  - [ ] Test frontend CANNOT create payments (should fail)
  - [ ] Test Stripe webhooks work

- [ ] **Migration 2**: Payment Method RLS (`20250215120001`)
  - [ ] Apply migration
  - [ ] Run verification SQL
  - [ ] Test tenant can CRUD their own payment methods
  - [ ] Test tenant CANNOT access other tenant's payment methods

- [ ] **Migration 3**: Notification Preferences (`20250216000000`)
  - [ ] Apply migration
  - [ ] Verify column exists
  - [ ] Test notification settings API

- [ ] **Migration 4**: Emergency Contact (verify only)
  - [ ] Run verification SQL
  - [ ] Test emergency contact CRUD via API

### Post-Migration

- [ ] **Regenerate Supabase types**
  - [ ] Run type generation command
  - [ ] Verify file is not empty (>1000 lines)
  - [ ] Commit updated types
  - [ ] Run all typecheck commands

- [ ] **Run Integration Tests**
  - [ ] Backend RLS tests: `pnpm --filter @repo/backend test:integration rls/`
  - [ ] Expected: 46+ tests passing

- [ ] **Manual Security Testing**
  - [ ] Execute tests from E2E-SECURITY-VERIFICATION.md
  - [ ] Focus on critical tests 3.1 & 3.2 (payment INSERT/UPDATE prevention)

### Production Deployment

- [ ] Apply migrations to production (same order as staging)
- [ ] Regenerate types in production
- [ ] Monitor payment creation for 24 hours
- [ ] Monitor error logs for RLS violations (should be 0)
- [ ] Verify Stripe webhooks processing correctly

---

## Rollback Plan

If any migration causes issues:

1. **Stop immediately** - Do not proceed to next migration
2. **Run rollback SQL** (provided above for each migration)
3. **Verify rollback** - Check tables/policies removed
4. **Investigate issue** - Review logs, test locally
5. **Fix and re-apply** - Once issue resolved

---

## Testing Checklist After All Migrations

### Backend API Tests

- [ ] Create payment via API: `POST /api/v1/rent-payments/create`
- [ ] Webhook payment creation: Stripe checkout.session.completed
- [ ] Payment history query: `GET /api/v1/rent-payments/history`
- [ ] Payment method CRUD: `GET/POST/PUT/DELETE /api/v1/payment-methods`

### Security Tests (Critical)

- [ ] **Test 1**: Authenticated user CANNOT insert payment (direct DB)
  ```sql
  -- Should fail with RLS error
  INSERT INTO rent_payment (...) VALUES (...);
  ```

- [ ] **Test 2**: Authenticated user CANNOT update payment amount
  ```sql
  -- Should fail with RLS error
  UPDATE rent_payment SET amount = 1 WHERE id = 'xxx';
  ```

- [ ] **Test 3**: Tenant A CANNOT access Tenant B's payment methods
  ```typescript
  // Should return empty array
  const { data } = await supabase
    .from('tenant_payment_method')
    .select('*')
    .eq('tenantId', 'TENANT_B_ID')
  ```

- [ ] **Test 4**: Backend service role CAN create payments
  ```typescript
  // Should succeed
  const { data } = await adminClient
    .from('rent_payment')
    .insert({ ... })
  ```

---

## Known Issues & Workarounds

### Issue 1: Doppler Not Available

**Symptoms**: `doppler: command not found`

**Workaround**:
1. Install doppler: `brew install dopplerhq/cli/doppler` (Mac) or `curl -Ls https://cli.doppler.com/install.sh | sh` (Linux)
2. Login: `doppler login`
3. Setup project: `doppler setup`

### Issue 2: Empty supabase-generated.ts

**Symptoms**: Backend typecheck fails with "Module has no exported member"

**Fix**: Run type regeneration (Migration Task 5 above)

### Issue 3: Migration Already Applied Error

**Symptoms**: `ERROR: relation "rent_payment" already has row level security enabled`

**Solution**: Migration already applied - skip to verification step

---

## Monitoring Post-Migration

### Metrics to Watch (First 24 Hours)

1. **Payment Creation Success Rate**
   - Monitor: Backend logs for payment INSERT operations
   - Expected: 100% success rate via backend API
   - Alert if: Any failures

2. **RLS Policy Violations**
   - Monitor: PostgreSQL logs for "row-level security policy" errors
   - Expected: 0 violations from legitimate traffic
   - Alert if: > 0 violations (indicates attempted unauthorized access)

3. **Stripe Webhook Processing**
   - Monitor: Webhook event logs
   - Expected: checkout.session.completed creates payment records
   - Alert if: Webhooks fail to create payments

4. **Frontend Errors**
   - Monitor: Frontend error logs
   - Expected: No new errors related to payments
   - Alert if: Spike in payment-related errors

### PostgreSQL Monitoring Queries

**Note**: The `pg_stat_get_tuples_returned()` function does NOT detect RLS filtering or policy violations.
It only counts tuples returned by the executor, which are already filtered by RLS.

For effective RLS monitoring, use these approaches:

#### 1. List All RLS Policies and Their Definitions

```sql
-- View all RLS policies on payment tables with their conditions
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,     -- PERMISSIVE or RESTRICTIVE
    roles,          -- Which roles this applies to
    cmd,            -- ALL, SELECT, INSERT, UPDATE, DELETE
    qual,           -- USING clause (for SELECT/UPDATE/DELETE)
    with_check      -- WITH CHECK clause (for INSERT/UPDATE)
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('rent_payment', 'tenant_payment_method')
ORDER BY tablename, policyname;
```

#### 2. Monitor Active Queries Against RLS Tables

```sql
-- See what queries are running against RLS-protected tables
-- Useful for spotting unexpected access patterns
SELECT
    pid,
    usename,
    application_name,
    client_addr,
    state,
    query_start,
    left(query, 100) as query_preview
FROM pg_stat_activity
WHERE state = 'active'
  AND (query ILIKE '%rent_payment%'
       OR query ILIKE '%tenant_payment_method%')
  AND query NOT ILIKE '%pg_stat_activity%'
ORDER BY query_start DESC;
```

#### 3. Detect Filtered Results (Compare Privileged vs Application Role)

RLS filtering is silent - denied rows simply don't appear. To detect if RLS is working:

```sql
-- Run as privileged role (service_role or postgres) to see ALL rows
SET ROLE postgres;
SELECT COUNT(*) as total_rows_privileged
FROM rent_payment;

-- Run as application role to see RLS-filtered rows
SET ROLE authenticated;  -- or your application role
SELECT COUNT(*) as visible_rows_application
FROM rent_payment;

-- Compare: If RLS is working correctly, counts should differ based on context
-- In production, you'd compare counts per tenant/owner to validate isolation
```

#### 4. Controlled Test Queries to Validate RLS

```sql
-- Test 1: Verify tenant can only see their own payment methods
SET ROLE authenticated;
SET request.jwt.claims.user_role = 'TENANT';
SET request.jwt.claims.sub = 'test-tenant-user-id';

SELECT COUNT(*) FROM tenant_payment_method;
-- Should only return payment methods for this tenant

-- Test 2: Verify property owner can only see payments for their properties
SET request.jwt.claims.user_role = 'PROPERTY_OWNER';
SET request.jwt.claims.sub = 'test-owner-user-id';

SELECT COUNT(*) FROM rent_payment;
-- Should only return payments for properties owned by this user
```

#### 5. Enable Structured Audit Logging (Recommended for Production)

For production environments, enable pgAudit or create audit triggers:

```sql
-- Option A: Install pgAudit extension (requires superuser)
CREATE EXTENSION IF NOT EXISTS pgaudit;

-- Configure to log all access to RLS tables
ALTER DATABASE postgres SET pgaudit.log = 'read,write';
ALTER DATABASE postgres SET pgaudit.log_relation = ON;

-- Option B: Create custom audit logging via SECURITY DEFINER function
CREATE OR REPLACE FUNCTION log_rls_access(
    table_name text,
    operation text,
    row_count integer,
    user_id text,
    user_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO audit.rls_access_log (
        table_name,
        operation,
        row_count,
        user_id,
        user_role,
        accessed_at
    ) VALUES (
        table_name,
        operation,
        row_count,
        user_id,
        user_role,
        NOW()
    );
END;
$$;

-- Wrap sensitive queries to log access attempts
-- Example: In your application code, after a query:
-- SELECT log_rls_access('rent_payment', 'SELECT', found_rows, current_user_id, current_user_role);
```

#### 6. Check PostgreSQL Logs for RLS Violations

```sql
-- Check for RLS policy violations in PostgreSQL logs
-- Look for these error messages:
-- - "new row violates row-level security policy"
-- - "permission denied for table" (when RLS blocks access)

-- Enable logging of RLS denials in postgresql.conf:
-- log_statement = 'all'  # or 'mod' for INSERT/UPDATE/DELETE
-- log_error_verbosity = 'verbose'
```

**Summary**: RLS filtering is silent by design. To monitor it effectively:
- Use `pg_policies` to audit policy definitions
- Use `pg_stat_activity` to monitor active queries
- Compare counts between privileged and application roles
- Run controlled test queries to validate isolation
- Enable pgAudit or custom audit logging for production monitoring

---

## Success Criteria

Migration deployment is **SUCCESSFUL** when:

- ✅ All 3 migrations applied without errors
- ✅ All verification SQL queries return expected results
- ✅ Supabase types regenerated (file > 1000 lines)
- ✅ All typecheck commands pass
- ✅ Backend RLS integration tests pass (46+ tests)
- ✅ Critical security tests pass (payment INSERT/UPDATE blocked)
- ✅ Backend payment creation works
- ✅ Stripe webhooks work
- ✅ No RLS violations in logs (24 hour monitoring)
- ✅ No spike in errors (24 hour monitoring)

---

## Documentation References

- **Phase 3 Plan**: `PHASE-3-PLAN.md`
- **Phase 3 Status**: `PHASE-3-STATUS.md`
- **Service Role Verification**: `SERVICE-ROLE-VERIFICATION.md`
- **E2E Security Testing**: `E2E-SECURITY-VERIFICATION.md`
- **Backend RLS Tests**: `apps/backend/tests/integration/rls/`

---

**Last Updated**: 2025-11-05
**Status**: Ready for staging deployment
