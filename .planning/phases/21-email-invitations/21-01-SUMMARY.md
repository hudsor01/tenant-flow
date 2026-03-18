---
phase: 21-email-invitations
plan: 01
subsystem: api
tags: [edge-functions, resend, email, deno, xss-escaping]

# Dependency graph
requires:
  - phase: existing
    provides: Resend email infrastructure (_shared/resend.ts), branded template system (_shared/auth-email-templates.ts), CORS/env/error utilities
provides:
  - send-tenant-invitation Edge Function that sends branded email via Resend
  - tenantInvitationEmail template with accept URL, owner name, property/unit info
  - Deno integration tests for the Edge Function
affects: [21-02 frontend-integration, tenant-invitations]

# Tech tracking
tech-stack:
  added: []
  patterns: [authenticated-edge-function-with-owner-authorization]

key-files:
  created:
    - supabase/functions/send-tenant-invitation/index.ts
    - supabase/functions/tests/send-tenant-invitation-test.ts
  modified:
    - supabase/functions/_shared/auth-email-templates.ts

key-decisions:
  - "No rate limiting on send-tenant-invitation -- authenticated endpoint (JWT required), only unauthenticated endpoints need IP-based rate limiting"
  - "tenantInvitationEmail is distinct from invitationEmail -- former is for property owner tenant invites, latter is for Supabase Auth invites"

patterns-established:
  - "Authenticated Edge Function with owner authorization: JWT auth guard + owner_user_id check before business logic"

requirements-completed: [EMAIL-01, EMAIL-02]

# Metrics
duration: 4min
completed: 2026-03-11
---

# Phase 21 Plan 01: Send Tenant Invitation Summary

**Edge Function sends branded invitation email via Resend with JWT auth, owner authorization, and XSS-safe HTML template**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-11T20:04:08Z
- **Completed:** 2026-03-11T20:08:33Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- New `tenantInvitationEmail` template added to shared email templates with XSS-escaped owner name, tenant email, optional property/unit info, and 7-day expiry notice
- `send-tenant-invitation` Edge Function with full security: JWT auth guard, owner authorization check, invitation status validation (rejects accepted/cancelled/expired), and Resend email delivery with category tags
- Deno integration test suite covering CORS, method rejection, auth, validation, authorization, and response format (16 test cases)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add tenantInvitationEmail template** - `fa6966609` (feat)
2. **Task 2 RED: Add failing tests** - `882f06e03` (test)
3. **Task 2 GREEN: Implement Edge Function** - `3ab27430d` (feat)

## Files Created/Modified
- `supabase/functions/_shared/auth-email-templates.ts` - Added `tenantInvitationEmail()` export with branded layout, accept URL CTA, conditional property/unit display
- `supabase/functions/send-tenant-invitation/index.ts` - Edge Function: POST { invitation_id } with Bearer JWT, sends branded email via Resend
- `supabase/functions/tests/send-tenant-invitation-test.ts` - Deno integration tests: CORS, 405, 401, 400, 403/404, response format, success documentation

## Decisions Made
- No rate limiting needed: endpoint requires JWT authentication (only unauthenticated endpoints get IP-based rate limiting per CLAUDE.md conventions)
- Named the new template `tenantInvitationEmail` to clearly distinguish from the existing `invitationEmail` (Supabase Auth invite flow)
- Owner name fallback set to "Your property manager" when full_name is not available on the owner record

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. The Edge Function uses existing `RESEND_API_KEY` and Supabase env vars that are already configured.

## Next Phase Readiness
- Edge Function is ready for deployment via `supabase functions deploy send-tenant-invitation`
- Plan 21-02 (frontend integration) can now wire the invite form to call this Edge Function instead of the current stub toast
- All shared utilities (CORS, env, errors, Resend) already proven in production

---
*Phase: 21-email-invitations*
*Completed: 2026-03-11*
