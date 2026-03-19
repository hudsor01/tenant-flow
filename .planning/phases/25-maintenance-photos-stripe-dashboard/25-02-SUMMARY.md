---
phase: 25-maintenance-photos-stripe-dashboard
plan: 02
subsystem: payments
tags: [stripe, stripe-connect, edge-functions, react, mutation]

# Dependency graph
requires:
  - phase: 25-maintenance-photos-stripe-dashboard
    provides: stripe-connect Edge Function with action-based routing
provides:
  - Stripe Express Dashboard login link via Edge Function
  - useStripeDashboardLink mutation hook
  - Open Dashboard button in connect-account-status component
affects: [settings, stripe-connect]

# Tech tracking
tech-stack:
  added: []
  patterns: [stripe.accounts.createLoginLink for Express Dashboard access]

key-files:
  created: []
  modified:
    - supabase/functions/stripe-connect/index.ts
    - src/hooks/api/use-stripe-connect.ts
    - src/hooks/api/mutation-keys.ts
    - src/components/connect/connect-account-status.tsx
    - src/app/(owner)/settings/__tests__/settings-page.test.tsx

key-decisions:
  - "Reuse existing stripe-connect Edge Function with login-link action (no new function)"
  - "window.open in mutation onSuccess for new-tab dashboard access"

patterns-established:
  - "Stripe login link pattern: createLoginLink returns short-lived URL, opened in new tab"

requirements-completed: [STRIPE-01]

# Metrics
duration: 19min
completed: 2026-03-18
---

# Phase 25 Plan 02: Stripe Express Dashboard Access Summary

**Stripe Express Dashboard login link via Edge Function action, mutation hook, and conditional Open Dashboard button**

## Performance

- **Duration:** 19 min
- **Started:** 2026-03-18T18:48:08Z
- **Completed:** 2026-03-18T19:07:02Z
- **Tasks:** 1
- **Files modified:** 5

## Accomplishments
- Added login-link action to stripe-connect Edge Function using stripe.accounts.createLoginLink()
- Created useStripeDashboardLink mutation hook that opens Stripe Dashboard in new tab
- Wired Open Dashboard button (visible only when charges_enabled is true) with loading state
- Replaced stub toast placeholder with real functionality

## Task Commits

Each task was committed atomically:

1. **Task 1: Add login-link action to stripe-connect Edge Function + frontend hook and button** - `ac20f9838` (feat)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `supabase/functions/stripe-connect/index.ts` - Added login-link action handler with createLoginLink and errorResponse
- `src/hooks/api/use-stripe-connect.ts` - Added dashboardLink mutation factory and useStripeDashboardLink hook
- `src/hooks/api/mutation-keys.ts` - Added dashboardLink mutation key
- `src/components/connect/connect-account-status.tsx` - Replaced stub with real mutation, removed unused useState
- `src/app/(owner)/settings/__tests__/settings-page.test.tsx` - Added useStripeDashboardLink mock

## Decisions Made
- Reused existing stripe-connect Edge Function with new login-link action (no separate function)
- Used window.open in mutation onSuccess callback for new-tab behavior
- Used handleMutationError for error handling (consistent with other mutations)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed settings-page test mock missing new hook**
- **Found during:** Task 1
- **Issue:** settings-page.test.tsx mocked use-stripe-connect but didn't include useStripeDashboardLink, causing 3 test failures
- **Fix:** Added useStripeDashboardLink mock to the vi.mock block
- **Files modified:** src/app/(owner)/settings/__tests__/settings-page.test.tsx
- **Verification:** All 1453 unit tests pass
- **Committed in:** ac20f9838 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Test mock fix required for correctness. No scope creep.

## Issues Encountered
- supabase.ts type file was corrupted in working tree (unrelated to changes) -- restored from HEAD before committing

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Stripe Dashboard access complete -- owners with fully onboarded accounts can access Express Dashboard
- Phase 25 complete (both plans done)

---
*Phase: 25-maintenance-photos-stripe-dashboard*
*Completed: 2026-03-18*
