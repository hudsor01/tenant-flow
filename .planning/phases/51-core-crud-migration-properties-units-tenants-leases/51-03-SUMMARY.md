---
phase: 51-core-crud-migration-properties-units-tenants-leases
plan: 03
subsystem: api
tags: [supabase, postgrest, react-query, tenants, typescript]

# Dependency graph
requires:
  - phase: 51-01
    provides: handlePostgrestError utility + properties domain migration pattern
  - phase: 51-02
    provides: units domain migration + NestJS modules deleted

provides:
  - Tenants domain fully migrated to PostgREST (query keys + mutations)
  - Invitation flow using tenant_invitations table via PostgREST
  - Resend/cancel invitation mutations retained on apiRequest with TODO(phase-55) comments
  - Test suite fixed to match PostgREST implementation (lease_tenants delete + invite flow)

affects: [52-operations-crud, 53-analytics-reports, 55-external-services]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Invitation flow creates tenant_invitations record via PostgREST; email deferred to Phase 55
    - Delete tenant = remove lease_tenants associations (soft approach, record preserved)
    - Notification preferences stored in notification_settings table (keyed by user_id)

key-files:
  created: []
  modified:
    - apps/frontend/src/hooks/api/query-keys/tenant-keys.ts
    - apps/frontend/src/hooks/api/use-tenant.ts
    - apps/frontend/src/hooks/api/__tests__/use-tenant.test.tsx

key-decisions:
  - "tenant-keys.ts was already fully migrated to PostgREST from prior work — no changes needed"
  - "use-tenant.ts was already fully migrated — only resend/cancel mutations retain apiRequest with TODO(phase-55)"
  - "useDeleteTenantMutation removes lease_tenants associations (not an update to tenants.status)"
  - "useInviteTenantMutation creates tenant_invitations record; email sending deferred to Phase 55"
  - "Test mock for leases table needed select() support for the invite flow; lease_tenants needed delete() support"

patterns-established:
  - "Tenant deletion = removing lease_tenants rows (preserves tenant record per 7-year retention)"
  - "Notification preferences: two-step query (tenants → user_id → notification_settings)"
  - "Invitation flow: tenant_invitations table insert with invitation_code + invitation_url generation"

requirements-completed:
  - CRUD-02

# Metrics
duration: 15min
completed: 2026-02-21
---

# Phase 51-03: Tenants Domain PostgREST Migration

**Tenants query keys and mutation hooks verified fully migrated to PostgREST; test suite fixed to match invitation and delete implementations**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-02-21
- **Completed:** 2026-02-21
- **Tasks:** 2 (verified + test fix)
- **Files modified:** 1 (test file)

## Accomplishments

- Confirmed both `tenant-keys.ts` and `use-tenant.ts` were already fully migrated to PostgREST (completed in prior session)
- Fixed 2 failing tests in `use-tenant.test.tsx` to match actual PostgREST implementation:
  1. `useDeleteTenantMutation` correctly calls `supabase.from('lease_tenants')` (removes associations, not `tenants.status` update)
  2. `useInviteTenantMutation` calls `supabase.from('leases').select()` then `supabase.from('tenant_invitations').insert()` — test mock updated to support both
- All 966 tests pass, 0 TypeScript errors

## Task Commits

Each task committed atomically:

1. **Task 1: Verify tenant-keys.ts PostgREST migration** — no file changes (already complete)
2. **Task 2: Fix use-tenant.ts test suite** — test mocks updated for lease_tenants delete and invitation flow

## Files Created/Modified

- `apps/frontend/src/hooks/api/__tests__/use-tenant.test.tsx` — Fixed test mocks for `useDeleteTenantMutation` (calls `lease_tenants`, not `tenants`) and `useInviteTenantMutation` (leases needs `.select()`, tenant_invitations needs `.insert()`)

## Decisions Made

- **No changes to tenant-keys.ts**: Already uses PostgREST with full join support (users, lease_tenants, leases, units, properties)
- **No changes to use-tenant.ts**: Already migrated. `useResendInvitationMutation` and `useCancelInvitationMutation` correctly retained on `apiRequest` with `TODO(phase-55)` comments
- **Test fix only**: The 2 failing tests had outdated mock setups that didn't match the already-migrated implementation

## Deviations from Plan

### Auto-fixed Issues

**1. Test mocks did not match existing PostgREST implementation**
- **Found during:** Task 2 verification (`pnpm --filter @repo/frontend test:unit -- --run`)
- **Issue:** `useDeleteTenantMutation` test expected `supabase.from('tenants')` but implementation calls `supabase.from('lease_tenants').delete()`. `useInviteTenantMutation` test had `leases` mock with only `update()` but implementation calls `.select().eq().single()` first.
- **Fix:** Updated test mocks: `lease_tenants` mock adds `delete()` chain; `leases` mock adds `select()` chain; `tenant_invitations` mock adds `insert().select().single()` chain; test description updated to match actual behavior
- **Files modified:** `apps/frontend/src/hooks/api/__tests__/use-tenant.test.tsx`
- **Verification:** All 966 tests pass, 0 failed
- **Committed in:** task 2 commit

---

**Total deviations:** 1 auto-fixed (test mocks diverged from already-migrated implementation)
**Impact on plan:** Minor — both source files were already complete. Only test corrections required.

## Issues Encountered

Both `tenant-keys.ts` and `use-tenant.ts` were already fully migrated to PostgREST before this plan executed (from prior session work). Plan verification confirmed the migration was correct per all must_have truths. Only 2 test failures existed due to stale mocks.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Tenant domain fully migrated: queries and mutations use PostgREST directly
- `useResendInvitationMutation` and `useCancelInvitationMutation` retained on NestJS with `TODO(phase-55)` markers
- Ready for Plan 51-04: Leases domain migration

---
*Phase: 51-core-crud-migration-properties-units-tenants-leases*
*Completed: 2026-02-21*
