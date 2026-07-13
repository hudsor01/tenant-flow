---
phase: 30-analytics-data
plan: 04
subsystem: api
tags: [tanstack-query, cache-invalidation, units, properties, dashboard]

# Dependency graph
requires:
  - phase: 30-analytics-data
    provides: unitQueries / ownerDashboardKeys query-key factories
provides:
  - Unit create/edit/delete refresh the property-detail units table (by-property cache)
  - Property update refreshes the owner dashboard (analytics pageData)
affects: [analytics, dashboard, property-detail]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Invalidate the broad prefix key (unitQueries.all() / ownerDashboardKeys.all) so all sibling branches — including the actually-queried one — prefix-match"

key-files:
  created: []
  modified:
    - src/hooks/api/use-unit.ts
    - src/hooks/api/use-property-mutations.ts

key-decisions:
  - "PROP-01: all three unit mutations invalidate the broad unitQueries.all() (['units']) — delete only receives the id (no property_id), so the broad prefix is required there and used everywhere for consistency"
  - "PROP-02: useUpdatePropertyMutation invalidates ownerDashboardKeys.all (matching create/delete) so it prefix-matches the dashboard's analytics.pageData() instead of the never-queried analytics.stats()"

patterns-established:
  - "When a table/query reads a sibling branch of a key factory, invalidate the shared parent prefix, not the specific sibling the mutation happens to know about"

requirements-completed: [PROP-01, PROP-02]

# Metrics
duration: ~10min
completed: 2026-07-08
---

# Phase 30 Plan 04: Cache-Invalidation Correctness Fixes Summary

**Unit create/edit/delete now invalidate the broad `['units']` prefix so the property-detail units table refreshes, and property update invalidates `ownerDashboardKeys.all` so the owner dashboard refreshes — two mismatched-key invalidation bugs fixed.**

## Performance

- **Duration:** ~10 min
- **Completed:** 2026-07-08
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- **PROP-01:** The three unit mutations invalidated `unitQueries.lists()` (`['units','list']`), a sibling of `unitQueries.byProperty()` (`['units','by-property',id]`) that the property-detail table reads — so it stayed stale. All three now invalidate `unitQueries.all()` (`['units']`), which prefix-matches by-property.
- **PROP-02:** `useUpdatePropertyMutation` invalidated `ownerDashboardKeys.analytics.stats()` — a key nothing queries. Swapped to `ownerDashboardKeys.all`, which prefix-matches the dashboard's `analytics.pageData()` (like the create/delete property mutations already do).

## Task Commits

Each task was committed atomically:

1. **Task 1: PROP-01 — invalidate unitQueries.all() in all three unit mutations** - `d1c0d8636` (fix)
2. **Task 2: PROP-02 — useUpdatePropertyMutation invalidates ownerDashboardKeys.all** - `62bd8329e` (fix)

## Files Created/Modified
- `src/hooks/api/use-unit.ts` - create/update/delete unit mutations invalidate `unitQueries.all()` (was `unitQueries.lists()`); other invalidate entries and `updateDetail`/`removeDetail` unchanged.
- `src/hooks/api/use-property-mutations.ts` - `useUpdatePropertyMutation` invalidates `ownerDashboardKeys.all` (was `ownerDashboardKeys.analytics.stats()`); `propertyQueries.lists()`/`unitQueries.lists()`/`updateDetail` unchanged.

## Decisions Made
- Used the broad `unitQueries.all()` in all three unit mutations (not the narrower `byProperty(id)`), per the locked decision — the delete mutation only receives the id, not `property_id`, so it cannot target a specific by-property key; the broad prefix is required there and used uniformly for consistency.

## Deviations from Plan
None - plan executed exactly as written. The plan flagged that `property-mutations.test.tsx` might pin the `analytics.stats()` key; it does not reference `ownerDashboardKeys` at all, and no test asserts on `unitQueries.*` keys, so no test changes were required.

## Issues Encountered
None. `bun run typecheck` + `bun run lint` clean; property-mutations / property-units-table / add-unit-panel tests pass (45/45).

## Next Phase Readiness
- Both invalidation bugs fixed; unit mutations and property updates now refresh the correct caches. No blockers.

---
*Phase: 30-analytics-data*
*Completed: 2026-07-08*
