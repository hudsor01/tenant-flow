---
phase: 27-unified-mutation-hook
plan: 01
subsystem: api
tags: [constants, invitation-url, route-constants, tanstack-query]

# Dependency graph
requires:
  - phase: 26-database-stabilization
    provides: Fixed tenant_invitations table with correct RLS and constraints
provides:
  - INVITATION_ACCEPT_PATH constant for canonical accept-invite URL
  - All invitation URL construction uses single constant
  - Zero hardcoded /auth/accept-invitation paths in codebase
affects: [27-unified-mutation-hook-plan-02, 28-consumer-migration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Route path constants in src/lib/constants/routes.ts

key-files:
  created:
    - src/lib/constants/routes.ts
  modified:
    - src/components/tenants/invite-tenant-form.tsx
    - src/components/onboarding/onboarding-step-tenant.tsx
    - src/components/leases/wizard/selection-step-filters.tsx
    - src/hooks/api/query-keys/tenant-invite-mutation-options.ts
    - src/hooks/api/__tests__/use-tenant.test.tsx

key-decisions:
  - "INVITATION_ACCEPT_PATH placed in src/lib/constants/routes.ts following existing constants file pattern"
  - "Test mock URLs use literal strings (not imports) since they are mock data values"

patterns-established:
  - "Route path constants: canonical page paths live in src/lib/constants/routes.ts with as const assertion"

requirements-completed: [INV-05]

# Metrics
duration: 3min
completed: 2026-03-30
---

# Phase 27 Plan 01: Accept URL Constant Summary

**Single INVITATION_ACCEPT_PATH constant replaces 5 hardcoded /auth/accept-invitation URLs across 4 source files and 1 test file**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-30T22:34:01Z
- **Completed:** 2026-03-30T22:37:25Z
- **Tasks:** 1
- **Files modified:** 6

## Accomplishments
- Created INVITATION_ACCEPT_PATH constant at src/lib/constants/routes.ts with value '/accept-invite'
- Fixed 4 source files that used wrong /auth/accept-invitation path to import and use the constant
- Fixed test mock URL to match the correct /accept-invite route
- Zero grep hits for /auth/accept-invitation in src/ after changes
- TypeScript compiles clean and all 20 use-tenant tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Create route constant and fix all wrong accept URLs** - `f5680eab6` (feat)

## Files Created/Modified
- `src/lib/constants/routes.ts` - New file: exports INVITATION_ACCEPT_PATH = '/accept-invite'
- `src/components/tenants/invite-tenant-form.tsx` - Import constant, replace hardcoded path
- `src/components/onboarding/onboarding-step-tenant.tsx` - Import constant, replace hardcoded path
- `src/components/leases/wizard/selection-step-filters.tsx` - Import constant, replace hardcoded path
- `src/hooks/api/query-keys/tenant-invite-mutation-options.ts` - Import constant, replace hardcoded path in invite() factory
- `src/hooks/api/__tests__/use-tenant.test.tsx` - Fix mock URL from /auth/accept-invitation to /accept-invite

## Decisions Made
- INVITATION_ACCEPT_PATH placed in src/lib/constants/routes.ts following the established pattern of other constant files (billing.ts, query-config.ts, etc.)
- Test mock uses literal URL string (not import) since it is mock data, not production code

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- INVITATION_ACCEPT_PATH constant is ready for Plan 02's useCreateInvitation() hook to import
- All existing invitation creation paths now use the correct URL
- The constant matches the actual Next.js route at src/app/(auth)/accept-invite/page.tsx

## Self-Check: PASSED

- FOUND: src/lib/constants/routes.ts
- FOUND: commit f5680eab6
- FOUND: 27-01-SUMMARY.md

---
*Phase: 27-unified-mutation-hook*
*Completed: 2026-03-30*
