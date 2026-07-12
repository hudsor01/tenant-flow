---
phase: 28-tenant-domain
plan: 04
subsystem: api
tags: [tenants, tanstack-query, optimistic-update, mutation, cache-key, moved-out]

# Dependency graph
requires: []
provides:
  - "useMarkTenantAsMovedOutMutation no longer writes a wrong-key/wrong-shape optimistic list entry"
  - "the moved-out list refresh now flows through the existing invalidate (prefix-matches ['tenants','list',{}])"
  - "detail + withLease optimistic writes (correct key + single-object shape) retained"
affects: [TEN-06, tenant list, mark-moved-out flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "When an optimistic list write targets the wrong exact cache key AND the wrong shape, prefer dropping it and relying on the existing invalidate (which prefix-matches) over patching setQueriesData"

key-files:
  created: []
  modified:
    - src/hooks/api/use-tenant-mutations.ts
    - src/hooks/api/__tests__/use-tenant.test.tsx

key-decisions:
  - "Dropped the optimistic list step entirely (LOCKED: simplest correct fix) rather than switching to setQueriesData with the ['tenants','list'] prefix + PaginatedResponse .data mapping"
  - "Kept cancel({ ...lists() }) — cancelling the ['tenants','list'] prefix stops an in-flight refetch racing the invalidation, which is desirable"
  - "Regression test seeds the real ['tenants','list',{}] key with a PaginatedResponse object and asserts it stays an object, not an array"

patterns-established:
  - "Regression test for cache-key/shape bugs: seed the REAL key with the REAL shape, run the mutation, assert the shape survives"

requirements-completed: [TEN-06]

# Metrics
duration: ~20min
completed: 2026-07-07
---

# Phase 28 Plan 04: Fix mark-moved-out optimistic list write (wrong key + wrong shape)

**`useMarkTenantAsMovedOutMutation` no longer reads/writes the wrong `['tenants','list']` key with a bare-array shape (a latent `old.filter is not a function` throw path); the moved-out list refresh now comes purely from the existing `invalidate`, while the correct detail + withLease optimistic writes are preserved.**

## Accomplishments

### Task 1 — drop the broken optimistic list step (TEN-06)
- Removed `previousList: TenantWithLeaseInfo[] | undefined` from the mutation's context type param, leaving `previousDetail`, `previousWithLease`, `id`.
- Removed the `previousList: qc.getQueryData<TenantWithLeaseInfo[]>(tenantQueries.lists())` read from `snapshot` (wrong key + wrong shape).
- Removed the `qc.setQueryData<TenantWithLeaseInfo[]>(tenantQueries.lists(), (old) => old.filter(...))` write from `apply`; the two single-object `updateFn` writes to `detail` and `withLease` remain.
- Removed the `if (context.previousList)` restore from `rollback`; detail + withLease restores remain.
- Left `cancel` (cancels the `['tenants','list']` prefix, which correctly halts an in-flight refetch) and `invalidate` (already lists `tenantQueries.lists()`) unchanged. `TenantWithLeaseInfo` stays imported (still used by `previousWithLease` + callback generics).

### Task 2 — regression test (TEN-06)
- Added a `useMarkTenantAsMovedOutMutation (TEN-06)` describe block in `use-tenant.test.tsx`.
- Mocks the two `tenants` chains markMovedOut needs (`update(...).eq()` then `select(...).eq().single()`), seeds the list cache under the REAL `tenantQueries.list().queryKey` (`['tenants','list',{}]`) with a `PaginatedResponse` object, and seeds the detail cache.
- Asserts `mutateAsync` resolves without throwing, the list cache entry stays a `PaginatedResponse` object (`Array.isArray === false`, `.data` still an array), and the detail optimistic write bumped `updated_at` off the seeded value.

## Task Commits

1. **Task 1: Drop the broken optimistic list step (TEN-06)** — `27adc33f9` (fix)
2. **Task 2: Regression test (TEN-06)** — `f958669ac` (test)

## Verification

- `bun run typecheck` — clean (confirms `previousList` fully removed from the context type + `TenantWithLeaseInfo` still legitimately imported).
- `bun run test:unit -- src/hooks/api/__tests__/use-tenant.test.tsx` — 15 tests pass (13 existing + the 2-assertion TEN-06 regression, counted as 15 with the new case).
- Full pre-commit gate passed on both commits.

## Deviations from Plan

None — plan executed as written. One authoring correction: the detail cache seed initially carried a `version: 1` field, which the whole-tree typecheck rejected because the detail key's data type is `Tenant` (no `version`); removed it — `incrementVersion` defaults an absent version to 0, so the optimistic bump still applies.

## Issues Encountered

- The pre-commit typecheck (`tsc --noEmit`) checks the whole tree, so the unstaged Task 2 test file's transient `version` type error blocked the Task 1 commit until the test was corrected. Fixed the test, then committed Task 1 (clean tree) and Task 2 in order.

## Next Phase Readiness

- Moved-out flow is correct; no console error / no throw. Manual verify is covered by Plan 06.

---
*Phase: 28-tenant-domain*
*Completed: 2026-07-07*
