# TenantFlow Master Implementation Plan
**Branch**: `fix/lease-issues-20251212`
**Last Updated**: 2025-12-13
**Purpose**: Single source of truth for all implementation tasks before merging to main

---

## Executive Summary

This plan consolidates all pending work across multiple plan files into ONE actionable todo list. As tasks are completed, they will be marked with ✅ or removed to keep this document current.

**Current Status**:
- ✅ Node 24 migration complete
- ✅ RLS circular dependency fixed with SECURITY DEFINER functions
- ✅ RLS tests skipped until proper Supabase Auth configuration
- 🔄 Tenant filtering by property (in progress)
- ❌ N+1 query patterns identified (needs fix)
- ❌ Late-fee API endpoints missing REST decorators
- ❌ Notifications not wired end-to-end

---

## 🔴 CRITICAL - Must Complete Before Merge

### 1. Tenant Filtering by Property (BLOCKING)
**Status**: Implementation started, unstaged changes exist
**Time**: 2 hours remaining
**Depends On**: Nothing
**Files**:
- `apps/backend/src/modules/tenants/tenants.controller.ts` - Add `property_id` query param
- `apps/backend/src/modules/tenants/tenant-query.service.ts` - Implement `findByProperty()`
- `apps/backend/src/modules/tenants/tenant-list.service.ts` - Optimized nested query (done)
- `apps/frontend/src/components/leases/wizard/selection-step.tsx` - Filter tenants by property
- `apps/backend/src/modules/leases/leases.service.ts` - Add validation (tenant invited to property)
- `supabase/migrations/20251214011115_tenant_invitation_property_index.sql` - Performance index

**Tasks**:
- [ ] Complete backend controller changes (property_id param)
- [ ] Complete frontend wizard changes (pass property_id in query)
- [ ] Add lease creation validation (verify tenant invitation)
- [ ] Create and apply database migration for index
- [ ] Test: Lease wizard shows only invited tenants
- [ ] Test: Backend rejects uninvited tenant assignment

---

### 2. Fix N+1 Query Patterns (HIGH PRIORITY)
**Status**: ✅ COMPLETE
**Time**: 4 hours
**Depends On**: Nothing

#### 2.1 Frontend Tenant Bulk Operations
**Issue**: Multiple DELETE/UPDATE calls in loops
**Impact**: HIGH for bulk operations

- [x] **Create bulk update endpoint** `POST /api/v1/tenants/bulk-update`
  - File: `apps/backend/src/modules/tenants/tenants.controller.ts`
  - Accept array of `{ id, data }` objects
  - Use Promise.allSettled for parallel processing with success/failed tracking

- [x] **Create bulk delete endpoint** `DELETE /api/v1/tenants/bulk-delete`
  - File: `apps/backend/src/modules/tenants/tenants.controller.ts`
  - Accept array of IDs: `{ ids: string[] }`
  - Validate all IDs before deleting (RLS enforcement)

- [x] **Update frontend hooks** `apps/frontend/src/hooks/api/use-tenant.ts`
  - Replaced `.map(async id => apiRequest(DELETE))` with single bulk call
  - Replaced `.map(async ({id, data}) => apiRequest(PUT))` with single bulk call
  - Added success/failure toast notifications

#### 2.2 Verify No Sequential Queries in Services
**Status**: Review needed (LOW PRIORITY - move to future optimization)

- [ ] Audit `apps/backend/src/modules/financial/financial.service.ts` for sequential queries
- [ ] Verify `Promise.all` usage in subscription services (already good)
- [ ] Check lease signature service for sequential RPC calls

---

### 3. Stashed Work Recovery
**Status**: Work exists in stash + working directory
**Time**: 30 minutes
**Depends On**: Task 1 (Tenant Filtering)

- [ ] Review unstaged changes in working directory
  - `apps/backend/src/modules/leases/leases.service.ts`
  - `apps/frontend/src/components/leases/wizard/lease-creation-wizard.tsx`
  - `apps/frontend/src/components/leases/wizard/selection-step.tsx`

- [ ] Verify stash@{0} contents align with Task 1 (tenant filtering)
- [ ] Resolve any conflicts between stashed and current work
- [ ] Drop stash after verification
- [ ] Commit all tenant filtering changes together

---

## 🟠 HIGH PRIORITY - Complete Before PR Review

