# Row-Level Security (RLS) Policies

## Overview

TenantFlow uses PostgreSQL Row-Level Security (RLS) policies to enforce data isolation at the database layer. This provides defense-in-depth security where even if application code has bugs, the database prevents unauthorized access.

## Policy Coverage Matrix

| Table | Owner Access | Tenant Access | System Access | Delete Allowed |
|-------|--------------|---------------|---------------|----------------|
| `property` | CRUD (own) | - | Read (admin) | ✅ Yes |
| `unit` | CRUD (own property) | Read (assigned) | Read (admin) | ✅ Yes |
| `lease` | CRUD (own property) | Read (own) | Read (admin) | ✅ Yes |
| `maintenance_request` | CRUD (own property) | CR (own) | Read (admin) | ✅ Owner only |
| `rent_payment` | Read (own) | Read (own) | CRU (system) | ❌ No (7-year retention) |
| `tenant_payment_method` | - | CRUD (own) | Read (system) | ✅ Tenant only |
| `documents` | CRUD (own) | Read (own) | Read (admin) | ✅ Soft delete |
| `notifications` | CRUD (own) | CRUD (own) | Create (system) | ✅ Yes |
| `users` | Read/Update (self) | Read/Update (self) | CRUD (admin) | ❌ No |

**Legend:**
- **C** = Create
- **R** = Read
- **U** = Update
- **D** = Delete
- **-** = No access

## Core Security Principles

### 1. Identity Resolution Pattern

All RLS policies use this pattern to resolve `auth.uid()` to `users.id`:

```sql
WHERE "ownerId" IN (
  SELECT id FROM users WHERE "supabaseId" = auth.uid()::text
)
```

**Why:**
- `auth.uid()` returns Supabase Auth UID (from JWT)
- Foreign keys reference `users.id` (internal UUID)
- Lookup via `users.supabaseId` bridges the gap

### 2. Helper Functions for Complex Ownership

For ownership chains (e.g., property → unit → lease), use `SECURITY DEFINER` helpers:

```sql
CREATE OR REPLACE FUNCTION public.user_owns_property(property_id text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM property
    WHERE id = property_id
    AND "ownerId" IN (
      SELECT id FROM users WHERE "supabaseId" = auth.uid()::text
    )
  );
$$;
```

**Benefits:**
- Prevents infinite recursion (`unit` ↔ `lease` circular dependency)
- Centralized ownership logic
- Better query optimization

### 3. Performance Optimization

Always wrap `auth.uid()` in a subquery for single evaluation:

```sql
-- ✅ GOOD: Evaluated once per query
USING (user_id = (SELECT auth.uid()))

-- ❌ BAD: Re-evaluated for each row
USING (user_id = auth.uid())
```

## Policy Definitions by Table

### Property Table

**Purpose:** Multi-family properties owned by landlords

**Policies:**
- `property_owner_select` - Owners view their own properties
- `property_owner_insert` - Owners create properties for themselves
- `property_owner_update` - Owners update their own properties
- `property_owner_delete` - Owners delete their own properties

**Migration:** `20251103_fix_property_rls_policy.sql`

**Key Security Fix:**
Original policies used `ownerId = auth.uid()::text` which caused all inserts to fail because `ownerId` is set to `users.id` (not `auth.uid()`). Fixed by using lookup pattern.

```sql
CREATE POLICY "property_owner_insert"
ON property FOR INSERT TO authenticated
WITH CHECK (
  "ownerId" IN (
    SELECT id FROM users WHERE "supabaseId" = auth.uid()::text
  )
);
```

### Unit Table

**Purpose:** Individual rental units within properties

**Policies:**
- `unit_owner_or_tenant_select` - Owners see all units, tenants see assigned unit
- `unit_owner_insert` - Only owners can create units
- `unit_owner_update` - Only owners can update units
- `unit_owner_delete` - Only owners can delete units

**Migration:** `20250111_fix_unit_lease_rls_infinite_recursion.sql`

**Key Pattern:** Uses `user_owns_property()` and `user_is_active_tenant_of_unit()` helpers to prevent recursion.

