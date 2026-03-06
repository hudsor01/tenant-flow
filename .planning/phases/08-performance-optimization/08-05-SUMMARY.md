---
phase: 08-performance-optimization
plan: 05
subsystem: api
tags: [tanstack-query, supabase, tenant-portal, query-dedup, promise-all]

# Dependency graph
requires:
  - phase: 08-performance-optimization
    provides: Query key factories, global query defaults
provides:
  - Shared tenantIdQuery queryOptions for tenant portal
  - resolveTenantId() utility for deduplicating tenant ID resolution
  - Parallelized amountDue query (connected_account + rent_due via Promise.all)
affects: [tenant-portal, performance-optimization]

# Tech tracking
tech-stack:
  added: []
  patterns: [shared-query-resolution, promise-all-parallelization, tenant-id-caching]

key-files:
  created: []
  modified:
    - src/hooks/api/use-tenant-portal-keys.ts
    - src/hooks/api/use-tenant-payments.ts
    - src/hooks/api/use-tenant-lease.ts
    - src/hooks/api/use-tenant-maintenance.ts
    - src/hooks/api/use-tenant-autopay.ts
    - src/hooks/api/query-keys/maintenance-keys.ts

key-decisions:
  - "tenantIdQuery uses 10-min staleTime (tenant ID is immutable within session)"
  - "resolveTenantId() as standalone function for use in queryFns (not hook-level)"
  - "amountDue parallelizes connected_account + rent_due after lease fetch"

patterns-established:
  - "Shared tenant ID resolution: all tenant portal hooks import resolveTenantId() from use-tenant-portal-keys.ts"
  - "Promise.all for independent sub-queries within a single queryFn"

requirements-completed: [PERF-01, PERF-02]

# Metrics
duration: 17min
completed: 2026-03-06
---

# Phase 8 Plan 5: Tenant Portal Waterfall Elimination Summary

**Shared tenant ID resolution with 10-min cache and amountDue query parallelization via Promise.all**

## Performance

- **Duration:** 17 min
- **Started:** 2026-03-06T17:56:52Z
- **Completed:** 2026-03-06T18:14:06Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Eliminated 8x redundant tenant ID resolution across 4 tenant portal hooks + maintenance-keys
- Parallelized connected_account + rent_due queries in amountDue (reduces 5-step waterfall to 3 rounds)
- Shared tenantIdQuery with 10-min staleTime ensures tenant ID resolved once per session window

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared tenantIdQuery and refactor amountDue waterfall** - `e50d1865f` (feat)
2. **Task 2: Refactor remaining tenant hooks to use shared tenant ID resolution** - `c177737df` (feat)

## Files Created/Modified
- `src/hooks/api/use-tenant-portal-keys.ts` - Added tenantIdQuery queryOptions and resolveTenantId() utility
- `src/hooks/api/use-tenant-payments.ts` - Refactored amountDue with Promise.all, payments with resolveTenantId()
- `src/hooks/api/use-tenant-lease.ts` - 3 queryFns (dashboard, lease, documents) use resolveTenantId()
- `src/hooks/api/use-tenant-maintenance.ts` - Query and mutation use resolveTenantId()
- `src/hooks/api/use-tenant-autopay.ts` - Autopay query uses resolveTenantId()
- `src/hooks/api/query-keys/maintenance-keys.ts` - tenantPortal query uses resolveTenantId()

## Decisions Made
- tenantIdQuery uses 10-min staleTime and 30-min gcTime (tenant ID is immutable within a user session)
- resolveTenantId() is a standalone async function, not a hook -- designed for use inside queryFns where hook-level patterns do not apply
- amountDue parallelizes connected_account + rent_due after fetching the lease, reducing round-trips from 5 sequential to 3 rounds (user -> tenantId-from-cache -> lease -> parallel[connected_account, rent_due] -> payment check)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed pre-existing typecheck errors in use-blogs.ts, lease-keys.ts, use-notifications.ts**
- **Found during:** Task 1 (pre-commit hook blocked commit)
- **Issue:** Prior plan executions (08-01 through 08-04) changed select('*') to specific columns but did not update return types, causing TS2322/TS2352 errors
- **Fix:** Defined BlogListItem/BlogDetail Pick types, LeaseListItem Pick type, NotificationListItem Pick type to match selected columns. Reverted lease detail query to select('*') for join columns.
- **Files modified:** src/hooks/api/use-blogs.ts, src/hooks/api/query-keys/lease-keys.ts, src/hooks/api/use-notifications.ts
- **Verification:** pnpm typecheck passes clean
- **Committed in:** Not staged (pre-existing files, not part of this plan's commit scope)

---

**Total deviations:** 1 auto-fixed (1 blocking -- pre-existing type errors)
**Impact on plan:** Type error fix was necessary to unblock commits. No scope creep.

## Issues Encountered
- Pre-existing uncommitted changes from plans 08-01 through 08-04 caused typecheck failures in the pre-commit hook. Fixed type definitions to match the column selections those plans introduced.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Tenant portal waterfall eliminated, ready for remaining performance optimization plans
- All tenant portal hooks share a single tenant ID resolution path

---
*Phase: 08-performance-optimization*
*Completed: 2026-03-06*
