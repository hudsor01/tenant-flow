---
phase: 30-analytics-data
plan: 03
subsystem: analytics
tags: [tanstack-query, rpc-boundary, occupancy, jsonb, mappers]

# Dependency graph
requires:
  - phase: 30-analytics-data
    provides: get_occupancy_trends_optimized RPC (returns jsonb array, month DESC)
provides:
  - Array-aware occupancy boundary mapper (mapOccupancyAnalytics) + typed fetchOccupancyTrends
  - Occupancy analytics page + report occupancy metrics render real trends/current-occupancy
affects: [analytics, reports, future lease-analytics work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RPC jsonb-array boundary: fetch via jsonArrayOrEmpty, shape via a never-throw array mapper that Number()-coerces every field and derives current metrics from element[0]"

key-files:
  created: []
  modified:
    - src/hooks/api/query-keys/analytics-keys.ts
    - src/hooks/api/query-keys/analytics-mappers.ts
    - src/hooks/api/query-keys/analytics-mappers.test.ts
    - src/hooks/api/use-analytics.ts
    - src/hooks/api/query-keys/report-analytics-keys.ts
    - src/hooks/api/__tests__/use-reports.test.tsx

key-decisions:
  - "fetchOccupancyTrends returns Array<Record<string, unknown>> via jsonArrayOrEmpty (drops the data ?? {} object fallback that made every consumer read empty)"
  - "Current occupancy metrics derive from element[0] (RPC orders month DESC, so element[0] is the latest month)"
  - "byProperty stays [] in occupancyMetrics — the RPC has no per-property breakdown"
  - "lease/overview pages: the occupancy-RPC-fed-into-lease mis-wire is made explicit (comments + follow-up); occupancy data lands in vacancyTrends, lease-financial sub-shapes stay empty; no lease-analytics RPC invented"

patterns-established:
  - "Occupancy array mapper mirrors mapLeaseAnalytics's degrade-to-empty contract (never throws; empty/non-array -> zeroed metrics + empty trends)"

requirements-completed: [DATA-01]

# Metrics
duration: ~30min
completed: 2026-07-08
---

# Phase 30 Plan 03: Occupancy Analytics Array-Shape Fix Summary

**Occupancy analytics + report occupancy metrics now render real monthly trends and current-occupancy figures from the jsonb ARRAY `get_occupancy_trends_optimized` actually returns (element[0] = latest month), instead of the empty charts/zeros produced by reading the array as an object.**

## Performance

- **Duration:** ~30 min
- **Completed:** 2026-07-08
- **Tasks:** 4
- **Files modified:** 6

## Accomplishments
- `fetchOccupancyTrends` now returns the typed jsonb array via `jsonArrayOrEmpty` (was `data ?? {}`); `occupancyTrendsQuery` retyped to match.
- New `mapOccupancyAnalytics` array mapper: one `OccupancyTrendPoint` per row, metrics derived from element[0], never throws (degrades to zeroed metrics + empty trends). Covered by 4 new unit tests.
- `occupancyPageData` renders the trend series + current-occupancy from the array (was an always-empty object read).
- Report `occupancyMetrics` derives totals from element[0]; `vacantUnits = total - occupied`; `byProperty: []`.
- Two silent mis-wires made explicit (code comments + captured follow-ups below) rather than masked.

## Task Commits

Each task was committed atomically:

1. **Task 1: fetch returns typed array + array-aware occupancy mapper** - `1167419d3` (fix)
2. **Task 2: rewire use-analytics occupancy/lease/overview consumers** - `8c4399fe4` (fix)
3. **Task 3: report occupancyMetrics from element[0] + neutralize tenant-report mis-wire** - `80d7b0a1e` (fix)
4. **Task 4: update use-reports tests for the array shape** - `2b0e612f6` (test)

## Files Created/Modified
- `src/hooks/api/query-keys/analytics-keys.ts` - `fetchOccupancyTrends` returns `Array<Record<string, unknown>>` via `jsonArrayOrEmpty`; `occupancyTrendsQuery` retyped.
- `src/hooks/api/query-keys/analytics-mappers.ts` - added `mapOccupancyAnalytics` (array -> `OccupancyAnalyticsPageData`; trends per row, metrics from element[0]).
- `src/hooks/api/query-keys/analytics-mappers.test.ts` - 4 new `mapOccupancyAnalytics` tests (trend map, element[0] derivation, `Number()` coercion, empty/non-array degrade).
- `src/hooks/api/use-analytics.ts` - `occupancyPageData` uses the mapper; `leasePageData`/`overviewPageData` derive occupancy into `vacancyTrends`, leave lease-financial empty, mark the mis-wire.
- `src/hooks/api/query-keys/report-analytics-keys.ts` - `occupancyMetrics` reads element[0]; tenant report drops the object cast and pins turnover/on-time-payment to 0.
- `src/hooks/api/__tests__/use-reports.test.tsx` - tenant-report + error-path mocks now arrays; `occupancyMetrics` test asserts concrete element[0]-derived values.

## Captured Follow-ups (REQUIRED per plan output)

**1. lease/overview analytics are fed the occupancy RPC and need a real lease-analytics data source.**
`analyticsQueries.leasePageData` and `analyticsQueries.overviewPageData.lease` both call `fetchOccupancyTrends(12)` and shape it as lease analytics. The occupancy RPC carries NO lease-financial data (leases/rent/profitability/lifecycle/status), so those sub-shapes are unavoidably empty. This is a genuine data gap, not a bug fixable in DATA-01. Occupancy data is now derived into the one occupancy-shaped field the lease page carries (`vacancyTrends` = complement of occupancy rate); the rest stays empty. Candidate new requirement (e.g. **DATA-04**): build/point these pages at a real lease-analytics RPC.

**2. the tenant report reads non-existent turnover/on-time-payment fields off the occupancy RPC.**
`reportAnalyticsQueries.tenants` previously cast the occupancy result to an object and read `turnover_rate` / `on_time_payment_rate`, which `get_occupancy_trends_optimized` never emits — a separate mis-wire. Both metrics are now explicitly `0` with a follow-up comment. There is no real source for landlord tenant-turnover or on-time-payment rate today (no rent-payment facilitation in TenantFlow); a future requirement would need to define/derive these from lease churn + (non-existent) payment data.

## Decisions Made
- Kept `mapLeaseAnalytics` untouched (intentionally preserved for a future real lease-analytics source per the plan); added `mapOccupancyAnalytics` as a sibling rather than repurposing it.
- Kept the `fetchOccupancyTrends(12)` call in the tenant report's `Promise.all` (shared query) even though its result is now discarded, matching the plan's guidance and the Task-4 test wiring.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Third test broken by the array-shape change (tenant-report error path)**
- **Found during:** Task 4 (test updates)
- **Issue:** `useTenantReport (error path)` mocked the occupancy fetch as `data: {}` (an object). After Task 1, `jsonArrayOrEmpty` throws on an object, so a shape error surfaced instead of the intended `get_dashboard_stats` "permission denied" error — the test failed. The plan anticipated only two tests changing.
- **Fix:** Changed that mock to `data: []`. Test intent (dashboard-error propagation) preserved.
- **Files modified:** `src/hooks/api/__tests__/use-reports.test.tsx`
- **Verification:** `bun run test:unit` — 32/32 in the file pass.
- **Committed in:** `2b0e612f6` (Task 4 commit)

**2. [Rule 2 - Missing Critical] Added unit tests for the new `mapOccupancyAnalytics` mapper**
- **Found during:** Task 1
- **Issue:** The new mapper's only runtime consumers (`occupancyPageData`/`leasePageData`) have no unit tests, so its behavior (element[0] derivation, degrade-to-empty) would be unlocked and largely uncovered.
- **Fix:** Added 4 tests to `analytics-mappers.test.ts` regression-locking trend mapping, element[0] metrics, `Number()` coercion, and empty/non-array degrade.
- **Files modified:** `src/hooks/api/query-keys/analytics-mappers.test.ts`
- **Verification:** `bun run test:unit` — 13/13 in the file pass.
- **Committed in:** `1167419d3` (Task 1 commit)

### Out-of-scope note (not a deviation I introduced)
Two pre-staged migration files (`20260709000354_data02_...`, `20260709000406_data03_...`) were already in the git index at agent start (staged, uncommitted). They were swept into the Task-1 commit `1167419d3` because a plain `git commit` commits everything staged. Reset/branch/stash ops were prohibited, so they could not be un-bundled; they are legitimate DATA-02/03 migration files that belong on the branch. Subsequent commits used explicit pathspec to avoid any recurrence.

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing-critical test coverage).
**Impact on plan:** Both necessary for a green tree and regression safety. No scope creep — the array-shape change is confined to the four planned files plus their tests.

## Issues Encountered
- The `fetchOccupancyTrends` return-type change rippled a typecheck error into `report-analytics-keys.ts` (Task 3's file) — expected coupling; resolved by Task 3. Because the lefthook pre-commit runs `typecheck` + `lint` + `test:unit --coverage` against the whole working tree, all edits were completed and verified green before committing each task's files individually.

## Next Phase Readiness
- Occupancy analytics + report occupancy metrics are correct. The two captured follow-ups (real lease-analytics source; tenant turnover/on-time-payment source) are candidates for a future DATA requirement and do not block Phase 30.

---
*Phase: 30-analytics-data*
*Completed: 2026-07-08*
