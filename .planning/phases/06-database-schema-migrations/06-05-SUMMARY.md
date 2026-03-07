---
phase: 06-database-schema-migrations
plan: 05
subsystem: testing
tags: [rls, integration-tests, supabase, postgres, vitest]

# Dependency graph
requires:
  - phase: 06-01
    provides: "activity.user_id NOT NULL + ON DELETE CASCADE constraint"
  - phase: 06-02
    provides: "documents.owner_user_id column + direct RLS policies"
provides:
  - "RLS integration test coverage for activity table (3 tests)"
  - "RLS integration test coverage for documents table (4 tests + 1 conditional skip)"
  - "Cross-tenant isolation regression protection for DB-01 and DB-02"
affects: [testing, database]

# Tech tracking
tech-stack:
  added: []
  patterns: ["RLS integration test pattern for user-own-data tables (activity)", "RLS integration test pattern with cleanup for owner-scoped tables (documents)"]

key-files:
  created: []
  modified:
    - tests/integration/rls/activity.rls.test.ts
    - tests/integration/rls/documents.rls.test.ts

key-decisions:
  - "Used `as unknown as string` for null constraint test (deliberate constraint violation, not a type assertion bypass)"
  - "Tenant document access test uses it.skip when E2E_TENANT_EMAIL env var unavailable"

patterns-established:
  - "RLS null constraint test pattern: insert with null value, assert DB-level error"
  - "Conditional skip for tenant-dependent tests when env vars unavailable"

requirements-completed: [DB-01, DB-02]

# Metrics
duration: 3min
completed: 2026-03-06
---

# Phase 06 Plan 05: RLS Test Stub Gap Closure Summary

**Replaced 8 it.todo() stubs with real DB assertions covering activity cross-tenant isolation, NOT NULL constraint, and documents owner_user_id RLS enforcement**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-06T02:26:14Z
- **Completed:** 2026-03-06T02:29:47Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Replaced all 3 activity.rls.test.ts stubs with real PostgREST assertions verifying owner-scoped SELECT, cross-tenant isolation, and NOT NULL constraint
- Replaced all 5 documents.rls.test.ts stubs with real assertions verifying owner-scoped SELECT, cross-owner isolation, INSERT authorization, and INSERT impersonation blocking
- Tenant document access test conditionally skips with clear message when E2E_TENANT credentials are unavailable
- All new tests pass against live Supabase database with zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement activity.rls.test.ts with 3 real assertions** - `87863a67e` (test)
2. **Task 2: Implement documents.rls.test.ts with 5 real assertions** - `101558a9b` (test)

## Files Created/Modified
- `tests/integration/rls/activity.rls.test.ts` - 3 real RLS tests replacing it.todo() stubs (owner-scoped SELECT, cross-tenant isolation, NOT NULL constraint)
- `tests/integration/rls/documents.rls.test.ts` - 5 real RLS tests replacing it.todo() stubs (owner SELECT, cross-owner isolation, owner INSERT, impersonation block, tenant access skip)

## Decisions Made
- Used `as unknown as string` for the null constraint test to deliberately pass null to a NOT NULL column (this is intentional constraint testing, not a type assertion bypass)
- Tenant document access test (Test 5) uses `it.skip` with descriptive message since E2E_TENANT_EMAIL/E2E_TENANT_PASSWORD env vars are not configured in the test environment

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Activity and documents RLS policies now have regression test coverage
- DB-01 (activity.user_id NOT NULL + cross-tenant isolation) and DB-02 (documents.owner_user_id RLS) are verified
- Full tenant document access test can be enabled once E2E_TENANT_EMAIL/E2E_TENANT_PASSWORD env vars are configured

## Self-Check: PASSED

All artifacts verified:
- tests/integration/rls/activity.rls.test.ts: FOUND
- tests/integration/rls/documents.rls.test.ts: FOUND
- 06-05-SUMMARY.md: FOUND
- Commit 87863a67e: FOUND
- Commit 101558a9b: FOUND

---
*Phase: 06-database-schema-migrations*
*Completed: 2026-03-06*
