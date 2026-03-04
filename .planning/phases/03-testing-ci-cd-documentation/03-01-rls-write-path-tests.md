# Plan 63-01: RLS Write-Path Isolation Tests

## Goal

Add INSERT, UPDATE, and DELETE write-path isolation tests to all 7 existing RLS test files. Verify that cross-tenant write attempts fail with RLS violations.

## Current State

- 7 RLS test files exist in `apps/integration-tests/src/rls/` covering SELECT isolation only
- Each file has 3 tests: owner A reads own data, owner B reads own data, no overlap
- Test infrastructure works: `createTestClient()`, `getTestCredentials()`, two test owners

## Changes

### For each of the 7 domains, add these test groups:

**INSERT tests:**
1. Owner A can insert into their own domain (with their own owner_user_id)
2. Owner B cannot insert with owner A's owner_user_id (RLS blocks)
3. Clean up: delete inserted test rows after each test

**UPDATE tests:**
1. Owner A can update their own rows
2. Owner B cannot update owner A's rows (RLS blocks — returns 0 affected rows)

**DELETE tests:**
1. Owner A can delete their own rows (soft-delete where applicable)
2. Owner B cannot delete owner A's rows (RLS blocks — returns 0 affected rows)

### Domain-specific considerations:

- **properties**: INSERT needs name, address fields, property_type. Has soft-delete (status: inactive)
- **units**: INSERT needs property_id (owner A's property), rent_amount. FK to properties
- **vendors**: INSERT needs name, trade. Simple — no FK beyond owner_user_id
- **tenants**: Has user_id (not owner_user_id). RLS is via lease join chain. INSERT/UPDATE/DELETE tests must use the tenant's own user_id. Cross-tenant tests verify owner B cannot modify owner A's tenant records
- **leases**: INSERT needs unit_id, primary_tenant_id, dates, amounts. FK heavy
- **maintenance_requests**: INSERT needs unit_id, tenant_id, description. FK heavy
- **inspections**: INSERT needs lease_id, property_id. FK heavy

### Test pattern for cross-tenant write:

```typescript
it('owner B cannot insert a property with owner A credentials', async () => {
  const { error } = await clientB
    .from('properties')
    .insert({ owner_user_id: ownerAId, name: 'Hijack', ... })
  // RLS should block: either error or the insert silently fails
  // PostgREST returns 0 rows for blocked inserts (WITH CHECK violation)
  expect(error).not.toBeNull()
})
```

## Files Modified

- `apps/integration-tests/src/rls/properties.rls.test.ts`
- `apps/integration-tests/src/rls/units.rls.test.ts`
- `apps/integration-tests/src/rls/vendors.rls.test.ts`
- `apps/integration-tests/src/rls/tenants.rls.test.ts`
- `apps/integration-tests/src/rls/leases.rls.test.ts`
- `apps/integration-tests/src/rls/maintenance.rls.test.ts`
- `apps/integration-tests/src/rls/inspections.rls.test.ts`

## Verification

- `pnpm --filter @repo/integration-tests test:rls` passes
- Each domain has INSERT, UPDATE, DELETE tests
- Cross-tenant write attempts fail with RLS violations