```sql
CREATE POLICY "unit_owner_or_tenant_select"
ON unit FOR SELECT TO authenticated
USING (
  user_owns_property("propertyId")  -- Owner access
  OR
  user_is_active_tenant_of_unit(id)  -- Tenant access (read-only)
);
```

### Lease Table

**Purpose:** Rental agreements between landlords and tenants

**Policies:**
- `lease_owner_or_tenant_select` - Owners see all leases, tenants see own
- `lease_owner_insert` - Only owners can create leases
- `lease_owner_update` - Only owners can update leases
- `lease_owner_delete` - Only owners can delete leases

**Migration:** `20250111_fix_unit_lease_rls_infinite_recursion.sql`

**Multi-Role Access:**
```sql
CREATE POLICY "lease_owner_or_tenant_select"
ON lease FOR SELECT TO authenticated
USING (
  -- Owners: Check via unit → property ownership
  EXISTS (
    SELECT 1 FROM unit
    WHERE unit.id = lease."unitId"
    AND user_owns_property(unit."propertyId")
  )
  OR
  -- Tenants: Direct tenantId match
  "tenantId" IN (
    SELECT id FROM users WHERE "supabaseId" = auth.uid()::text
  )
);
```

### Maintenance Request Table

**Purpose:** Repair/maintenance requests from tenants

**Policies:**
- `maintenance_request_owner_or_tenant_select` - Owners and requesting tenants can view
- `maintenance_request_owner_or_tenant_insert` - Owners and tenants can create
- `maintenance_request_owner_or_tenant_update` - Owners and creators can update
- `maintenance_request_owner_delete` - Only owners can delete

**Migration:** `20251031_fix_tenant_portal_rls_access.sql`

**Tenant Creation Rule:**
Tenants can only create requests for their active lease unit:

```sql
CREATE POLICY "maintenance_request_owner_or_tenant_insert"
ON maintenance_request FOR INSERT TO authenticated
WITH CHECK (
  -- Owners: Check property ownership
  "unitId" IN (
    SELECT u.id FROM unit u
    JOIN property p ON u."propertyId" = p.id
    WHERE user_owns_property(p.id)
  )
  OR
  -- Tenants: Must be for their active lease unit
  (
    "unitId" IN (
      SELECT l."unitId" FROM lease l
      WHERE l."tenantId" IN (
        SELECT id FROM users WHERE "supabaseId" = auth.uid()::text
      )
      AND l.status = 'ACTIVE'
    )
    AND "createdBy" IN (
      SELECT id FROM users WHERE "supabaseId" = auth.uid()::text
    )
  )
);
```

### Rent Payment Table (NEW)

**Purpose:** Financial transactions for rent payments

**Policies:**
- `rent_payment_owner_or_tenant_select` - Landlords and tenants see their payments
- `rent_payment_system_insert` - Backend creates via Stripe webhooks
- `rent_payment_system_update` - Backend updates payment status
- **NO DELETE POLICY** - 7-year retention requirement

**Migration:** `20250215120000_add_rent_payment_rls.sql`

**Critical Security:**
This table had **NO RLS policies** before this migration, exposing all payment data!

```sql
CREATE POLICY "rent_payment_owner_or_tenant_select"
ON rent_payment FOR SELECT TO authenticated
USING (
  landlordId IN (
    SELECT id FROM users WHERE "supabaseId" = auth.uid()::text
  )
  OR
  tenantId IN (
    SELECT id FROM users WHERE "supabaseId" = auth.uid()::text
  )
);
```

**Immutability:**
Payments are immutable after creation (accounting best practice). Only system can update status via Stripe webhooks.

**Compliance:**
No DELETE policy enforces 7-year retention for financial/legal compliance.

### Tenant Payment Method Table (NEW)

**Purpose:** Saved payment methods (Stripe PM IDs)

**Policies:**
- `tenant_payment_method_owner_select` - Tenants see ONLY their own
- `tenant_payment_method_owner_insert` - Tenants can add their own
- `tenant_payment_method_owner_update` - Tenants can update their own
- `tenant_payment_method_owner_delete` - Tenants can delete their own

**Migration:** `20250215120001_add_payment_method_rls.sql`

**PCI Compliance:**
This table had **NO RLS policies**, violating PCI DSS requirements for payment data access control.

