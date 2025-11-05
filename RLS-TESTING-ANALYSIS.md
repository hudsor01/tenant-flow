# Row-Level Security (RLS) Testing Analysis

**Date**: 2025-02-15
**Status**: Phase 1 - Remediation Roadmap
**Priority**: P0 - Security Critical

## Executive Summary

This document analyzes the current state of RLS policy testing in the TenantFlow application and provides recommendations for comprehensive security validation.

**Current State**:
- ✅ SQL-level RLS verification in migrations
- ✅ Implicit RLS testing via frontend integration tests
- ❌ No explicit RLS boundary tests
- ❌ No backend integration tests for RLS policies

**Risk Assessment**: **MEDIUM**
- RLS policies are created and verified at SQL level
- Application code uses authenticated Supabase clients (RLS enforced)
- However, cross-user data access boundaries are not explicitly tested

---

## Current RLS Testing Approach

### 1. SQL Migration Verification (✅ Implemented)

**Location**: `supabase/migrations/*_rls.sql`

**Approach**: Each RLS migration includes a DO block that verifies:
- RLS is enabled on the table
- Required policies exist
- Policy names match expected patterns

**Example** (`20250215120000_add_rent_payment_rls.sql`):
```sql
DO $$
BEGIN
  -- Verify RLS is enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'rent_payment'
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS not enabled on rent_payment table';
  END IF;

  -- Verify SELECT policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'rent_payment'
    AND policyname = 'rent_payment_owner_or_tenant_select'
  ) THEN
    RAISE EXCEPTION 'SELECT policy not created for rent_payment';
  END IF;

  RAISE NOTICE 'rent_payment RLS policies successfully created and verified';
END $$;
```

**Coverage**: Validates that policies **exist**, but does NOT test that they work correctly.

**Files with RLS Verification**:
1. `20250215120000_add_rent_payment_rls.sql` - rent_payment table
2. `20250215120001_add_payment_method_rls.sql` - tenant_payment_method table
3. `20251031_fix_tenant_portal_rls_access.sql` - tenant portal access
4. `20251103_fix_property_rls_policy.sql` - property table
5. `20250215120000_fix_identity_rls.sql` - identity/auth tables
6. `20250111_fix_unit_lease_rls_infinite_recursion.sql` - unit/lease tables
7. `20250111_optimize_documents_rls_performance.sql` - document tables

---

### 2. Backend Unit Tests (❌ No RLS Testing)

**Location**: `apps/backend/src/**/*.spec.ts`

**Approach**: Mocked Supabase service, no real database access

**Example** (`tenants.service.spec.ts`):
```typescript
mockSupabaseService = createMockSupabaseService()
tenantsService = new TenantsService(
  mockSupabaseService as any,
  mockEventEmitter as any,
  mockStripeConnectService as any
)
```

**Coverage**: Tests service logic but does NOT test RLS enforcement.

**Why**: Unit tests use mocks, RLS is a database-level feature that requires real PostgreSQL connections.

---

### 3. Frontend Integration Tests (✅ Partial Coverage)

**Location**: `apps/frontend/tests/integration/hooks/api/*.test.tsx`

**Approach**: Real API calls to backend with authenticated user

**Example** (`use-tenants-crud.test.tsx`):
```typescript
// This is an INTEGRATION test - it calls the REAL API
// Make sure backend is running before running these tests

it('creates a new tenant successfully', async () => {
  const { result } = renderHook(() => useCreateTenant(), {
    wrapper: createWrapper()
  })

  const newTenant: CreateTenantRequest = {
    firstName: `TEST-CRUD John`,
    lastName: `Doe ${Date.now()}`,
    email: `test-tenant-${Date.now()}@example.com`,
    phone: '+1234567890'
  }

  const createdTenant = await result.current.mutateAsync(newTenant)

  expect(createdTenant!.version).toBe(1) // Optimistic locking
})
```

**Coverage**:
- ✅ Tests authenticated user can perform CRUD operations (happy path)
- ✅ Hits real RLS policies in database
- ❌ Does NOT test that users are isolated from each other's data
- ❌ Does NOT test role-based access (landlord vs tenant)

**Authentication Setup** (`apps/frontend/src/test/setup.ts`):
- Authenticates before running tests
- Uses real Supabase JWT tokens
- RLS policies ARE enforced

---

## Tables with RLS Policies

Based on migration analysis, the following tables have RLS policies:

