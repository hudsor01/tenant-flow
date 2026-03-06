---
phase: 08-performance-optimization
plan: 01
subsystem: ui
tags: [tanstack-query, next.js, tailwind, performance, refetch]

# Dependency graph
requires:
  - phase: 05-code-quality
    provides: Query key factories and hook organization
provides:
  - Global refetchOnWindowFocus: true default (queries only refetch when stale)
  - Payment query exceptions with refetchOnWindowFocus: 'always'
  - optimizePackageImports for date-fns and @tanstack packages
  - Clean CSS source paths without stale monorepo references
affects: [08-performance-optimization]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Global query defaults in QueryProvider, overrides only for domain-specific needs"
    - "Payment queries use 'always' refetch (time-sensitive data exception)"

key-files:
  created: []
  modified:
    - src/providers/query-provider.tsx
    - next.config.ts
    - src/app/globals.css
    - src/hooks/api/use-owner-dashboard.ts
    - src/hooks/api/use-dashboard-hooks.ts
    - src/hooks/api/use-tenant-payments.ts
    - src/hooks/api/use-tenant-autopay.ts
    - src/hooks/api/use-tenant-maintenance.ts
    - src/hooks/api/use-payments.ts
    - src/hooks/api/use-tenant-lease.ts
    - src/hooks/api/use-tenant-settings.ts
    - src/hooks/api/query-keys/dashboard-graphql-keys.ts

key-decisions:
  - "Global refetchOnWindowFocus: true (not 'always') -- queries only refetch on focus when stale"
  - "Tenant payment queries override to 'always' -- payment data is time-sensitive"
  - "Auth provider keeps refetchOnWindowFocus: false -- auth state must not refetch on focus"

patterns-established:
  - "Global query defaults cascade to all hooks; only override for specific domain needs"
  - "Time-sensitive financial queries use refetchOnWindowFocus: 'always'"

requirements-completed: [PERF-05, PERF-09, PERF-22]

# Metrics
duration: 4min
completed: 2026-03-06
---

# Phase 08 Plan 01: Global Query Defaults and Config Optimizations Summary

**Global refetchOnWindowFocus changed from 'always' to true, 15 redundant hook overrides removed, optimizePackageImports added for tree-shaking**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-06T17:48:43Z
- **Completed:** 2026-03-06T17:52:48Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Changed global refetchOnWindowFocus from 'always' to true, eliminating unnecessary network requests when data is still within 5-minute staleTime
- Removed 15 redundant refetchOnWindowFocus: false overrides across 8 hook files that now correctly inherit global default
- Set tenant payment queries (amountDue, payments) to 'always' since payment data is time-sensitive
- Added optimizePackageImports for date-fns, @tanstack/react-query, @tanstack/react-form, @tanstack/react-virtual
- Removed 2 stale monorepo @source paths from globals.css

## Task Commits

Each task was committed atomically:

1. **Task 1: Update global query defaults and config** - `e8144a8` (feat)
2. **Task 2: Remove redundant refetchOnWindowFocus overrides and set payment exceptions** - `3d15917` (feat)

## Files Created/Modified
- `src/providers/query-provider.tsx` - Global refetchOnWindowFocus changed to true
- `next.config.ts` - Added optimizePackageImports for 4 packages
- `src/app/globals.css` - Removed 2 stale monorepo @source paths
- `src/hooks/api/use-owner-dashboard.ts` - Removed 5 refetchOnWindowFocus: false
- `src/hooks/api/use-dashboard-hooks.ts` - Removed 1 refetchOnWindowFocus: false
- `src/hooks/api/use-tenant-settings.ts` - Removed 1 refetchOnWindowFocus: false
- `src/hooks/api/use-payments.ts` - Removed 2 refetchOnWindowFocus: false
- `src/hooks/api/use-tenant-autopay.ts` - Removed 1 refetchOnWindowFocus: false
- `src/hooks/api/use-tenant-maintenance.ts` - Removed 1 refetchOnWindowFocus: false
- `src/hooks/api/use-tenant-lease.ts` - Removed 2 refetchOnWindowFocus: false
- `src/hooks/api/use-tenant-payments.ts` - Changed 2 refetchOnWindowFocus from true to 'always'
- `src/hooks/api/query-keys/dashboard-graphql-keys.ts` - Removed 1 refetchOnWindowFocus: false

## Decisions Made
- Global refetchOnWindowFocus: true (not 'always') -- queries only refetch on focus when data is past staleTime (5 minutes), eliminating unnecessary network requests
- Tenant payment queries override to 'always' -- payment data is time-sensitive and should always refetch on focus
- Auth provider retains refetchOnWindowFocus: false -- auth state should not refetch on window focus (handled by session management)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Global query defaults established, all hooks inherit correct behavior
- Ready for further performance plans (dynamic imports, bundle optimization)

## Self-Check: PASSED

- All 12 modified files exist on disk
- Commit e8144a867 (Task 1) found in git history
- Commit 3d15917ca (Task 2) found in git history
- refetchOnWindowFocus grep shows exactly 4 occurrences (1 global + 3 overrides)
- pnpm validate:quick passes (975 tests passed, 84 test files)

---
*Phase: 08-performance-optimization*
*Completed: 2026-03-06*