```sql
CREATE POLICY "tenant_payment_method_owner_select"
ON tenant_payment_method FOR SELECT TO authenticated
USING (
  tenantId IN (
    SELECT id FROM users WHERE "supabaseId" = auth.uid()::text
  )
);
```

**Storage Rules:**
- ONLY store: Stripe PM ID (`pm_xxx`), last4, brand, type
- NEVER store: Full card numbers, CVV, expiration date
- Stripe handles all sensitive data

**Access Control:**
- Landlords CANNOT view tenant payment methods (PCI principle of least privilege)
- Only tenant and system (via service role) can access

### Documents Table

**Purpose:** Lease documents, receipts, notices

**Policies:**
- `Users can view their own documents` - User-scoped read access
- `Users can upload documents` - User-scoped create (lease/receipt only)
- `Users can soft-delete documents` - User-scoped update

**Migration:** `20250111_optimize_documents_rls_performance.sql`

**Performance Optimization:**
Uses `(SELECT auth.uid())` pattern for single evaluation per query.

**Entity Type Restriction:**
Only `lease` and `receipt` document types allowed via policy (security hardening).

### Notifications Table

**Purpose:** In-app notifications for users

**Policies:**
- `notifications_user_select` - Users view their own notifications
- `notifications_system_insert` - System can create for any user
- `notifications_user_update` - Users can update their own (mark as read)
- `notifications_user_delete` - Users can delete their own

**Migration:** `20250111_fix_unit_lease_rls_infinite_recursion.sql`

**System Access:**
`INSERT` policy uses `WITH CHECK (true)` to allow backend to create notifications for any user.

## Testing RLS Policies

### Manual Testing

```sql
-- Test as tenant
SET ROLE authenticated;
SET request.jwt.claims = '{"sub": "tenant-auth-uid"}';

-- Should only see tenant's own data
SELECT COUNT(*) FROM lease;  -- Should be 1 (their lease)
SELECT COUNT(*) FROM rent_payment WHERE "tenantId" != 'tenant-users-id';  -- Should be 0

-- Reset
RESET ROLE;
```

### Automated Verification

Run the verification script:

```bash
psql $DIRECT_URL -f scripts/verify-rls-coverage.sql
```

**Checks:**
1. All tables with RLS enabled have at least one policy
2. Critical tables (property, unit, lease, payments) have RLS enabled
3. Payment tables have proper SELECT policies (PCI compliance)

### Backend Integration Tests

**File:** `apps/backend/src/test/rls-policies.spec.ts`

```typescript
describe('RLS Policies', () => {
  describe('rent_payment table', () => {
    it('allows tenants to view their own payments', async () => {
      const { data } = await tenantClient.from('rent_payment').select()
      expect(data.every(p => p.tenantId === tenantUserId)).toBe(true)
    })

    it('prevents tenants from viewing other tenant payments', async () => {
      const { data } = await tenantClient
        .from('rent_payment')
        .select()
        .eq('tenantId', otherTenantId)
      expect(data).toHaveLength(0)  // RLS blocks access
    })
  })
})
```

## Common Issues & Solutions

### Issue 1: Infinite Recursion

**Symptom:** Query timeout or "infinite recursion detected" error

**Cause:** Circular RLS policy dependencies (e.g., `unit` SELECT checks `lease`, `lease` SELECT checks `unit`)

**Solution:** Use `SECURITY DEFINER` helper functions

```sql
-- BAD: Causes recursion
CREATE POLICY "unit_select" ON unit
USING (
  id IN (SELECT "unitId" FROM lease WHERE ...)  -- Checks lease policies
);

CREATE POLICY "lease_select" ON lease
USING (
  "unitId" IN (SELECT id FROM unit WHERE ...)  -- Checks unit policies
);

-- GOOD: Breaks recursion
CREATE POLICY "unit_select" ON unit
USING (
  user_owns_property("propertyId")  -- SECURITY DEFINER bypasses RLS
);
```

### Issue 2: Policy Doesn't Apply

**Symptom:** Query returns empty result even for owned data

**Cause:** Mismatch between `auth.uid()` and `users.id`

**Solution:** Always use lookup pattern