### Payment Tables (P0 - Financial Data)
1. **rent_payment** - Landlord/Tenant scoped payments
   - SELECT: Landlords see their properties' payments, tenants see only their own
   - INSERT: Authenticated users (backend validates)
   - UPDATE: Authenticated users (Stripe webhooks)
   - DELETE: NONE (7-year retention requirement)

2. **tenant_payment_method** - PCI-scoped payment methods
   - SELECT: Tenants see ONLY their own payment methods
   - INSERT: Tenants can add their own methods
   - UPDATE: Tenants can update their own methods
   - DELETE: Tenants can delete their own methods

### Core Tables
3. **property** - Property ownership
4. **unit** - Unit ownership
5. **lease** - Lease visibility
6. **tenant** - Tenant data access
7. **maintenance_request** - Request visibility
8. **document** - Document access

### System Tables
9. **failed_notifications** - System monitoring
10. **webhook_failures** - Webhook tracking
11. **webhook_metrics** - Metrics tracking
12. **faq_categories** - FAQ content
13. **faq_questions** - FAQ content

---

## Security Model

### Identity System (Triple-ID)

```
Supabase Auth (auth.users)
    ↓ auth.uid()
Users Table (users.supabaseId)
    ↓ users.id
Domain Tables (tenant.id, property.landlordId, etc.)
```

### RLS Policy Pattern

```sql
CREATE POLICY "table_owner_select"
ON table_name
FOR SELECT
TO authenticated
USING (
  ownerId IN (
    SELECT id FROM users WHERE "supabaseId" = (SELECT auth.uid()::text)
  )
);
```

**Defense-in-Depth**:
1. **Database Layer**: RLS policies enforce `auth.uid()` filtering
2. **Application Layer**: Backend passes explicit `p_user_id` parameters to RPC functions
3. **API Layer**: Guards and decorators verify authentication/authorization

---

## Gaps in RLS Testing

### Critical Gap: No Cross-User Boundary Tests

**Issue**: Tests verify authenticated users can access their own data, but do NOT verify users CANNOT access other users' data.

**Example Missing Tests**:
```typescript
describe('RLS Boundary Tests', () => {
  it('prevents tenant A from viewing tenant B payments', async () => {
    // Login as tenant A
    const tenantA = await authenticateAs('tenant-a@example.com')

    // Create payment for tenant B
    const tenantB = await authenticateAs('tenant-b@example.com')
    const paymentB = await createPayment(tenantB.id)

    // Switch back to tenant A
    await authenticateAs('tenant-a@example.com')

    // Attempt to fetch tenant B's payment - should fail
    await expect(
      clientFetch(`/api/v1/rent-payments/${paymentB.id}`)
    ).rejects.toThrow('Forbidden')
  })

  it('prevents tenant from viewing landlord financial data', async () => {
    // Similar cross-role boundary test
  })
})
```

### Medium Gap: No Role-Based Access Tests

**Issue**: No tests verify landlord vs tenant access boundaries.

**Example**:
- Can tenants view payment methods? (NO - PCI compliance)
- Can landlords view their tenants' payments? (YES)
- Can tenants view other tenants in the same property? (Depends on use case)

### Low Gap: No Negative Path Tests

**Issue**: Tests only verify successful operations, not failed authorization.

**Example**:
```typescript
it('returns 404 when accessing non-existent resource', async () => {
  // Test returns correct error, not leaking existence
})
```

---

## Recommendations

### Immediate Actions (Phase 1)

#### 1. Document Current State ✅
- This document serves as the analysis
- Commit to repository for team visibility

#### 2. Add RLS Boundary Tests to Frontend Integration Suite

**Rationale**:
- Frontend integration tests already hit real database
- Authentication infrastructure exists
- No new test environment needed

**Implementation**:
```typescript
// apps/frontend/tests/integration/rls/payment-isolation.test.tsx
describe('RLS: Payment Isolation Tests', () => {
  let landlordToken: string
  let tenantAToken: string
  let tenantBToken: string

  beforeAll(async () => {
    // Create test users with different roles
    landlordToken = await createTestUser('landlord')
    tenantAToken = await createTestUser('tenant')
    tenantBToken = await createTestUser('tenant')
  })

  it('prevents tenant A from accessing tenant B payments', async () => {
    // Use tenantBToken to create payment
    // Switch to tenantAToken and attempt access
    // Verify 403 Forbidden or 404 Not Found
  })

  it('allows landlord to view tenant payments for their properties', async () => {
    // Create property as landlord
    // Create payment as tenant for that property
    // Verify landlord can view payment
  })
})
```

**Coverage Targets**:
- Payment isolation (tenant-to-tenant)
- Payment method isolation (PCI requirement)
- Property access (landlord-to-tenant)
- Maintenance request visibility
- Document access boundaries

