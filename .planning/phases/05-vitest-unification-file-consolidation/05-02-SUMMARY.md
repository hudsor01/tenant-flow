---
phase: 05-vitest-unification-file-consolidation
plan: 02
subsystem: testing
tags: [vitest, test-structure, co-location, playwright, file-relocation]

requires:
  - phase: 05-01
    provides: Vitest multi-project config with unit include pattern src/**/*.{test,spec}.{ts,tsx}
provides:
  - All tests co-located in __tests__/ directories adjacent to source modules
  - Pricing Playwright test in tests/e2e/tests/
  - Orphaned tests/unit/ and src/__tests__/ directories deleted
affects: [phase-06, phase-07]

tech-stack:
  added: []
  patterns: [co-located-tests-in-__tests__-dirs, foundation-tests-in-src-test-__tests__]

key-files:
  created: []
  modified:
    - tests/e2e/tests/pricing-premium.spec.ts
    - src/lib/__tests__/auth-redirect.test.ts
    - src/stores/__tests__/data-density.test.ts
    - src/test/__tests__/design-tokens.test.ts
    - src/test/__tests__/responsive-breakpoints.test.ts
    - src/app/(owner)/profile/__tests__/profile-page.test.tsx
  deleted:
    - tests/unit/tsconfig.json
    - tests/unit/playwright/.auth/user.json

key-decisions:
  - "Placed design-tokens.test.ts and responsive-breakpoints.test.ts in src/test/__tests__/ (infrastructure tests with no source import, no src/design-system/ directory exists)"
  - "Placed auth-redirect.test.ts in src/lib/__tests__/ (tests middleware auth behavior, lib houses auth/middleware utilities)"
  - "Placed profile-page.test.tsx in src/app/(owner)/profile/__tests__/ (imports OwnerProfilePage from that directory)"

patterns-established:
  - "Foundation infrastructure tests (CSS tokens, breakpoints) live in src/test/__tests__/"
  - "All unit/component tests co-located in __tests__/ adjacent to source modules they test"

requirements-completed: [INFRA-04, INFRA-05]

duration: 4min
completed: 2026-03-04
---

# Phase 05 Plan 02: Orphaned Test File Relocation Summary

**Relocated 6 orphaned test files to co-located __tests__/ directories and deleted tests/unit/ and src/__tests__/ directories**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-04T06:01:08Z
- **Completed:** 2026-03-04T06:04:55Z
- **Tasks:** 2
- **Files modified:** 8 (6 relocated, 2 deleted)

## Accomplishments
- All 6 orphaned test files relocated to co-located `__tests__/` directories adjacent to their source modules
- `pricing-premium.spec.ts` (Playwright test) moved from `tests/unit/` to `tests/e2e/tests/`
- `tests/unit/` and `src/__tests__/` directories fully deleted
- All 78 test files (919 tests) pass after relocation

## Task Commits

Each task was committed atomically:

1. **Task 1: Relocate all orphaned test files to co-located directories** - `57cf8fe37` (refactor)
2. **Task 2: Delete orphaned directories and stale files** - `2d4c1b4d6` (chore)

## Files Created/Modified
- `tests/e2e/tests/pricing-premium.spec.ts` - Playwright pricing E2E test (from tests/unit/)
- `src/lib/__tests__/auth-redirect.test.ts` - Auth redirect middleware test (from src/__tests__/foundation/)
- `src/stores/__tests__/data-density.test.ts` - Data density preferences store test (from src/__tests__/foundation/)
- `src/test/__tests__/design-tokens.test.ts` - CSS design tokens foundation test (from src/__tests__/foundation/)
- `src/test/__tests__/responsive-breakpoints.test.ts` - Tailwind breakpoints foundation test (from src/__tests__/foundation/)
- `src/app/(owner)/profile/__tests__/profile-page.test.tsx` - Owner profile page test (from src/__tests__/profile/)
- `tests/unit/tsconfig.json` - Deleted (orphaned config)
- `tests/unit/playwright/.auth/user.json` - Deleted (stale auth state)

## Decisions Made
- Placed design-tokens and responsive-breakpoints tests in `src/test/__tests__/` since they are infrastructure foundation tests with no specific source module import and no `src/design-system/` directory exists
- Placed auth-redirect test in `src/lib/__tests__/` since it tests middleware auth behavior and `src/lib/` houses auth/middleware utilities
- Placed profile-page test in `src/app/(owner)/profile/__tests__/` directly adjacent to the OwnerProfilePage component it imports

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All tests are now in canonical locations following the co-located `__tests__/` convention
- Test infrastructure foundation complete for Phase 06 (test data factories) and Phase 07 (component test infrastructure with MSW)
- `src/test/__tests__/` established as the location for infrastructure/foundation tests

## Self-Check: PASSED

- tests/e2e/tests/pricing-premium.spec.ts: FOUND
- src/lib/__tests__/auth-redirect.test.ts: FOUND
- src/stores/__tests__/data-density.test.ts: FOUND
- src/test/__tests__/design-tokens.test.ts: FOUND
- src/test/__tests__/responsive-breakpoints.test.ts: FOUND
- src/app/(owner)/profile/__tests__/profile-page.test.tsx: FOUND
- tests/unit/: VERIFIED DELETED
- src/__tests__/: VERIFIED DELETED
- Commit 57cf8fe37: FOUND
- Commit 2d4c1b4d6: FOUND
- 05-02-SUMMARY.md: FOUND

---
*Phase: 05-vitest-unification-file-consolidation*
*Completed: 2026-03-04*
