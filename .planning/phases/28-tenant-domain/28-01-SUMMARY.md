---
phase: 28-tenant-domain
plan: 01
subsystem: api
tags: [tenants, mapper, postgrest, lease, current-lease, tanstack-query]

# Dependency graph
requires: []
provides:
  - "mapTenantRow selects the current lease by active > is_primary > latest start_date (not is_primary/first)"
  - "currentLease, unit, property, and lease_status all derive from the same chosen lease"
  - "pickCurrentLeaseTenant helper scores lease_tenants deterministically"
affects: [TEN-02, TEN-04, tenant list, tenant detail, onViewLease]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "pickCurrentLeaseTenant: reduce-over-lease_tenants with a layered comparator (active, then is_primary, then latest start_date via Date.parse) filtering out null-lease rows"

key-files:
  created: []
  modified:
    - src/hooks/api/query-keys/tenant-mappers.ts
    - src/hooks/api/query-keys/tenant-mappers.test.ts

key-decisions:
  - "Layered comparator: active status wins first, is_primary breaks ties among same-active-status, latest start_date breaks the remaining ties — matches the TEN-04 LOCKED priority order"
  - "Only lease_tenants whose joined leases is non-null are considered; empty/all-null yields undefined -> currentLease null (existing behavior preserved)"
  - "start_date tie-break parses via Date.parse and sorts malformed/absent dates last rather than corrupting the order"

patterns-established:
  - "Deterministic single-row selection from a nested-join array via reduce, not find/[0]"

requirements-completed: [TEN-04]

# Metrics
duration: ~10min
completed: 2026-07-07
---

# Phase 28 Plan 01: Active-preferring current-lease selection in mapTenantRow

**A tenant whose primary lease_tenants row sits on a terminated lease but who also holds a separate active lease now shows the ACTIVE lease as current — currentLease.id, leaseStatus, unit, and property all derive from that one chosen lease, with a deterministic is_primary -> latest-start_date fallback.**

## Accomplishments

### Task 1 — prefer the active lease in current-lease selection (TEN-04)
- Replaced the buggy `leaseRows.find((lt) => lt.is_primary) ?? leaseRows[0]` selection with a new module-local `pickCurrentLeaseTenant(leaseRows)` helper.
- The helper filters to lease_tenants with a non-null `leases`, then reduces to one winner via a layered comparator: (1) `lease_status === "active"`, (2) `is_primary === true`, (3) latest `start_date` (parsed via `Date.parse`, NaN sorts last).
- `activeLease`/`activeUnit`/`activeProperty` still derive from the chosen row, so `currentLease`, `leases[]` history (unchanged), `unit`, `property`, `monthlyRent`, and `lease_status` all stay consistent with the chosen lease.
- Preserved every `?? null` guard and both NOT-NULL throws (`id`, `status`).
- Added a `mapTenantRow current-lease selection (TEN-04)` describe block with 4 cases: terminated-primary + separate active (active wins + `lease_status: "active"` + matching unit/property), no-active fallback to is_primary, two-active tie-break by latest start_date, and empty lease_tenants -> null currentLease/unit/property.

## Task Commits

1. **Task 1: Prefer the active lease in mapTenantRow current-lease selection (TEN-04)** — `97d05bf01` (fix)

## Verification

- `bun run test:unit -- src/hooks/api/query-keys/tenant-mappers.test.ts` — 13 tests pass (9 existing + 4 new TEN-04 cases).
- Full pre-commit gate (gitleaks, lockfile-verify, lint, typecheck, unit-tests, commitlint) passed on the commit.

## Deviations from Plan

None — plan executed as written. One test-fixture correction during authoring: the start_date tie-break case initially set the two active leases to differing `is_primary` values, which (correctly) let is_primary decide before start_date; the fixture was fixed to equal `is_primary` so it exercises the intended start_date tie-break.

## Issues Encountered

None.

## Next Phase Readiness

- `currentLease.id` is now the active lease, which is the upstream dependency for TEN-02's `onViewLease(currentLease.id)` (Plan 28-05, a different agent).

---
*Phase: 28-tenant-domain*
*Completed: 2026-07-07*
