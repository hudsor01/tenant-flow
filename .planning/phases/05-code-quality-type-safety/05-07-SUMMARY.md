---
phase: 05-code-quality-type-safety
plan: 07
subsystem: ui
tags: [tanstack-query, query-keys, cache-invalidation, react]

requires:
  - phase: 05-code-quality-type-safety
    provides: query-key factories in src/hooks/api/query-keys/
provides:
  - Zero string literal query keys across all production src/ files
  - Dashboard invalidation on tenant/property delete mutations
  - Single-source revenue trends RPC via fetchRevenueTrends
affects: [cache-behavior, dashboard-updates, analytics]

tech-stack:
  added: []
  patterns: [fetchRevenueTrends shared RPC function, blogKeys factory, profileKeys.company, authKeys.signoutCheck]

key-files:
  created: []
  modified:
    - src/hooks/api/query-keys/analytics-keys.ts
    - src/hooks/api/query-keys/report-keys.ts
    - src/hooks/api/query-keys/financial-keys.ts
    - src/hooks/api/use-auth.ts
    - src/hooks/api/use-profile.ts
    - src/hooks/api/use-blogs.ts
    - src/hooks/api/use-lease.ts
    - src/hooks/api/query-keys/maintenance-keys.ts
    - src/app/(owner)/tenants/page.tsx
    - src/app/(owner)/properties/page.tsx
    - src/app/(owner)/settings/components/billing-settings.tsx
    - src/app/auth/signout/page.tsx
    - src/components/leases/lease-form.tsx
    - src/components/leases/wizard/selection-step.tsx
    - src/components/leases/wizard/lease-creation-wizard.tsx
    - src/components/maintenance/detail/maintenance-details.client.tsx
    - src/components/settings/billing-settings.tsx
    - src/components/settings/general-settings.tsx
    - src/providers/auth-provider.tsx

key-decisions:
  - "fetchRevenueTrends extracted as standalone function (not queryOptions spread) to avoid TanStack Query generic type conflicts"
  - "general-settings.tsx refactored to use useProfile() hook instead of inline user-profile query"
  - "blogKeys factory created inline in use-blogs.ts (no separate query-keys file needed for simple public queries)"
  - "Additional string literal query keys beyond plan scope fixed (6 extra files) to meet zero-tolerance truth"

patterns-established:
  - "fetchRevenueTrends: shared RPC function for cross-domain revenue data consumption"
  - "profileKeys.company: extension pattern for domain-specific profile sub-queries"

requirements-completed: [CODE-03, CODE-04, CODE-17]

duration: 9min
completed: 2026-03-05
---

# Phase 5 Plan 07: Query Key Factory Migration & Dashboard Invalidation Summary

**Zero string literal query keys across 19 files, dashboard invalidation on entity deletes, and single-source revenue trends RPC via fetchRevenueTrends**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-05T20:32:59Z
- **Completed:** 2026-03-05T20:42:00Z
- **Tasks:** 2
- **Files modified:** 19

## Accomplishments
- Replaced 20+ string literal query keys across 19 files with factory references
- Added ownerDashboardKeys.all invalidation to tenant and property delete mutations
- Extracted fetchRevenueTrends() as shared RPC function, eliminating direct get_revenue_trends_optimized calls from report-keys.ts and financial-keys.ts
- Extended authKeys (signoutCheck), profileKeys (company), created blogKeys factory

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace string literal query keys and add dashboard invalidation** - `a780de041` (feat)
2. **Task 2: Wire report-keys.ts and financial-keys.ts to shared fetchRevenueTrends** - `84a09f79a` (refactor)