### 4. Late-Fee API Exposure (Backend ↔ Frontend Parity)
**Status**: Backend methods exist, no REST decorators
**Time**: 2 hours
**Depends On**: Nothing

**Issue**: Frontend calls late-fee endpoints that return 404 in production.

- [ ] Add REST decorators to `apps/backend/src/modules/late-fees/late-fees.controller.ts`:
  - `@Get('lease/:lease_id/config')` → `getConfig()`
  - `@Put('lease/:lease_id/config')` → `updateConfig()`
  - `@Get('lease/:lease_id/overdue')` → `getOverduePayments()`
  - `@Post('lease/:lease_id/process')` → `processLateFees()`
  - `@Post('payment/:paymentId/apply')` → `applyLateFee()`

- [ ] Add e2e tests for newly exposed routes
- [ ] Verify frontend hooks work: `apps/frontend/src/hooks/api/use-late-fees.ts`
- [ ] Test lease detail page late-fee display
- [ ] Test tenant payment page late-fee banner

---

### 5. Notifications End-to-End (Owner + Tenant)
**Status**: Backend complete, frontend not wired
**Time**: 4 hours
**Depends On**: Nothing

#### 5.1 Frontend TanStack Query Hooks
- [ ] Create `apps/frontend/src/hooks/api/use-notifications.ts`
  - `useNotifications()` - GET `/api/v1/notifications` with pagination
  - `useMarkNotificationRead()` - PATCH `/api/v1/notifications/:id/read`
  - `useDeleteNotification()` - DELETE `/api/v1/notifications/:id`
  - `useCreateMaintenanceNotification()` - POST `/api/v1/notifications/maintenance`

#### 5.2 Owner Dashboard Notifications
- [ ] Replace static toggles in owner dashboard with real API calls
- [ ] Add notification feed with badge count
- [ ] Implement "mark all read" action
- [ ] Link to maintenance items via `action_url`

#### 5.3 Tenant Notifications Center
- [ ] Create `/tenant/settings/notifications` page
- [ ] List notifications with filter by unread
- [ ] Mark read/delete actions
- [ ] Show maintenance updates with links

#### 5.4 Backend Pagination
- [ ] Add default pagination to `apps/backend/src/modules/notifications/notifications.controller.ts`
- [ ] Return `{ data, total, page, limit }` for frontend pagination
- [ ] Limit 20 per page default

---

### 6. Tenant Settings Data Binding
**Status**: Backend endpoint exists, frontend doesn't use it
**Time**: 2 hours
**Depends On**: Nothing

- [ ] Update `apps/frontend/src/app/(tenant)/tenant/settings/page.tsx`
- [ ] Fetch `/api/v1/tenants/settings` on page load
- [ ] Hydrate profile fields (name, email, phone)
- [ ] Show loading skeleton while fetching
- [ ] Add PUT endpoint `/api/v1/tenants/settings` in backend (optional)
- [ ] OR reuse `/users/profile` update (choose simpler approach)

---

### 7. Surface Owner Billing Health
**Status**: Backend endpoints exist, frontend never calls
**Time**: 2 hours
**Depends On**: Nothing

- [ ] Create React Query hooks:
  - `useAvailableInsights()` - GET `/api/v1/owner/financial/billing/insights/available`
  - `useBillingHealth()` - GET `/api/v1/owner/financial/billing/health`

- [ ] Add banner/card to owner financial dashboard showing:
  - Stripe Sync status
  - Missing setup steps (if any)
  - Hide analytics cards if `available: false`

- [ ] Add monitoring check in frontend to log when health unavailable

---

## 🟡 MEDIUM PRIORITY - Post-Merge Improvements

### 8. Standardize Error Handling
**Time**: 3 hours
**Files**: `properties.service.ts`, `units.service.ts`, `tenants.service.ts`, `leases.service.ts`

**Issue**: Mix of `return null` vs `throw NotFoundException()`

- [ ] Audit all `findOne()` methods in services
- [ ] Replace `return null` with `throw new NotFoundException()`
- [ ] Ensure consistent error messages
- [ ] Update tests to expect exceptions

**Pattern**:
```typescript
async findOne(id: string) {
  const { data, error } = await client.from('table').select().eq('id', id).single()
  if (error || !data) throw new NotFoundException(`Resource ${id} not found`)
  return data
}
```

---

### 9. Add Request Correlation IDs to Logs
**Time**: 2 hours
**Files**: All backend services

