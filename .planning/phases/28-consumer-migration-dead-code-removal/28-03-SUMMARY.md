---
phase: 28-consumer-migration-dead-code-removal
plan: 03
subsystem: auth
tags: [supabase-auth, session, redirect, invitation, accept-invite]

requires:
  - phase: 21-email-invitations
    provides: tenant invitation accept flow and Edge Function

provides:
  - Session-aware accept-invite page with logged-in one-click accept
  - Login redirect link preserving invitation code through auth flow

affects: [tenant-portal, auth, invitations]

tech-stack:
  added: []
  patterns:
    - "Session detection via getUser() on page mount with conditional UI branching"
    - "Login redirect with encodeURIComponent for multi-param URL preservation"

key-files:
  created:
    - src/app/(auth)/accept-invite/__tests__/accept-invite-session.test.tsx
  modified:
    - src/app/(auth)/accept-invite/page.tsx
    - src/components/auth/accept-invite/invite-signup-form.tsx

key-decisions:
  - "Reused existing acceptInvitation() function for logged-in flow -- no duplication"
  - "Used getUser() for session detection per CLAUDE.md security requirement"
  - "Passed invitation code via explicit code prop rather than re-reading searchParams"

patterns-established:
  - "Session-aware page rendering: check getUser() on mount, branch UI by auth state"

requirements-completed: [UI-07]

duration: 5min
completed: 2026-03-30
---

# Phase 28 Plan 03: Accept-Invite Session-Aware Flow Summary

**Session-aware accept-invite page routing logged-in users to one-click accept button with login redirect link preserving invitation code**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-31T02:22:32Z
- **Completed:** 2026-03-31T02:27:11Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Logged-in users visiting /accept-invite see a one-click "Accept Invitation" button with their email displayed
- Not-logged-in users see signup form with "Log in to accept" link that redirects back after login
- Login redirect encodes the full /accept-invite?code=XXX URL so the invitation code survives the login flow
- Test stub validates expected patterns in both page and form source files

## Task Commits

Each task was committed atomically:

1. **Task 1: Add session check to accept-invite page with conditional logged-in accept flow** - `8b9caa3fa` (feat)
2. **Task 2: Add "Log in to accept" link with encoded redirect below signup form** - `e0a7dbefe` (feat)

## Files Created/Modified
- `src/app/(auth)/accept-invite/page.tsx` - Added session detection, logged-in accept UI, handleLoggedInAccept handler
- `src/components/auth/accept-invite/invite-signup-form.tsx` - Added code prop, updated link to "Log in to accept" with encoded redirect
- `src/app/(auth)/accept-invite/__tests__/accept-invite-session.test.tsx` - Source pattern validation tests for session handling

## Decisions Made
- Reused existing acceptInvitation() function for the logged-in accept flow rather than creating a separate handler -- avoids code duplication and keeps the Edge Function call in one place
- Used getUser() (not getSession()) for session detection per CLAUDE.md security requirement
- Passed invitation code as explicit prop to InviteSignupForm rather than having the child re-read searchParams

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed duplicate setAccepted(true) call**
- **Found during:** Task 1 (session-aware accept flow)
- **Issue:** handleLoggedInAccept called setAccepted(true) after acceptInvitation(), but acceptInvitation() already sets accepted=true internally
- **Fix:** Removed the redundant setAccepted(true) from handleLoggedInAccept
- **Files modified:** src/app/(auth)/accept-invite/page.tsx
- **Verification:** Code review confirmed acceptInvitation() handles the state transition
- **Committed in:** 8b9caa3fa (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor correctness fix, no scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Accept-invite page now handles both logged-in and not-logged-in users
- Login page already supports redirect parameter -- no changes needed there
- Ready for any additional invitation flow improvements

## Self-Check: PASSED

- All 3 source files exist
- Both task commits verified (8b9caa3fa, e0a7dbefe)
- SUMMARY.md created

---
*Phase: 28-consumer-migration-dead-code-removal*
*Completed: 2026-03-30*
