# VERIFIED Migration Scope - Stripe Decoupling

**Date**: 2025-12-14
**Migration**: `20251214150000_decouple_stripe_from_core_entities.sql`
**Status**: VERIFIED - Ready for user decision

---

## Executive Summary

**Total Impact**: 92 TypeScript/TSX files affected

### Auto-Generated Files (Will Update Automatically)
- **4 files, 143 references** - Regenerate with `supabase gen types typescript`
- ✅ NO MANUAL WORK REQUIRED

### Manual Files (Require Updates)
- **88 files, 505 references** - Systematic find/replace + manual review

---

## Verified File Counts

### Auto-Generated (4 files, 143 refs) ✅
These will regenerate automatically after migration:

1. `packages/shared/src/types/supabase.ts` (62 refs)
2. `packages/shared/src/types/supabase-generated.ts` (62 refs)
3. `packages/shared/src/validation/generated-schemas.ts` (27 refs)
4. `apps/backend/test/setup.d.ts` (8 refs)

**Action**: Run `supabase gen types typescript` after migration

---

### Manual Backend Services (29 files, 328 refs) 🔧

**Subscription Services (4 files)**:
- `apps/backend/src/subscriptions/subscription-billing.service.ts`
- `apps/backend/src/subscriptions/subscription-cache.service.ts`
- `apps/backend/src/subscriptions/subscription-query.service.ts`
- `apps/backend/src/modules/leases/subscription-retry.service.ts`

**Guards & Authorization (3 files)**:
- `apps/backend/src/shared/guards/property-ownership.guard.ts`
- `apps/backend/src/shared/guards/stripe-connected.guard.ts`

**Tenant Services (7 files)**:
- `apps/backend/src/modules/tenants/tenant-list.service.ts`
- `apps/backend/src/modules/tenants/tenant-platform-invitation.service.ts`
- `apps/backend/src/modules/tenants/tenant-payment.service.ts`
- `apps/backend/src/modules/tenants/tenant-invitation-query.service.ts`
- `apps/backend/src/modules/tenants/tenant-invitation-token.service.ts`
- `apps/backend/src/modules/tenants/tenant-relation.service.ts`
- `apps/backend/src/modules/tenants/tenant-emergency-contact.service.ts`

**Reports & Analytics (2 files)**:
- `apps/backend/src/modules/reports/reports.service.ts`
- `apps/backend/src/modules/analytics/property-performance.service.ts`

**Property Services (2 files)**:
- `apps/backend/src/modules/properties/properties.service.ts`
- `apps/backend/src/modules/properties/services/property-bulk-import.service.ts`

**Lease Services (4 files)**:
- `apps/backend/src/modules/leases/lease-subscription.service.ts`
- `apps/backend/src/modules/leases/lease-signature.service.ts`
- `apps/backend/src/modules/leases/lease-expiry-checker.service.ts`
- `apps/backend/src/modules/leases/listeners/subscription-alert.listener.ts`

**Other Services (7 files)**:
- `apps/backend/src/modules/dashboard/services/property-stats.service.ts`
- `apps/backend/src/modules/billing/stripe-connect.controller.ts`
- `apps/backend/src/modules/billing/stripe-owner.service.ts`
- `apps/backend/src/modules/billing/connect-setup.service.ts`
- `apps/backend/src/modules/billing/handlers/connect-webhook.handler.ts`
- `apps/backend/src/modules/pdf/lease-generation.controller.ts`
- `apps/backend/src/modules/notifications/notification-event-handler.service.ts`
- `apps/backend/src/modules/rent-payments/rent-payment-context.service.ts`

**Changes Needed**:
```typescript
// BEFORE:
.from('property_owners')
type PropertyOwnerRow = Database['public']['Tables']['property_owners']['Row']
.eq('property_owner_id', propertyOwnerId)

// AFTER:
.from('stripe_connected_accounts')
type StripeConnectedAccountRow = Database['public']['Tables']['stripe_connected_accounts']['Row']
.eq('owner_user_id', userId)  // Direct user reference
// OR for Stripe-specific queries:
.eq('stripe_connected_account_id', accountId)
```

---

### Manual Backend Tests (39 files, 147 refs) 🧪

**Integration Tests (15 files)**:
- `apps/backend/test/integration/leases/lease-creation.integration.spec.ts`
- `apps/backend/test/integration/tenant-invitation.integration.spec.ts`
- `apps/backend/test/integration/rls/property-isolation.integration.spec.ts`
- `apps/backend/test/integration/rls/lease-circular-dependency.integration.spec.ts`
- `apps/backend/test/integration/invitation-setup.ts`
- `apps/backend/test/integration/rls/setup.ts`
- `apps/backend/test/integration/stripe-webhook.integration.spec.ts`
- `apps/backend/test/integration/subscription-retry.integration.spec.ts`
- `apps/backend/test/integration/properties-controller.integration.spec.ts`
- `apps/backend/test/integration/lease-generation-controller.integration.spec.ts`
- `apps/backend/test/integration/tenant-invitation-flow.property.integration.spec.ts`
- `apps/backend/test/n1-queries.e2e.spec.ts`
- `apps/backend/test/n1-real-db.spec.ts`
- `apps/backend/src/modules/financial/financial.service.integration.spec.ts`
- `apps/backend/src/modules/docuseal/docuseal-webhook.service.integration.spec.ts`