- [ ] Inject `ClsService` into all services
- [ ] Add `requestId` and `userId` to all log statements
- [ ] Pattern:
  ```typescript
  this.logger.log('Creating property', {
    requestId: this.cls.get('requestId'),
    userId: this.cls.get('userId'),
    dto
  })
  ```

---

### 10. Endpoint-Specific Rate Limiting
**Time**: 2 hours
**Files**: `auth.controller.ts`, `rent-payments.controller.ts`, `tenants.controller.ts`

- [ ] Add `@Throttle()` decorators to sensitive endpoints
- [ ] Login: 5 requests/minute
- [ ] Password reset: 3 requests/hour
- [ ] Payment processing: 10 requests/minute
- [ ] Test rate limit enforcement

---

### 11. Dialog/Modal System Consolidation
**Time**: 4 hours
**Files**: `crud-dialog.tsx`, `crud-modal.tsx`

- [ ] Merge into single `CrudDialog` component
- [ ] Support variants: AlertDialog, ConfirmDialog, CrudDialog, Drawer, Sheet
- [ ] Migrate all usage to new component
- [ ] Delete old files
- [ ] Update Storybook

---

### 12. Dashboard Section Standardization
**Time**: 3 hours
**Files**: `activity-section.tsx`, `performance-section.tsx`, `quick-actions-section.tsx`

- [ ] Create `DashboardSection` base component
- [ ] Extract common layout patterns
- [ ] Support variants via props
- [ ] Migrate existing sections
- [ ] Remove duplicate code

---

## 🟢 LOW PRIORITY - Future Optimizations

### 13. Decompose Large Services
**Time**: 2 days per service

Services exceeding 150 lines should be broken into focused services:

- [ ] `NotificationsService` (1,393 lines → 8 services)
- [ ] `TenantQueryService` (1,067 lines → 4 services)
- [ ] `SubscriptionsService` (990 lines → 3 services)
- [ ] `MaintenanceService` (903 lines → 3 services)
- [ ] `LeasesService` (867 lines → 3 services)
- [ ] `LeaseSignatureService` (843 lines → 3 services)
- [ ] `StripeConnectService` (836 lines → 3 services)

---

### 14. Fix Optimistic Locking Race Conditions
**Time**: 3 days
**Status**: CRITICAL for multi-user scenarios

**Issue**: Check-then-act race condition allows concurrent updates to overwrite

- [ ] Create Supabase RPC functions for atomic updates
- [ ] Add `version` column to tables: properties, units, leases, maintenance
- [ ] Migration to add version tracking
- [ ] Update services to use atomic RPC instead of check-then-update
- [ ] Handle version conflicts with clear error messages

**Example RPC**:
```sql
CREATE OR REPLACE FUNCTION update_property_atomic(
  p_id uuid,
  p_expected_version int,
  p_data jsonb
) RETURNS properties AS $$
DECLARE v_row properties;
BEGIN
  UPDATE properties
  SET name = COALESCE(p_data->>'name', name),
      updated_at = now(),
      version = version + 1
  WHERE id = p_id AND version = p_expected_version
  RETURNING * INTO v_row;

  IF NOT FOUND THEN RAISE EXCEPTION 'version_conflict'; END IF;
  RETURN v_row;
END;
$$ LANGUAGE plpgsql;
```

---

### 15. Implement Webhook Idempotency
**Time**: 2 days
**Status**: CRITICAL for production reliability

**Issue**: Duplicate processing on webhook retries

- [ ] Create `webhook_events` table with unique constraint on `stripe_event_id`
- [ ] Migration file
- [ ] Update `stripe-webhook.controller.ts` to check existing events
- [ ] Update `docuseal-webhook.controller.ts`
- [ ] Update `stripe-sync.controller.ts`
- [ ] Add tests for duplicate webhook handling

---

### 16. Add Transaction Management via RPC
**Time**: 3 days
**Files**: `leases.service.ts`, `tenants.service.ts`, `maintenance.service.ts`

**Issue**: Multi-step operations without atomicity

- [ ] Create RPC function `create_lease_transaction()`
- [ ] Create RPC function `create_tenant_with_stripe()`
- [ ] Create RPC function `update_maintenance_status_atomic()`
- [ ] Update services to use RPC instead of sequential calls
- [ ] Test rollback scenarios

---

