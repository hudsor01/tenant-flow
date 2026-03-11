---
phase: 21-email-invitations
plan: 02
subsystem: ui
tags: [frontend-integration, edge-functions, mutations, email, tanstack-query]

# Dependency graph
requires:
  - phase: 21-email-invitations
    provides: send-tenant-invitation Edge Function (POST /functions/v1/send-tenant-invitation)
provides:
  - All 4 frontend invitation paths wired to send real emails via Edge Function
  - Resend mutation also triggers email delivery
  - Non-fatal email pattern (DB record preserved if email fails)
affects: [tenant-invitations, onboarding, lease-wizard]

# Tech tracking
tech-stack:
  added: []
  patterns: [non-fatal-email-send-after-db-insert]

key-files:
  created: []
  modified:
    - src/hooks/api/query-keys/tenant-invite-mutation-options.ts
    - src/hooks/api/use-tenant-invite-mutations.ts
    - src/hooks/api/__tests__/use-tenant.test.tsx
    - src/components/tenants/invite-tenant-form.tsx
    - src/components/leases/wizard/selection-step-filters.tsx
    - src/components/onboarding/onboarding-step-tenant.tsx

key-decisions:
  - "getSession() used for access_token extraction (acceptable per CLAUDE.md -- reading token string, not making auth decision)"
  - "Email send is fire-and-catch with console.error logging -- invitation DB record always preserved"
  - "sendInvitationEmail helper centralized in mutation-options file, inline pattern used in 3 component files"

patterns-established:
  - "Non-fatal Edge Function call after DB write: await fetch(...).catch(err => console.error(...))"

requirements-completed: [EMAIL-01, EMAIL-02]

# Metrics
duration: 6min
completed: 2026-03-11
---

# Phase 21 Plan 02: Frontend Integration Summary

**All 4 invitation creation paths and resend mutation wired to send-tenant-invitation Edge Function with non-fatal email delivery**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-11T20:11:39Z
- **Completed:** 2026-03-11T20:18:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Centralized invite and resend mutations in `tenant-invite-mutation-options.ts` now call the `send-tenant-invitation` Edge Function after DB writes
- Three inline invitation forms (invite-tenant-form, lease wizard, onboarding) updated to return invitation ID and call the Edge Function
- All email sends are non-fatal -- DB record is always preserved even if email delivery fails
- Phase 55 TODO references eliminated from codebase
- Tests updated with fetch mock and getSession mock to prevent real network calls

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire centralized mutation options** - `f48359d18` (feat)
2. **Task 2: Wire inline invitation forms** - `b961d7430` (feat)

## Files Created/Modified
- `src/hooks/api/query-keys/tenant-invite-mutation-options.ts` - Added `sendInvitationEmail` helper, wired into invite() and resend() mutations
- `src/hooks/api/use-tenant-invite-mutations.ts` - Removed Phase 55 TODO, updated JSDoc
- `src/hooks/api/__tests__/use-tenant.test.tsx` - Added mockFetch via vi.hoisted(), getSession mock, Edge Function call assertions
- `src/components/tenants/invite-tenant-form.tsx` - Added `.select('id').single()` to insert, Edge Function call after
- `src/components/leases/wizard/selection-step-filters.tsx` - Added `.select('id').single()` to insert, Edge Function call after
- `src/components/onboarding/onboarding-step-tenant.tsx` - Added `.select('id').single()` to insert, Edge Function call after

## Decisions Made
- Used `getSession()` for access_token extraction -- acceptable per CLAUDE.md since we are reading the token string to pass as Bearer header, not making an auth decision
- Email send failures are caught with `.catch()` and logged to console.error rather than surfaced to the user, matching the plan's "non-fatal" requirement
- The `sendInvitationEmail` helper is defined once in the centralized mutation options file; the 3 inline component forms use an inline version of the same pattern since they have their own `useMutation` calls

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - the send-tenant-invitation Edge Function was created and deployed in Plan 01. No additional configuration needed.

## Next Phase Readiness
- Phase 21 (Email Invitations) is now complete -- both the Edge Function (Plan 01) and frontend wiring (Plan 02) are done
- All invitation paths send real emails via Resend
- Ready to proceed to Phase 22 (GDPR)

---
*Phase: 21-email-invitations*
*Completed: 2026-03-11*