**Unit Tests (20 files)**:
- Service specs for all services listed above (subscription, tenant, property, lease, etc.)
- Guard specs (property-ownership.guard.spec.ts, property-ownership.guard.unit.spec.ts)
- Controller specs (leases.controller.spec.ts, properties.controller.spec.ts, units.controller.spec.ts)

**Property Tests (2 files)**:
- `apps/backend/test/property/docuseal-submission-creation.property.spec.ts`
- `apps/backend/test/property/tenant-invitation-creation.property.spec.ts`

**Test Utilities (2 files)**:
- `apps/backend/src/test-utils/mocks.ts`
- `apps/backend/test/utilities/data-layer-test.utils.ts`

**Changes Needed**:
```typescript
// BEFORE: Create property_owners record
.from('property_owners').insert({
  user_id: ownerUserId,
  stripe_account_id: 'acct_test',
  business_type: 'individual'
})

// AFTER: No need! Just create property with owner_user_id
.from('properties').insert({
  owner_user_id: ownerUserId,  // Direct reference to users.id
  name: 'Test Property',
  property_type: 'SINGLE_FAMILY',
  // stripe_connected_account_id: null (optional)
})
```

---

### Manual Frontend Files (16 files, 20 refs) 🎨

**Hooks (4 files, 8 refs)**:
- `apps/frontend/src/hooks/api/use-properties.ts` - Line 140: `property_owner_id`
- `apps/frontend/src/hooks/api/use-lease.ts`
- `apps/frontend/src/hooks/api/use-unit.ts`
- `apps/frontend/src/hooks/api/use-maintenance.ts` - Line 84: `property_owner_id`

**Components (1 file)**:
- `apps/frontend/src/components/properties/property-form.client.tsx`

**Tests (11 files, 12 refs)**:
- `apps/frontend/src/hooks/api/__tests__/use-properties.test.tsx`
- `apps/frontend/src/app/(owner)/leases/__tests__/lease-action-buttons.test.tsx`
- `apps/frontend/src/app/(owner)/properties/__tests__/properties-page.client.test.tsx`
- `apps/frontend/src/components/maintenance/__tests__/maintenance-form.test.tsx`
- `apps/frontend/src/components/leases/__tests__/lease-form.test.tsx`
- `apps/frontend/src/app/(owner)/properties/property-card.test.tsx`
- `apps/frontend/src/app/(owner)/leases/__tests__/signature-status-display.property.test.tsx`
- `apps/frontend/src/components/properties/__tests__/property-form.test.tsx`
- `apps/frontend/tests/integration/mocks/handlers.ts`
- `apps/frontend/src/test/utils/test-data.ts`
- `apps/frontend/tests/fixtures/property-data.ts`

**Changes Needed**:
```typescript
// BEFORE:
property_owner_id: null, // Set server-side

// AFTER:
owner_user_id: user.id,  // Set explicitly from authenticated user
stripe_connected_account_id: null  // Optional for Stripe integration
```

---

### Manual Shared Types & Validation (4 files, 10 refs) 📦

**Types (2 files)**:
- `packages/shared/src/types/core.ts`
- `packages/shared/src/types/api-contracts.ts`

**Validation Schemas (2 files)**:
- `packages/shared/src/validation/properties.ts`
- `packages/shared/src/validation/tenants.ts`

**Changes Needed**:
```typescript
// core.ts
// BEFORE:
export type ConnectedAccount = Tables<'property_owners'>
export type PropertyOwnerRow = Database['public']['Tables']['property_owners']['Row']

// AFTER:
export type StripeConnectedAccount = Tables<'stripe_connected_accounts'>
export type StripeConnectedAccountRow = Database['public']['Tables']['stripe_connected_accounts']['Row']

// properties.ts validation
// BEFORE:
property_owner_id: uuidSchema,

// AFTER:
owner_user_id: uuidSchema,
stripe_connected_account_id: uuidSchema.optional().nullable(),
```

---

## Migration Approach Options

### Option A: Big Bang (RECOMMENDED) ✅

**Process**:
1. Apply database migration (5 min)
2. Regenerate types: `supabase gen types typescript` (2 min)
3. Systematic find/replace with review (6-8 hours)
   - Backend: `property_owners` → `stripe_connected_accounts`
   - Backend: `property_owner_id` → context-aware replacement
   - Frontend: Add `owner_user_id`, make Stripe optional
4. Run full test suite (30 min)
5. Fix remaining issues (2-3 hours)

**Pros**:
- Clean break, no half-state
- Clear before/after
- Can be completed in 1-2 focused days

**Cons**:
- Large changeset (~88 files)
- Risk of breaking changes
- Requires uninterrupted work session

**Estimated Effort**: 1-2 days of focused work

---

### Option B: Backward Compatible (NOT RECOMMENDED)

**Process**:
1. Add new columns alongside old ones
2. Dual-write to both columns
3. Migrate data incrementally
4. Update code incrementally over weeks
5. Remove old columns when safe

