---
phase: 08-performance-optimization
plan: 06
subsystem: database, ui
tags: [postgresql, filter-aggregates, tanstack-react-virtual, virtualization, rpc, performance]

requires:
  - phase: 08-performance-optimization
    provides: query optimization patterns from prior plans
provides:
  - get_maintenance_stats RPC (replaces 7 HEAD queries)
  - get_lease_stats RPC (replaces 6 parallel queries)
  - VirtualizedList reusable component
  - Row virtualization on property, tenant, lease tables
affects: [maintenance-keys, lease-keys, list-pages]

tech-stack:
  added: ["@tanstack/react-virtual"]
  patterns: [FILTER aggregate RPCs, useVirtualizer for table rows, scroll-constrained list containers]

key-files:
  created:
    - supabase/migrations/20260306190000_consolidate_stats_rpcs.sql
    - src/components/shared/virtualized-list.tsx
  modified:
    - src/hooks/api/query-keys/maintenance-keys.ts
    - src/hooks/api/query-keys/lease-keys.ts
    - src/hooks/api/__tests__/use-lease.test.tsx
    - src/components/properties/property-table.tsx
    - src/components/properties/properties.tsx
    - src/components/tenants/tenant-table.tsx
    - src/components/tenants/tenant-grid.tsx
    - src/components/leases/table/leases-table.tsx
    - src/components/maintenance/maintenance-view.client.tsx

key-decisions:
  - "FILTER aggregates in SECURITY DEFINER RPCs reduce 13 HTTP round-trips to 2 for stats"
  - "useVirtualizer applied directly to table tbody rows (not VirtualizedList wrapper) for table views"
  - "Grid views use scroll-constrained containers rather than row-grouped virtualization (responsive column count makes row-grouping fragile)"
  - "Maintenance table uses DataTable (@tanstack/react-table) -- scroll containment added at view level"

patterns-established:
  - "Stats consolidation: Use PostgreSQL FILTER aggregates in SECURITY DEFINER RPCs instead of multiple HEAD queries"
  - "Table virtualization: useVirtualizer on scroll container ref with sticky thead, estimated row heights per domain"

requirements-completed: [PERF-06, PERF-07, PERF-08]

duration: 36min
completed: 2026-03-06
---

# Phase 8 Plan 6: Stats RPC Consolidation and List Virtualization Summary

**Consolidated 13 HTTP round-trips to 2 via PostgreSQL FILTER aggregate RPCs, added @tanstack/react-virtual row virtualization to property/tenant/lease tables**

## Performance

- **Duration:** 36 min
- **Started:** 2026-03-06T18:54:07Z
- **Completed:** 2026-03-06T19:30:07Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Created get_maintenance_stats RPC replacing 7 parallel HEAD queries with single FILTER aggregate query
- Created get_lease_stats RPC replacing 6 parallel queries (5 HEAD + 1 data fetch) with single query plus rent aggregates
- Built VirtualizedList reusable component with @tanstack/react-virtual
- Added row virtualization to PropertyTable (64px rows), TenantTable (56px rows), LeasesTable (72px rows)
- Added scroll containment to maintenance table view and grid views
- Sticky table headers on all virtualized tables

## Task Commits

Each task was committed atomically:

1. **Task 1: Create stats consolidation RPCs and update frontend queries** - `4d8ba1b90` (feat)
2. **Task 2: Create VirtualizedList component and integrate with 4 list pages** - `6541ff0c3` (feat)

## Files Created/Modified
- `supabase/migrations/20260306190000_consolidate_stats_rpcs.sql` - get_maintenance_stats and get_lease_stats RPCs with FILTER aggregates
- `src/components/shared/virtualized-list.tsx` - Reusable VirtualizedList component with useVirtualizer
- `src/hooks/api/query-keys/maintenance-keys.ts` - Stats query now uses single RPC call
- `src/hooks/api/query-keys/lease-keys.ts` - Stats query now uses single RPC call
- `src/hooks/api/__tests__/use-lease.test.tsx` - Updated test for RPC-based stats query
- `src/components/properties/property-table.tsx` - Row virtualization with useVirtualizer
- `src/components/properties/properties.tsx` - Scroll-constrained grid container
- `src/components/tenants/tenant-table.tsx` - Row virtualization with useVirtualizer
- `src/components/tenants/tenant-grid.tsx` - Scroll-constrained grid container
- `src/components/leases/table/leases-table.tsx` - Row virtualization with useVirtualizer
- `src/components/maintenance/maintenance-view.client.tsx` - Scroll-constrained table view container

## Decisions Made
- FILTER aggregates in SECURITY DEFINER RPCs reduce 13 HTTP round-trips to 2 for stats queries
- useVirtualizer applied directly to table tbody rows (not VirtualizedList wrapper) for table views -- more natural for table DOM structure
- Grid views use scroll-constrained containers rather than row-grouped virtualization because responsive column count makes row-grouping fragile across breakpoints
- Maintenance table uses DataTable (@tanstack/react-table) -- scroll containment added at the maintenance view level to avoid modifying the shared DataTable component

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated use-lease.test.tsx for RPC-based stats**
- **Found during:** Task 1
- **Issue:** Test expected `supabase.from('leases')` for stats query but new implementation uses `supabase.rpc('get_lease_stats')`
- **Fix:** Added rpc mock and getCachedUser mock to test, updated assertion to expect RPC call
- **Files modified:** src/hooks/api/__tests__/use-lease.test.tsx
- **Verification:** All 84 test files pass (975 tests)
- **Committed in:** 4d8ba1b90 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Test update was necessary for correctness. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Stats RPCs ready for production deployment (migration file created)
- List virtualization active on all 4 main list pages
- @tanstack/react-virtual added as dependency

## Self-Check: PASSED

All 8 key files verified on disk. Both task commits (4d8ba1b90, 6541ff0c3) confirmed in git log.

---
*Phase: 08-performance-optimization*
*Completed: 2026-03-06*