#### 3. Add RLS Test Checklist to Migration Template

Create `supabase/migrations/MIGRATION_TEMPLATE.md`:
```markdown
## RLS Migration Checklist

- [ ] RLS enabled on table
- [ ] SELECT policy created
- [ ] INSERT policy created (if applicable)
- [ ] UPDATE policy created (if applicable)
- [ ] DELETE policy created (if applicable)
- [ ] Verification DO block added
- [ ] Frontend integration test added to test boundaries
```

---

### Future Enhancements (Phase 2+)

#### 1. Backend Integration Tests (Optional)

**Rationale**: If frontend integration tests become too slow or complex.

**Approach**:
```typescript
// apps/backend/test/integration/rls/payment.integration.spec.ts
describe('RLS: Payment Policies', () => {
  let supabaseClientA: SupabaseClient
  let supabaseClientB: SupabaseClient

  beforeAll(async () => {
    // Create test users and get real JWT tokens
    const userA = await createTestUser()
    const userB = await createTestUser()

    supabaseClientA = createClient(SUPABASE_URL, SUPABASE_KEY, {
      global: { headers: { Authorization: `Bearer ${userA.token}` } }
    })

    supabaseClientB = createClient(SUPABASE_URL, SUPABASE_KEY, {
      global: { headers: { Authorization: `Bearer ${userB.token}` } }
    })
  })

  it('enforces tenant payment isolation', async () => {
    // Create payment as user A
    const { data: payment } = await supabaseClientA
      .from('rent_payment')
      .insert({ /* ... */ })
      .select()
      .single()

    // Attempt to access as user B
    const { data, error } = await supabaseClientB
      .from('rent_payment')
      .select()
      .eq('id', payment.id)
      .single()

    expect(data).toBeNull()
    expect(error).toBeDefined() // RLS blocks access
  })
})
```

**Requirements**:
- Test database environment
- Test user creation/cleanup
- Real Supabase client configuration
- Separate from unit tests (`.integration.spec.ts`)

#### 2. Automated RLS Policy Audit

**Approach**: Script to verify all tables have RLS policies.

```typescript
// scripts/audit-rls-policies.ts
import { createClient } from '@supabase/supabase-js'

async function auditRLSPolicies() {
  const tables = await getPublicTables()

  for (const table of tables) {
    const rlsEnabled = await checkRLSEnabled(table)
    const policies = await getPolicies(table)

    console.log(`${table}: RLS ${rlsEnabled ? '✅' : '❌'}, Policies: ${policies.length}`)

    if (!rlsEnabled && shouldHaveRLS(table)) {
      console.warn(`⚠️  ${table} missing RLS policies`)
    }
  }
}
```

---

## Testing Strategy Summary

| Test Type | Location | Coverage | RLS Testing | Priority |
|-----------|----------|----------|-------------|----------|
| SQL Verification | `supabase/migrations` | Policy existence | ✅ Partial | P0 |
| Backend Unit Tests | `apps/backend/**/*.spec.ts` | Service logic | ❌ None | N/A |
| Frontend Integration | `apps/frontend/tests/integration` | Happy path CRUD | ✅ Implicit | P0 |
| **RLS Boundary Tests** | **TBD** | **Cross-user isolation** | **❌ Missing** | **P1** |
| Backend Integration | Future | Database-level RLS | ❌ None | P2 |

---

## Conclusion

**Current State**: RLS policies are created and verified to exist, but cross-user data isolation is not explicitly tested.

**Risk Level**: MEDIUM
- Defense-in-depth architecture mitigates some risk
- Application layer enforces authorization
- Database RLS policies are in place
- However, lack of boundary tests means potential bugs could leak data

**Recommended Action**:
1. ✅ **Accept current state for Phase 1** (policies exist, verified at SQL level)
2. 📋 **Document this analysis** (this file)
3. 🎯 **Add to Phase 2 roadmap**: Implement RLS boundary tests in frontend integration suite

**Timeline**:
- Phase 1: Document current state (COMPLETE)
- Phase 2: Add frontend RLS boundary tests (RECOMMENDED)
- Phase 3: Backend integration tests (OPTIONAL)

---

## References

- Frontend Integration Tests: `apps/frontend/tests/integration/hooks/api/`
- RLS Migrations: `supabase/migrations/*_rls.sql`
- Auth Testing Helpers: `apps/backend/src/shared/test-utils/auth-testing.helpers.ts`
- CLAUDE.md Testing Guidelines: "Every endpoint, all service logic, mock externals"
