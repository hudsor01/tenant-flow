---
phase: 08-performance-optimization
plan: 04
subsystem: api
tags: [tanstack-query, supabase, postgrest, query-optimization, deduplication]

# Dependency graph
requires:
  - phase: 05-code-quality
    provides: Query key factories in src/hooks/api/query-keys/
  - phase: 08-01
    provides: Global query defaults and cache config
provides:
  - Bounded list queries with .limit() on all growing tables
  - Specific column selections replacing select('*') on blogs and notifications
  - DB-level HEAD count queries for tenant maintenance stats
  - Shared occupancyTrendsQuery factory deduplicating 5+ call sites
  - Fixed p_owner_id parameter name on all occupancy trends RPC calls
affects: [08-06, 08-07, testing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "DB-level HEAD count queries with { count: 'exact', head: true } for stats"
    - "Shared queryOptions factory for RPC deduplication across hook files"
    - "Pick<Type, ...> for narrowed column subsets on list queries"

key-files:
  created: []
  modified:
    - src/hooks/api/use-blogs.ts
    - src/hooks/api/query-keys/maintenance-keys.ts
    - src/hooks/api/query-keys/lease-keys.ts
    - src/hooks/api/use-notifications.ts
    - src/hooks/api/use-tenant-maintenance.ts
    - src/hooks/api/query-keys/analytics-keys.ts
    - src/hooks/api/use-analytics.ts
    - src/hooks/api/use-owner-dashboard.ts
    - src/hooks/api/query-keys/property-keys.ts
    - src/hooks/api/query-keys/report-keys.ts

key-decisions:
  - "property_images and report_runs select('*') kept (small tables scoped by FK filter)"
  - "Lease detail keeps select('*') for base columns, specifies only join relation columns"
  - "LeaseListItem uses Pick<Lease, ...> for expiring query return type narrowing"
  - "occupancyTrendsQuery staleTime 5min (longer than 2min default -- occupancy changes infrequently)"
  - "Fixed p_user_id to p_owner_id on all occupancy trends RPC calls (latent parameter name bug)"

patterns-established:
  - "DB HEAD counts: use { count: 'exact', head: true } for status counts instead of fetch-all + JS filter"
  - "Shared RPC factory: fetchOccupancyTrends() standalone + occupancyTrendsQuery() wrapper in analytics-keys.ts"
  - "Column selection: BLOG_LIST_COLUMNS constant for consistent column sets across list queries"

requirements-completed: [PERF-14, PERF-15, PERF-16, PERF-17, PERF-18, PERF-19, PERF-20]

# Metrics
duration: 25min
completed: 2026-03-06
---

# Phase 8 Plan 04: Query Bounds & Occupancy Dedup Summary

**Bounded all unbounded list queries with .limit(), replaced select('*') with specific columns, and deduplicated 5+ occupancy trends RPC calls into shared analytics-keys.ts factory**

## Performance

- **Duration:** 25 min
- **Started:** 2026-03-06T18:20:00Z
- **Completed:** 2026-03-06T18:45:00Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- All blog queries bounded with .limit(20) and specific BLOG_LIST_COLUMNS selection
- Maintenance urgent/overdue bounded to .limit(50); tenant portal counts moved from JS filter to DB-level HEAD queries
- Lease expiring bounded to .limit(50) with LeaseListItem Pick type; detail query specifies join columns
- Notifications query uses specific column selection with NotificationListItem Pick type
- get_occupancy_trends_optimized RPC deduplicated from 5+ inline calls to single shared factory
- Fixed latent p_user_id vs p_owner_id parameter name bug across all occupancy trends call sites

## Task Commits

Each task was committed atomically:

1. **Task 1: Bound unbounded queries and replace select('*') with specific columns** - `a16212f0e` (feat)
2. **Task 2: Deduplicate get_occupancy_trends_optimized calls via shared queryOptions** - `f28a93320` (feat)

## Files Created/Modified
- `src/hooks/api/use-blogs.ts` - Added BLOG_LIST_COLUMNS constant, .limit(20) on all list queries, specific columns on detail
- `src/hooks/api/query-keys/maintenance-keys.ts` - Added .limit(50) to urgent/overdue, parallel DB HEAD counts for tenant portal
- `src/hooks/api/query-keys/lease-keys.ts` - Added .limit(50) to expiring, LeaseListItem Pick type, specific join columns on detail
- `src/hooks/api/use-notifications.ts` - NotificationListItem Pick type, specific column selection
- `src/hooks/api/use-tenant-maintenance.ts` - DB-level HEAD count queries replacing JS filter pattern
- `src/hooks/api/query-keys/analytics-keys.ts` - Added fetchOccupancyTrends(), occupancyTrendsQuery() shared factory
- `src/hooks/api/use-analytics.ts` - 3 inline RPC calls replaced with fetchOccupancyTrends(12)
- `src/hooks/api/use-owner-dashboard.ts` - Inline occupancy query replaced with occupancyTrendsQuery()
- `src/hooks/api/query-keys/property-keys.ts` - analytics.occupancy replaced with occupancyTrendsQuery()
- `src/hooks/api/query-keys/report-keys.ts` - 2 inline RPC calls replaced with fetchOccupancyTrends(12)

## Decisions Made
- **property_images and report_runs select('*') kept:** Both are small tables scoped by FK filter (property_id, report_id) -- not growing unbounded
- **Lease detail keeps select('*') for base:** Specifying all columns caused TypeScript incompatibility with full Lease type; join columns are specified explicitly
- **LeaseListItem as Pick<Lease>:** Narrowed return type for expiring query avoids full Lease payload
- **5-min staleTime on occupancy trends:** Occupancy changes less frequently than financial data (2-min default)
- **Fixed p_owner_id parameter name:** All call sites incorrectly used p_user_id; the RPC expects p_owner_id per supabase.ts types

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed p_user_id to p_owner_id on occupancy trends RPC**
- **Found during:** Task 2 (occupancy trends deduplication)
- **Issue:** use-analytics.ts, use-owner-dashboard.ts, and property-keys.ts all passed `p_user_id` but the RPC signature expects `p_owner_id`
- **Fix:** Shared fetchOccupancyTrends() uses correct `p_owner_id` parameter; all call sites now use the shared function
- **Files modified:** src/hooks/api/query-keys/analytics-keys.ts (new), src/hooks/api/use-analytics.ts, src/hooks/api/use-owner-dashboard.ts, src/hooks/api/query-keys/property-keys.ts, src/hooks/api/query-keys/report-keys.ts
- **Verification:** pnpm typecheck passes, parameter matches supabase.ts RPC type definition
- **Committed in:** f28a93320 (Task 2 commit)

**2. [Rule 1 - Bug] Fixed blog column names (cover_image_url -> featured_image)**
- **Found during:** Task 1 (blog column selection)
- **Issue:** Plan suggested cover_image_url but actual DB column is featured_image per supabase.ts
- **Fix:** Used correct column name from generated types
- **Files modified:** src/hooks/api/use-blogs.ts
- **Verification:** pnpm typecheck passes
- **Committed in:** a16212f0e (Task 1 commit)

**3. [Rule 1 - Bug] Added missing action_url and read_at to NotificationListItem**
- **Found during:** Task 1 (notification column selection)
- **Issue:** Consumer component (tenant notifications page) reads action_url and read_at properties
- **Fix:** Added both fields to NotificationListItem Pick type and select query
- **Files modified:** src/hooks/api/use-notifications.ts
- **Verification:** pnpm typecheck passes
- **Committed in:** a16212f0e (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (3 bugs)
**Impact on plan:** All fixes necessary for correctness. No scope creep.

## Issues Encountered
- TypeScript TS2352 when selecting specific columns on lease detail query (partial column set incompatible with full Lease type) -- resolved by keeping `*` for base and specifying only join columns
- TypeScript TS2344 when LeaseListItem initially included `lease_type` which doesn't exist on the Lease type -- removed non-existent field

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All list queries now bounded -- no risk of unbounded growth on paginated endpoints
- Occupancy trends fully deduplicated -- same-parameter calls share cache entries
- Ready for 08-06 (stats consolidation RPCs) and 08-07 ('use client' audit)

---
## Self-Check: PASSED

All 10 modified files verified present. Both task commits (a16212f0e, f28a93320) verified in git log. SUMMARY.md created.

---
*Phase: 08-performance-optimization*
*Completed: 2026-03-06*