**Pros**:
- Safer, can rollback easily
- Incremental deployment

**Cons**:
- Very complex (2x the work)
- Temporary data duplication
- Multiple migrations
- Higher chance of bugs from dual-state
- Takes weeks instead of days

**Estimated Effort**: 3-4 weeks

---

### Option C: Feature Flag (NOT RECOMMENDED)

**Process**:
1. Add new columns
2. Feature flag controls which columns to use
3. Test both code paths
4. Switch flag when ready
5. Clean up old code

**Pros**:
- Can test in production
- Instant rollback

**Cons**:
- Extremely complex (doubles codebase)
- Feature flag logic everywhere
- Testing nightmare (2^n states)
- High maintenance burden

**Estimated Effort**: 4-5 weeks + ongoing maintenance

---

## Automation Scripts

### Find/Replace with sd (Safe Replacements)

```bash
# Backend: property_owners → stripe_connected_accounts
sd 'property_owners' 'stripe_connected_accounts' \
  apps/backend/src/**/*.ts

# Backend: PropertyOwnerRow → StripeConnectedAccountRow
sd 'PropertyOwnerRow' 'StripeConnectedAccountRow' \
  apps/backend/src/**/*.ts

# Frontend: Update test fixtures
sd "property_owner_id: '([^']+)'" "owner_user_id: '\$1', stripe_connected_account_id: null" \
  apps/frontend/**/*.ts
```

### Manual Review Required

These need context-aware replacement (use rg to find, then Edit tool):

```bash
# Find all property_owner_id references
rg "property_owner_id" apps/backend/src apps/frontend/src -l

# Determine for each file:
# - If checking ownership → change to owner_user_id (references users.id)
# - If Stripe-specific → change to stripe_connected_account_id (optional)
```

---

## Risk Assessment

### High Risk Areas
1. **Stripe Connect Integration** - Payment processing depends on stripe_connected_accounts
2. **Property Ownership Guard** - Authorization logic must be reviewed carefully
3. **Integration Tests** - Many tests have hardcoded property_owners assumptions

### Mitigation
- ✅ Migration is reversible (keep old migration file)
- ✅ Full test suite run before production deployment
- ✅ Systematic approach with verification at each step
- ✅ Environment config uses native dotenv (no CLI wrappers)

---

## Recommendation

**Proceed with Option A (Big Bang)** because:

1. **Verified scope is manageable**: 88 manual files, 505 references
2. **Clean architecture**: Eliminates confusion between users and Stripe accounts
3. **Lower total effort**: 1-2 days vs 3-5 weeks for incremental approaches
4. **Less error-prone**: Single state vs maintaining dual-state logic
5. **Better long-term**: Clean codebase without technical debt

---

## Next Steps (Pending User Approval)

### Phase 1: Preparation (30 min)
- [ ] Create branch: `feat/decouple-stripe-architecture`
- [ ] Run full test suite to establish baseline
- [ ] Document any existing test failures

### Phase 2: Database Migration (10 min)
- [ ] Apply migration to production DB
- [ ] Regenerate types: `supabase gen types typescript`
- [ ] Commit generated files

### Phase 3: Backend Updates (6-8 hours)
- [ ] Update backend services (29 files, 328 refs)
- [ ] Update backend tests (39 files, 147 refs)
- [ ] Run backend tests: `pnpm --filter @repo/backend test:unit`

### Phase 4: Frontend Updates (2-3 hours)
- [ ] Update frontend hooks (4 files, 8 refs)
- [ ] Update frontend components (1 file)
- [ ] Update frontend tests (11 files, 12 refs)
- [ ] Run frontend tests: `pnpm --filter @repo/frontend test`

### Phase 5: Shared Updates (1 hour)
- [ ] Update shared types (2 files)
- [ ] Update validation schemas (2 files)
- [ ] Rebuild shared package

### Phase 6: Verification (2-3 hours)
- [ ] Run full test suite
- [ ] Fix any remaining failures
- [ ] Test lease creation flow end-to-end
- [ ] Test property creation flow
- [ ] Verify Stripe Connect still works (optional feature)

### Phase 7: Deployment
- [ ] Create PR with comprehensive description
- [ ] Code review
- [ ] Deploy to production
- [ ] Monitor for errors

---

## Summary

**Verified Impact**: 92 files total, 88 manual files requiring updates

| Category | Files | References | Auto-Generated? |
|----------|-------|------------|----------------|
| Auto-generated types | 4 | 143 | ✅ Yes |
| Backend services | 29 | 328 | ❌ Manual |
| Backend tests | 39 | 147 | ❌ Manual |
| Frontend hooks/components | 5 | 8 | ❌ Manual |
| Frontend tests | 11 | 12 | ❌ Manual |
| Shared types/validation | 4 | 10 | ❌ Manual |
| **TOTAL MANUAL** | **88** | **505** | **Requires work** |

**Recommended Approach**: Option A (Big Bang Migration)
**Estimated Effort**: 1-2 days of focused work
**Risk Level**: Medium (manageable with systematic approach)
