---
phase: 29-edge-function-shared-utilities
plan: 03
subsystem: edge-functions
tags: [shared-utilities, deduplication, auth, cors, supabase-client, refactor]
dependency_graph:
  requires:
    - phase: 29-01
      provides: shared auth, cors, supabase-client modules
  provides:
    - all 11 non-Stripe Edge Functions migrated to shared utilities
  affects: [all-edge-functions]
tech_stack:
  added: []
  patterns: [validateBearerAuth-pattern, createAdminClient-pattern, getJsonHeaders-pattern]
key_files:
  created: []
  modified:
    - supabase/functions/export-report/index.ts
    - supabase/functions/export-user-data/index.ts
    - supabase/functions/generate-pdf/index.ts
    - supabase/functions/docuseal/index.ts
    - supabase/functions/send-tenant-invitation/index.ts
    - supabase/functions/tenant-invitation-accept/index.ts
    - supabase/functions/auth-email-send/index.ts
    - supabase/functions/newsletter-subscribe/index.ts
    - supabase/functions/tenant-invitation-validate/index.ts
    - supabase/functions/trial-drip-email/index.ts
    - supabase/functions/docuseal-webhook/index.ts
decisions:
  - "Sub-pattern B anon-key clients simplified by removing unnecessary global headers option (getUser passes token explicitly)"
  - "SupabaseClient type import added to generate-pdf and docuseal-webhook where createClient was fully replaced but ReturnType was still referenced"
patterns-established:
  - "validateBearerAuth discriminated union: all JWT Edge Functions use 'error' in auth check pattern"
  - "createAdminClient: all service-role client creation goes through shared factory"
  - "getJsonHeaders: all browser-facing JSON responses use shared helper instead of inline spread"
requirements-completed: [EDGE-01, EDGE-02, EDGE-04]
metrics:
  duration: 38m
  completed: "2026-04-03"
  tasks_completed: 2
  tasks_total: 2
  files_created: 0
  files_modified: 11
---

# Phase 29 Plan 03: Non-Stripe Edge Function Consumer Migration Summary

**11 non-Stripe Edge Functions migrated to shared auth, client, and header utilities with zero behavioral changes**

## Performance

- **Duration:** 38 min
- **Started:** 2026-04-03T20:31:12Z
- **Completed:** 2026-04-03T21:09:00Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Migrated 6 JWT-authenticated Edge Functions to validateBearerAuth, createAdminClient, and getJsonHeaders
- Migrated 5 non-JWT Edge Functions to getJsonHeaders and/or createAdminClient where applicable
- Zero inline auth extraction patterns remain in non-Stripe functions
- All browser-facing JSON response headers now use the shared getJsonHeaders helper

## Task Commits

Each task was committed atomically:

1. **Task 1: Update 6 JWT-authenticated non-Stripe Edge Functions** - `97cc661a5` (refactor)
2. **Task 2: Update 5 non-JWT non-Stripe Edge Functions** - `a5fdf2cb0` (refactor)

## Files Modified
- `supabase/functions/export-report/index.ts` - Replaced inline auth + createClient with shared modules
- `supabase/functions/export-user-data/index.ts` - Replaced inline auth, simplified anon-key client, added createAdminClient
- `supabase/functions/generate-pdf/index.ts` - Replaced inline auth + createClient, all JSON headers use getJsonHeaders
- `supabase/functions/docuseal/index.ts` - Replaced inline auth + createClient, 20+ JSON header instances replaced
- `supabase/functions/send-tenant-invitation/index.ts` - Replaced inline auth, simplified anon-key client
- `supabase/functions/tenant-invitation-accept/index.ts` - Replaced inline auth, simplified anon-key client
- `supabase/functions/auth-email-send/index.ts` - Replaced corsHeaders/jsonHeaders pattern with getJsonHeaders
- `supabase/functions/newsletter-subscribe/index.ts` - 3 JSON header instances replaced with getJsonHeaders
- `supabase/functions/tenant-invitation-validate/index.ts` - Replaced createClient with createAdminClient, JSON headers
- `supabase/functions/trial-drip-email/index.ts` - Replaced JSR createClient import with createAdminClient
- `supabase/functions/docuseal-webhook/index.ts` - Replaced createClient with createAdminClient

## Decisions Made

1. **Sub-pattern B simplified**: Removed `global: { headers: { Authorization } }` from anon-key clients in send-tenant-invitation, export-user-data, and tenant-invitation-accept. The option was unnecessary since `getUser(token)` passes the token explicitly regardless of client auth header.
2. **SupabaseClient type import**: Added `import type { SupabaseClient }` to generate-pdf and docuseal-webhook where `createClient` was fully replaced but handler functions still referenced `ReturnType<typeof createClient>`.
3. **Server-to-server headers unchanged**: trial-drip-email and docuseal-webhook keep plain `{ 'Content-Type': 'application/json' }` without CORS since they are not browser-facing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added SupabaseClient type import for ReturnType references**
- **Found during:** Task 1 (generate-pdf) and Task 2 (docuseal-webhook)
- **Issue:** Removing `import { createClient }` broke `ReturnType<typeof createClient>` in helper function signatures
- **Fix:** Added `import type { SupabaseClient }` and replaced `ReturnType<typeof createClient>` with `SupabaseClient`
- **Files modified:** supabase/functions/generate-pdf/index.ts, supabase/functions/docuseal-webhook/index.ts
- **Committed in:** 97cc661a5 (Task 1), a5fdf2cb0 (Task 2)

**2. [Rule 1 - Bug] Reconstructed Authorization header for generate-pdf delegation in export-report**
- **Found during:** Task 1 (export-report)
- **Issue:** After removing `authHeader` variable, the PDF delegation fetch call still referenced it
- **Fix:** Used `token` from validateBearerAuth result to reconstruct `Authorization: Bearer ${token}`
- **Files modified:** supabase/functions/export-report/index.ts
- **Committed in:** 97cc661a5 (Task 1)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes were necessary for the code to compile and function correctly. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all changes are pure refactoring of existing production code.

## Next Phase Readiness
- All 11 non-Stripe Edge Functions now use shared utilities from Plan 01
- Plan 02 (Stripe consumer migration) handles the remaining 8 Stripe-related functions
- Phase 29 consumer migration complete across all non-Stripe functions

---
*Phase: 29-edge-function-shared-utilities*
*Completed: 2026-04-03*

## Self-Check: PASSED