```sql
-- BAD: Won't match if ownerId is users.id
USING ("ownerId" = auth.uid()::text)

-- GOOD: Resolves auth.uid() to users.id
USING (
  "ownerId" IN (
    SELECT id FROM users WHERE "supabaseId" = auth.uid()::text
  )
)
```

### Issue 3: Service Role Blocked by RLS

**Symptom:** Backend operations fail even with service role key

**Cause:** Using user-scoped client instead of admin client

**Solution:** Use correct client type

```typescript
// BAD: RLS applies even to service role
const userClient = this.supabase.getUserClient(token)
await userClient.from('rent_payment').insert(...)  // Blocked by RLS

// GOOD: Admin client bypasses RLS
const adminClient = this.supabase.getClient()  // Uses SUPABASE_SECRET_KEY
await adminClient.from('rent_payment').insert(...)  // Success
```

### Issue 4: Performance Degradation

**Symptom:** Slow queries after enabling RLS

**Cause:** `auth.uid()` called for every row, no indexes on foreign keys

**Solution:**
1. Use `(SELECT auth.uid())` pattern for single evaluation
2. Add indexes on foreign key columns used in RLS

```sql
-- Add indexes for RLS performance
CREATE INDEX idx_property_owner_id ON property("ownerId");
CREATE INDEX idx_unit_property_id ON unit("propertyId");
CREATE INDEX idx_lease_tenant_id ON lease("tenantId");
CREATE INDEX idx_rent_payment_tenant_id ON rent_payment("tenantId");
CREATE INDEX idx_rent_payment_landlord_id ON rent_payment("landlordId");
```

## Adding New RLS Policies

### Checklist

When adding a new table or modifying policies:

- [ ] Enable RLS: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
- [ ] Create SELECT policy (who can read?)
- [ ] Create INSERT policy (who can create?)
- [ ] Create UPDATE policy (who can modify?)
- [ ] Create DELETE policy (who can remove? Or prohibit deletion?)
- [ ] Use identity resolution pattern for all `userId`/`ownerId`/`tenantId` checks
- [ ] Add indexes on foreign keys used in policies
- [ ] Test with both owner and tenant users
- [ ] Document in this file
- [ ] Run `scripts/verify-rls-coverage.sql`

### Template

```sql
-- Migration: Add RLS Policies for {table_name}
-- Date: YYYY-MM-DD
-- Purpose: {describe security model}

ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;

-- SELECT: Who can view records?
CREATE POLICY "{table}_select"
ON {table_name} FOR SELECT TO authenticated
USING (
  {column_name} IN (
    SELECT id FROM users WHERE "supabaseId" = auth.uid()::text
  )
);

-- INSERT: Who can create records?
CREATE POLICY "{table}_insert"
ON {table_name} FOR INSERT TO authenticated
WITH CHECK (
  {column_name} IN (
    SELECT id FROM users WHERE "supabaseId" = auth.uid()::text
  )
);

-- UPDATE: Who can modify records?
CREATE POLICY "{table}_update"
ON {table_name} FOR UPDATE TO authenticated
USING (
  {column_name} IN (
    SELECT id FROM users WHERE "supabaseId" = auth.uid()::text
  )
)
WITH CHECK (
  {column_name} IN (
    SELECT id FROM users WHERE "supabaseId" = auth.uid()::text
  )
);

-- DELETE: Who can remove records? (or omit to prohibit deletion)
CREATE POLICY "{table}_delete"
ON {table_name} FOR DELETE TO authenticated
USING (
  {column_name} IN (
    SELECT id FROM users WHERE "supabaseId" = auth.uid()::text
  )
);

-- Verification
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = '{table_name}'
    AND policyname = '{table}_select'
  ) THEN
    RAISE EXCEPTION 'Policy not created';
  END IF;
END $$;
```

## References

- **Supabase RLS Documentation:** https://supabase.com/docs/guides/database/postgres/row-level-security
- **PostgreSQL RLS Policies:** https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- **Identity Mapping:** `docs/architecture/identity-mapping.md`
- **Helper Functions:** `supabase/migrations/20250111_fix_unit_lease_rls_infinite_recursion.sql`
- **Verification Script:** `scripts/verify-rls-coverage.sql`

---

**Last Updated:** 2025-02-15
**Status:** ✅ Production-Ready
**Next Review:** 2025-03-15
