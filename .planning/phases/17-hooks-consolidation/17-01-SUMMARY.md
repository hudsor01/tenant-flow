---
phase: 17-hooks-consolidation
plan: 01
subsystem: api
tags: [tanstack-query, query-keys, hooks, react-hook-form, refactoring]

# Dependency graph
requires: []
provides:
  - "4 split query-key file pairs under 300 lines (report, property, tenant, financial)"
  - "3 refactored borderline files under 300 lines (lease-keys, use-data-table, use-tenant-mutations)"
  - "react-hook-form dependency removed"
affects: [17-02, 17-03, 17-04, 17-05, 17-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Domain-focused query-key splitting: separate CRUD from analytics/stats/invitations"
    - "Shared helpers extracted to keep split files under limits (fetchDashAndExpense, extractDashStats)"

key-files:
  created:
    - "src/hooks/api/query-keys/report-analytics-keys.ts"
    - "src/hooks/api/query-keys/property-stats-keys.ts"
    - "src/hooks/api/query-keys/tenant-invitation-keys.ts"
    - "src/hooks/api/query-keys/financial-tax-keys.ts"
  modified:
    - "src/hooks/api/query-keys/report-keys.ts"
    - "src/hooks/api/query-keys/property-keys.ts"
    - "src/hooks/api/query-keys/tenant-keys.ts"
    - "src/hooks/api/query-keys/financial-keys.ts"
    - "src/hooks/api/query-keys/lease-keys.ts"
    - "src/hooks/use-data-table.ts"
    - "src/hooks/api/use-tenant-mutations.ts"

key-decisions:
  - "Split report-keys at CRUD/analytics boundary: core queries stay, analytics queries move"
  - "Split property-keys at list-detail/stats boundary: kept list+detail+withUnits, moved stats+performance+analytics"
  - "Split tenant-keys at CRUD/invitation boundary: kept CRUD+stats, moved InvalidInviteError+invitation queries"
  - "Split financial-keys at statements/tax boundary: kept overview+statements, moved tax documents"
  - "Refactored borderline files in-place rather than splitting (tightly coupled logic)"
  - "Extracted shared helpers (fetchDashAndExpense, parseDashStats, extractDashStats) to stay under limits"

patterns-established:
  - "Query-key split pattern: keep key factory in original file, import from new file"
  - "Consumer update pattern: grep all imports, update each consumer directly (no barrel re-exports)"

requirements-completed: [MOD-04]

# Metrics
duration: 25min
completed: 2026-03-08
---

# Phase 17 Plan 01: Query-Key File Splits Summary

**Split 4 oversized query-key files into 8 domain-focused pairs and refactored 3 borderline files under 300 lines, removing dead react-hook-form dependency**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-03-08T05:00:00Z
- **Completed:** 2026-03-08T05:24:46Z
- **Tasks:** 2
- **Files modified:** 20

## Accomplishments
- Split 4 oversized query-key files (report 503L, property 450L, tenant 400L, financial 389L) into 8 domain-focused files all under 300 lines
- Refactored 3 borderline files (lease-keys 316->205, use-data-table 316->194, use-tenant-mutations 312->156) under 300 lines
- Removed dead react-hook-form dependency (zero imports, migration already complete)
- Updated 8 consumer files with correct imports -- no barrel files created
- ownerDashboardKeys reference count preserved at 56 (baseline maintained)
- All 1415 unit tests pass, typecheck clean, lint clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Split 4 oversized query-key files into domain-focused pairs** - `649f3982b` (feat)
2. **Task 2: Refactor 3 borderline files under 300 lines and remove react-hook-form** - `c603ac1b4` (feat)

## Files Created/Modified

### Created (4 new split files)
- `src/hooks/api/query-keys/report-analytics-keys.ts` - Analytics/report-type queries (paymentAnalytics, occupancyMetrics, financial, properties, tenants, maintenance, yearEnd, report1099)
- `src/hooks/api/query-keys/property-stats-keys.ts` - Property stats/performance/analytics queries with mapPerformanceRow helper
- `src/hooks/api/query-keys/tenant-invitation-keys.ts` - InvalidInviteError class and tenant invitation queries (list, validate)
- `src/hooks/api/query-keys/financial-tax-keys.ts` - Tax document queries

### Modified (16 files)
- `src/hooks/api/query-keys/report-keys.ts` - Reduced from 503 to 149 lines (CRUD + key factory retained)
- `src/hooks/api/query-keys/property-keys.ts` - Reduced from 450 to 204 lines (list/detail/withUnits/images retained)
- `src/hooks/api/query-keys/tenant-keys.ts` - Reduced from 400 to 236 lines (CRUD/stats retained)
- `src/hooks/api/query-keys/financial-keys.ts` - Reduced from 389 to 211 lines (overview/statements retained)
- `src/hooks/api/query-keys/lease-keys.ts` - Reduced from 316 to 205 lines (consolidated types, removed headers)
- `src/hooks/use-data-table.ts` - Reduced from 316 to 194 lines (consolidated constants, simplified callbacks)
- `src/hooks/api/use-tenant-mutations.ts` - Reduced from 312 to 156 lines (consolidated imports, extracted shared updateFn)
- `src/hooks/api/use-reports.ts` - Updated 8 hooks to import from report-analytics-keys
- `src/hooks/api/use-properties.ts` - Updated stats/performance/analytics hooks to import from property-stats-keys
- `src/hooks/api/use-property-mutations.ts` - Updated cache invalidation to use propertyStatsQueries
- `src/hooks/api/use-tenant.ts` - Updated invitation hooks to import from tenant-invitation-keys
- `src/hooks/api/use-tenant-invite-mutations.ts` - Updated invitation key invalidation
- `src/app/(auth)/accept-invite/page.tsx` - Updated InvalidInviteError and query imports
- `src/components/leases/wizard/selection-step.tsx` - Updated invitation key imports
- `package.json` - Removed react-hook-form dependency
- `pnpm-lock.yaml` - Updated lockfile

## Decisions Made
- Split boundaries chosen at logical domain seams (CRUD vs analytics, core vs invitations, statements vs tax) to maximize cohesion within each file
- Kept `reportKeys` key factory in report-keys.ts (shared by both files) rather than duplicating
- Extracted shared RPC helpers (`fetchDashAndExpense`, `parseDashStats`) in financial-keys.ts to reduce repetition and stay under 300 lines
- Refactored borderline files in-place rather than splitting because their logic is tightly coupled (nuqs+react-table in use-data-table, optimistic updates in use-tenant-mutations)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed lint eqeqeq violation in financial-keys.ts**
- **Found during:** Task 1
- **Issue:** `!= null` operator flagged by ESLint eqeqeq rule after refactoring
- **Fix:** Changed to explicit `!== null && !== undefined` pattern
- **Files modified:** src/hooks/api/query-keys/financial-keys.ts
- **Verification:** `pnpm lint` passes clean
- **Committed in:** 649f3982b (Task 1 commit)

**2. [Rule 3 - Blocking] Initial split oversized report-analytics-keys.ts (371 lines)**
- **Found during:** Task 1
- **Issue:** First split attempt left report-analytics-keys.ts at 371 lines (over 300 limit)
- **Fix:** Extracted shared CACHE constant and extractDashStats helper, tightened formatting
- **Files modified:** src/hooks/api/query-keys/report-analytics-keys.ts
- **Verification:** `wc -l` shows 240 lines
- **Committed in:** 649f3982b (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both auto-fixes necessary for correctness and meeting the 300-line constraint. No scope creep.

## Issues Encountered
- Plan referenced `src/hooks/api/use-data-table.ts` but actual path is `src/hooks/use-data-table.ts` (one directory level up). Found correct path via glob search.
- Shell glob expansion on `src/app/(auth)/accept-invite/page.tsx` required quoting the path with double quotes for git add.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All query-key and hook files are now under 300 lines, enabling clean mutationOptions factory additions in Plan 17-02 through 17-06
- react-hook-form removed, closing MOD-04 requirement
- No blockers for subsequent plans

## Self-Check: PASSED

- All 4 created files exist on disk
- All 2 task commits verified in git log
- SUMMARY.md created at expected path

---
*Phase: 17-hooks-consolidation*
*Completed: 2026-03-08*