## Files Created/Modified
- `src/hooks/api/query-keys/analytics-keys.ts` - Added fetchRevenueTrends shared function
- `src/hooks/api/query-keys/report-keys.ts` - Uses fetchRevenueTrends instead of direct RPC
- `src/hooks/api/query-keys/financial-keys.ts` - Uses fetchRevenueTrends instead of direct RPC
- `src/hooks/api/use-auth.ts` - Added signoutCheck key, fixed invalidateAuth to use authKeys.all
- `src/hooks/api/use-profile.ts` - Added company() key
- `src/hooks/api/use-blogs.ts` - Created blogKeys factory for all blog queries
- `src/hooks/api/use-lease.ts` - Signed document query uses leaseQueries.all() base
- `src/hooks/api/query-keys/maintenance-keys.ts` - tenant-portal key uses maintenanceQueries.all() base
- `src/app/(owner)/tenants/page.tsx` - Factory key + dashboard invalidation on delete
- `src/app/(owner)/properties/page.tsx` - Factory key + dashboard invalidation on delete
- `src/components/settings/general-settings.tsx` - Uses useProfile() hook + profileKeys
- `src/components/settings/billing-settings.tsx` - Uses paymentMethodsKeys.all
- `src/app/(owner)/settings/components/billing-settings.tsx` - Uses paymentMethodsKeys.all
- `src/components/leases/lease-form.tsx` - Uses factory keys for invalidation
- `src/components/leases/wizard/selection-step.tsx` - Uses factory key bases with suffixes
- `src/components/leases/wizard/lease-creation-wizard.tsx` - Uses factory key bases with suffixes
- `src/components/maintenance/detail/maintenance-details.client.tsx` - Uses maintenanceQueries.all() base
- `src/app/auth/signout/page.tsx` - Uses authKeys.signoutCheck
- `src/providers/auth-provider.tsx` - Uses authKeys.all for removeQueries

## Decisions Made
- fetchRevenueTrends extracted as standalone async function rather than queryOptions spread pattern, because TanStack Query's queryOptions() returns strongly-typed objects where queryKey is part of the generic, making spread + override incompatible
- general-settings.tsx refactored to use the shared useProfile() hook, eliminating a duplicate user-profile query with a different cache key
- blogKeys factory created inline in use-blogs.ts rather than a separate query-keys file, since blogs are simple public queries with no cross-domain sharing needs

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Fixed 6 additional string literal query keys not listed in plan**
- **Found during:** Task 1 (verification grep)
- **Issue:** Plan listed 11 files but grep found 6 more files with string literal query keys: billing-settings (settings/components), maintenance-details, use-blogs (4 keys), use-lease, maintenance-keys tenant-portal
- **Fix:** Created blogKeys factory, used paymentMethodsKeys/maintenanceQueries/leaseQueries factories for remaining files
- **Files modified:** use-blogs.ts, billing-settings.tsx (settings/components), maintenance-details.client.tsx, use-lease.ts, maintenance-keys.ts
- **Verification:** grep confirms zero string literal query keys across all src/ production code
- **Committed in:** a780de041 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed no-user guard in report-keys monthlyRevenue**
- **Found during:** Task 2 (unit test failure)
- **Issue:** fetchRevenueTrends throws 'Not authenticated' when no user, but monthlyRevenue previously returned [] for unauthenticated users
- **Fix:** Added getCachedUser() guard returning [] before calling fetchRevenueTrends in both report-keys and financial-keys
- **Files modified:** report-keys.ts, financial-keys.ts
- **Verification:** use-reports.test.tsx "returns empty array when no user" passes
- **Committed in:** 84a09f79a (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 bug)
**Impact on plan:** Both necessary for correctness. The extra files ensure the zero-tolerance rule is fully met.

## Issues Encountered
- TanStack Query's queryOptions() generic type system prevents spreading one queryOptions result and overriding queryKey/select -- the types are coupled. Solved by extracting fetchRevenueTrends as a plain async function instead.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All CODE-03, CODE-04, CODE-17 gaps closed
- Query key consistency enforced across entire codebase
- Dashboard invalidation ensures accurate counts after entity deletion

---
*Phase: 05-code-quality-type-safety*
*Completed: 2026-03-05*