### 17. Fix Cache Invalidation Race Conditions
**Time**: 2 days
**Files**: `properties.service.ts`, `leases.service.ts`, `tenants.service.ts`

**Issue**: Cache stampede during invalidation

- [ ] Implement cache versioning instead of deletion
- [ ] Add `cache_version` to cached responses
- [ ] Update cache set/get logic
- [ ] Test concurrent invalidations

---

### 18. Add Health Check Indicators
**Time**: 1 day

- [ ] Install `@nestjs/terminus`
- [ ] Create health indicators for:
  - Database ping
  - Stripe API ping
  - Supabase Storage ping
  - Redis ping (if applicable)
- [ ] Add `/health` endpoint
- [ ] Wire to monitoring/alerting

---

### 19. Add Swagger/OpenAPI Documentation
**Time**: 3 days

- [ ] Install `@nestjs/swagger`
- [ ] Add decorators to all 45 controllers
- [ ] Configure Swagger UI in `main.ts`
- [ ] Generate OpenAPI spec
- [ ] Publish docs to `/api/docs`

---

### 20. Standardize Naming Conventions
**Time**: 4 hours

- [ ] Audit service methods
- [ ] Standardize to: `find*()`, `create()`, `update()`, `remove()`
- [ ] Update all references
- [ ] Update tests

---

## 📋 Documentation Updates

### 21. Update API Documentation
- [ ] `docs/tenant-portal-api.md` - Verify all routes match reality
- [ ] `docs/backend-frontend-parity-plan.md` - Mark completed items
- [ ] Create `docs/api/tenants.md` with new `property_id` param
- [ ] Update lease creation workflow guide

---

### 22. Consolidate This Plan
**Status**: ✅ COMPLETE

- [x] Deleted redundant plan files:
  - `docs/backend-frontend-parity-plan.md` (consolidated here)
  - `.claude/plans/consolidated_refactoring_plan_by_time.md` (consolidated here)
  - `.claude/plans/crispy-bubbling-kitten-agent-a0e8adc.md` (consolidated here)
  - `.claude/plans/node-24-migration-plan.md` (consolidated here)
  - `MIGRATION.md` (Node 24 content consolidated here)

- [x] Kept essential documentation:
  - `MASTER_PLAN.md` (this file - single source of truth for all tasks)
  - `docs/tenant-portal-api.md` (API route reference - keep updated)

---

## 🎯 Definition of Done (Branch Ready to Merge)

### Must Complete:
- [x] Node 24 migration complete
- [x] RLS circular dependency fixed
- [ ] Tenant filtering by property working end-to-end
- [ ] N+1 bulk operations implemented
- [ ] Late-fee API endpoints exposed
- [ ] All tests passing (backend + frontend)
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] All unstaged/stashed work committed or discarded

### Should Complete:
- [ ] Notifications wired end-to-end
- [ ] Tenant settings data binding
- [ ] Owner billing health surfacing

### Optional:
- [ ] Error handling standardization
- [ ] Request correlation IDs
- [ ] Rate limiting

---

## 📊 Progress Tracking

**Total Tasks**: 80+
**Completed**: 4 ✅ (Node 24, RLS fix, RLS tests, N+1 patterns)
**In Progress**: 1 🔄 (Tenant filtering)
**Blocked**: 0 ⛔

**Estimated Time to Merge**:
- Critical tasks: ~4 hours remaining (Tenant filtering: 2h, Stashed work: 30min)
- High priority: ~10 hours
- **Minimum to merge**: ~4 hours (critical only)

---

## 🔄 How to Use This Plan

1. **Start with CRITICAL section** - Must complete before merge
2. **Mark completed tasks** with ✅ or delete the line
3. **Update status** as you progress ("In Progress", "Blocked")
4. **Remove completed sections** to keep document concise
5. **Add new discoveries** to appropriate priority section
6. **Review daily** to stay on track

---

## 📝 Notes

- **RLS Performance**: Monitor query times after tenant filtering implementation
- **Cache Strategy**: All tenant queries cached 5 minutes
- **Error Messages**: Should guide users to next action (e.g., "Invite tenant to property")
- **Testing**: Every API change needs corresponding test update
- **Deployment**: Test in preview environment before production

---

**Last Review**: 2025-12-13
**Next Review**: After completing Critical section
**Branch Owner**: Ensure this file stays current as single source of truth
