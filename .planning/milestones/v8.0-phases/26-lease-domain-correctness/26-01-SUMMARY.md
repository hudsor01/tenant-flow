---
phase: 26-lease-domain-correctness
plan: 01
subsystem: ui
tags: [leases, postgrest, tanstack-query, embed, react]

# Dependency graph
requires:
  - phase: 25-lease-soft-delete
    provides: the `.neq('lease_status','inactive')` list filter that this plan must preserve
provides:
  - "leaseQueries.list embeds tenant name + unit + unit.property under the singular keys transformLease reads"
  - "Regression test pinning transformLease to the list embed shape (real values + null-relation fallbacks)"
affects: [LEASE-06 server pagination, LEASE-08 rent-increase notice address (both rely on the fuller list embed)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PostgREST embed aliases (alias:relation(...)) rename output keys to match the consumer's expected shape"

key-files:
  created: []
  modified:
    - src/hooks/api/query-keys/lease-keys.ts
    - src/hooks/api/__tests__/use-lease.test.tsx

key-decisions:
  - "Aligned the LIST query to transformLease (aliased embed keys to singular tenant/unit/property) rather than rewriting transformLease + LeaseWithNestedRelations — mirrors the already-correct detail query."
  - "Verified the exact embed string against the live DB under an authenticated owner before finalizing."

patterns-established:
  - "PostgREST list embeds must alias to the singular keys the row consumer (transformLease) reads; the detail query is the reference shape."

requirements-completed: [LEASE-01]

# Metrics
duration: ~20min
completed: 2026-07-04
---

# Phase 26 Plan 01: LEASE-01 Leases List Real Tenant/Property/Unit Summary

**The leases list now embeds tenant name + unit + unit.property under the singular keys `transformLease` reads, so rows show real tenant/property/unit values and search-by-name matches instead of every row rendering "Unassigned / No Property / N/A".**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-07-05T00:08:00Z
- **Completed:** 2026-07-05T00:28:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Fixed the root cause of LEASE-01: `leaseQueries.list` embedded the tenant under key `tenants` (id only) and the unit under `units` with no nested property, while `transformLease` reads `lease.tenant`, `lease.unit`, and `unit.property`. The new aliased embed makes those keys resolve at runtime.
- Verified the exact PostgREST embed string against the live production DB under an authenticated owner — rows return `tenant` (id + name/first_name/last_name), `unit` (id + unit_number + dims), and `unit.property` (id + name + address_line1) under exactly the singular keys, with no legacy `tenants`/`units` keys.
- Preserved the Phase-25 `.neq('lease_status','inactive')` else-branch filter (and confirmed it still filters in the live query).
- Added a regression test that feeds a fully-typed `LeaseWithNestedRelations` fixture matching the embed shape into `transformLease` and asserts the real tenant/property/unit values, plus a null-relation case asserting the fallbacks still apply.

## Verified PostgREST embed string

```
*, tenant:primary_tenant_id(id, name, first_name, last_name), unit:units(id, unit_number, bedrooms, bathrooms, square_feet, property:properties(id, name, address_line1))
```

Live check (authenticated owner, `.neq('lease_status','inactive')`, count: exact) returned:
- `tenant` present with `first_name`/`last_name`
- `unit` present with `unit_number`
- `unit.property` present with `name` + `address_line1`
- no `tenants` / `units` legacy keys

## Task Commits

Each task was committed atomically:

1. **Task 1: Expand the leases list embed and align alias keys with transformLease** - `bbb98b4d8` (fix)
2. **Task 2: Regression test for transformLease on the list embed shape** - `fd2fab0b9` (test)

**Plan metadata:** committed with this SUMMARY (docs)

## Files Created/Modified
- `src/hooks/api/query-keys/lease-keys.ts` - Replaced the `leaseQueries.list` select with the aliased fuller embed; kept `{ count: "exact" }`, the status/`.neq` filter branch, unit/tenant eq filters, ordering, and `.range()` unchanged.
- `src/hooks/api/__tests__/use-lease.test.tsx` - Added a `describe("transformLease (LEASE-01 list embed shape)")` block with fully-typed fixtures (no `any` / `as unknown as`): one case asserting real `tenantName`/`propertyName`/`unitNumber`, one asserting the absent-relation fallbacks.

## Decisions Made
- Chose to align the list query to `transformLease` (option A in the locked decision) by aliasing the embed to the singular keys, mirroring the already-correct `detail` query — no changes to `transformLease` or `LeaseWithNestedRelations` were needed (typecheck confirmed the existing types already cover the shape).
- Built full typed fixtures for the regression test rather than casting, so the test compiles under strict mode with zero type assertions.

## Deviations from Plan

None - plan executed exactly as written. `transformLease` and `LeaseWithNestedRelations` required no changes (Task 2's optional widening was not triggered — typecheck passed against the new embed as-is).

## Issues Encountered
- The pre-commit lint hook (Biome lints the whole repo) failed on the temporary live-verification script placed in the project. Resolved by removing the scratch file before committing; the verification result was already captured. No project code was affected.
- The plan's Task 2 verify command used `bun run test:unit -- --run <file>`, which double-injects `--run` (the `test:unit` script already adds it) and errors with a CAC duplicate-flag error. Ran `bun run test:unit -- <file>` instead — all 35 tests pass.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The fuller list embed now carries `unit.property` (name + address_line1), which LEASE-08 (rent-increase notice needs the property address) and LEASE-06 (server-side pagination) can build on.
- No blockers.

## Self-Check: PASSED

- Files exist: `lease-keys.ts`, `use-lease.test.tsx`, `26-01-SUMMARY.md`
- Commits exist: `bbb98b4d8` (fix), `fd2fab0b9` (test)
- Source assertions: `tenant:primary_tenant_id(` present, `property:properties(` present, `.neq("lease_status", "inactive")` preserved

---
*Phase: 26-lease-domain-correctness*
*Completed: 2026-07-04*
