---
phase: 09-testing-ci-pipeline
plan: 03
subsystem: testing
tags: [playwright, e2e, config, env-template]

requires:
  - phase: none
    provides: standalone plan
provides:
  - Fixed Playwright configs with correct flat layout paths
  - .env.test.example template for E2E test environment setup
  - Trimmed E2E suite from 55 files to 17 critical user journeys
  - _archived/ directory with 39 recoverable test files
affects: [09-testing-ci-pipeline, ci-cd]

tech-stack:
  added: []
  patterns:
    - "_archived/ directory for preserving non-critical E2E tests"
    - "testIgnore pattern for _archived/ in playwright.config.ts"

key-files:
  created:
    - tests/e2e/.env.test.example
    - tests/e2e/tests/_archived/ (39 archived test files)
  modified:
    - tests/e2e/playwright.config.ts
    - tests/e2e/playwright.config.prod.ts
    - .gitignore

key-decisions:
  - "Task 1 already completed by prior plan 09-02 (commit 8edf5379c) -- verified requirements met, no duplicate work"
  - "Kept owner-financials and owner-settings as critical journeys (unique page coverage not duplicated by other tests)"
  - "17 active tests in target range of 15-20 per plan spec"

patterns-established:
  - "E2E archive pattern: move non-critical tests to _archived/ rather than hard delete"

requirements-completed: [TEST-03, TEST-20, TEST-21]

duration: 14min
completed: 2026-03-06
---

# Phase 9 Plan 03: E2E Config Fix and Suite Trim Summary

**Fixed stale monorepo references in Playwright configs, created .env.test.example, and trimmed E2E suite from 55 to 17 critical user journey tests**

## Performance

- **Duration:** 14 min
- **Started:** 2026-03-06T22:23:34Z
- **Completed:** 2026-03-06T22:37:34Z
- **Tasks:** 2
- **Files modified:** 44 (3 config/template + 39 archived + 2 updated)

## Accomplishments
- Verified Playwright configs have no stale monorepo paths (fixed by prior plan 09-02)
- Created .env.test.example with all necessary E2E environment variable placeholders
- Trimmed E2E suite from 55 files to 17 critical tests, archiving 39 non-critical files
- Added _archived/ to testIgnore in playwright.config.ts

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix Playwright configs and create .env.test.example** - `8edf5379c` (already completed by plan 09-02)
2. **Task 2: Audit and trim E2E test suite** - `f59ac718a` (chore: archive 39 E2E files)

## Files Created/Modified
- `tests/e2e/playwright.config.ts` - Removed `cd apps/frontend` from webServer, added `_archived/` to testIgnore
- `tests/e2e/playwright.config.prod.ts` - Replaced stale `pnpm --filter @repo/e2e-tests` with `npx playwright test`
- `tests/e2e/.env.test.example` - New template with Supabase, test user, and app URL placeholders
- `.gitignore` - Whitelisted `.env.test.example` for commit
- `tests/e2e/tests/_archived/` - 39 archived E2E test files preserved for recovery

### Active E2E Tests (17)
| Category | Files | Tests |
|----------|-------|-------|
| Smoke | critical-paths.smoke, minimal.smoke | 2 |
| Owner | authentication, dashboard, properties, leases, tenants, maintenance, navigation, financials, settings | 9 |
| Tenant | authentication, dashboard, payments, maintenance | 4 |
| Public | homepage, health-check | 2 |

### Archived E2E Tests (39)
- 5 duplicate auth tests (auth-guard, jwt-validation, nextjs16-*)
- 4 owner secondary (analytics, reports, subscription, connect-onboarding)
- 5 tenant secondary (documents, lease, navigation, profile, settings)
- 3 tanstack-query implementation details
- 3 tenant-management duplicates
- 2 Stripe mock tests
- 2 properties fragile tests (bulk-import, image-upload)
- 2 production monitoring
- 1 production-flow (tenant-complete-journey)
- 12 misc (performance, pricing, visual regression, seed, staging, examples, etc.)

## Decisions Made
- Task 1 was already completed by plan 09-02 (commit 8edf5379c) -- all config fixes and .env.test.example creation were done in that prior plan. Verified all requirements met, no duplicate work performed.
- Kept owner-financials and owner-settings as critical user journeys -- they test unique page paths (4 financial pages, settings with profile/security/billing tabs) not covered by other owner tests.
- Archived rather than deleted per plan spec -- tests are recoverable from `_archived/` if needed later.
- 17 active tests falls within the 15-20 target range specified by the plan.

## Deviations from Plan

None - plan executed exactly as written. Task 1 work was already completed by a prior plan, so verification was performed instead of duplicate implementation.

## Issues Encountered
- Pre-commit hook failures caused by pre-existing lint errors in `src/shared/validation/__tests__/common.test.ts` (unused imports) and TypeScript cache staleness. These were out-of-scope pre-existing issues that required multiple commit attempts before the cache cleared.
- The E2E archive commit (`f59ac718a`) was bundled with unrelated files from another plan by the pre-commit hook's auto-staging behavior. The E2E rename work is correctly captured in that commit.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- E2E suite is focused on 17 critical user journeys, ready for CI integration
- Playwright configs point to correct flat layout paths
- .env.test.example provides clear setup guidance for E2E test environments

## Self-Check: PASSED

- All files exist: playwright.config.ts, playwright.config.prod.ts, .env.test.example, _archived/
- All commits exist: 8edf5379c (Task 1 via 09-02), f59ac718a (Task 2)
- No stale `cd apps/frontend` in playwright.config.ts
- No stale `@repo/e2e-tests` in playwright.config.prod.ts
- Active E2E test count: 17 (within 15-20 target)

---
*Phase: 09-testing-ci-pipeline*
*Completed: 2026-03-06*
