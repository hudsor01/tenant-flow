---
phase: 29-edge-function-shared-utilities
plan: 02
subsystem: edge-functions
tags: [stripe, deduplication, shared-utilities, edge-functions, refactoring]
dependency_graph:
  requires:
    - phase: 29-01
      provides: shared-auth, shared-cors-json-headers, shared-stripe-client, shared-supabase-client, shared-webhook-errors
  provides:
    - All 9 Stripe Edge Functions using shared utility modules
    - Zero inline Stripe constructors across codebase
    - Consistent auth validation pattern across JWT-authenticated functions
  affects: [29-03, edge-function-testing]
tech_stack:
  added: []
  patterns: [shared-utility-consumption, discriminated-union-auth-check]
key_files:
  created: []
  modified:
    - supabase/functions/stripe-checkout/index.ts
    - supabase/functions/stripe-billing-portal/index.ts
    - supabase/functions/stripe-connect/index.ts
    - supabase/functions/stripe-rent-checkout/index.ts
    - supabase/functions/detach-payment-method/index.ts
    - supabase/functions/stripe-autopay-charge/index.ts
    - supabase/functions/stripe-checkout-session/index.ts
    - supabase/functions/stripe-webhooks/index.ts
    - supabase/functions/stripe-webhooks/handlers/payment-intent-succeeded.ts
key-decisions:
  - "detach-payment-method retains createClient import for user-scoped client with custom headers (createAdminClient does not support options parameter)"
  - "stripe-webhooks/index.ts keeps import Stripe from stripe for Stripe.Event type annotation"
  - "stripe-autopay-charge SupabaseClient type alias updated to reference createAdminClient instead of removed createClient import"
patterns-established:
  - "validateBearerAuth discriminated union check: if ('error' in auth) for consistent error handling"
  - "getJsonHeaders(req) replaces all inline JSON+CORS header composition in browser-facing functions"
requirements-completed: [EDGE-01, EDGE-02, EDGE-03, EDGE-04, EDGE-06]
metrics:
  duration: 37m
  completed: "2026-04-03"
  tasks_completed: 2
  tasks_total: 2
  files_created: 0
  files_modified: 9
---

# Phase 29 Plan 02: Migrate Stripe Edge Functions to Shared Utilities Summary

**9 Stripe-related Edge Functions migrated to shared utility imports -- zero inline Stripe constructors, zero inline auth patterns, consistent JSON header composition across all browser-facing functions**

## Performance

- **Duration:** 37 min
- **Started:** 2026-04-03T20:31:36Z
- **Completed:** 2026-04-03T21:08:36Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- All 9 Stripe-related Edge Functions now use shared utility modules from Plan 01
- Zero `new Stripe()` constructors remain in any Edge Function (only in _shared/stripe-client.ts)
- 5 JWT-authenticated functions use `validateBearerAuth()` with discriminated union error handling
- All browser-facing functions use `getJsonHeaders(req)` instead of inline header composition
- `captureWebhookError()` replaces local `captureError()` in payment-intent-succeeded handler

## Task Commits

Each task was committed atomically:

1. **Task 1: Update 5 JWT-authenticated Stripe Edge Functions** - `188ff6f4e` (refactor)
2. **Task 2: Update 4 non-JWT Stripe Edge Functions and webhook handler** - `6b2f0762e` (refactor)

## Files Modified
- `supabase/functions/stripe-checkout/index.ts` - Added validateBearerAuth, getStripeClient, createAdminClient, getJsonHeaders
- `supabase/functions/stripe-billing-portal/index.ts` - Same pattern as stripe-checkout
- `supabase/functions/stripe-connect/index.ts` - Same pattern; 16 inline header objects replaced with getJsonHeaders(req)
- `supabase/functions/stripe-rent-checkout/index.ts` - Same pattern; corsHeaders+jsonHeaders two-liner replaced
- `supabase/functions/detach-payment-method/index.ts` - Retains createClient for user-scoped client; admin client uses createAdminClient
- `supabase/functions/stripe-autopay-charge/index.ts` - getStripeClient + createAdminClient only (no JWT auth, no CORS)
- `supabase/functions/stripe-checkout-session/index.ts` - getStripeClient + getJsonHeaders only (no auth, no Supabase)
- `supabase/functions/stripe-webhooks/index.ts` - getStripeClient + createAdminClient (webhook signature auth unchanged)
- `supabase/functions/stripe-webhooks/handlers/payment-intent-succeeded.ts` - captureWebhookError replaces local captureError

## Decisions Made
1. **detach-payment-method keeps createClient**: The user-scoped client passes `{ global: { headers: { Authorization } } }` which createAdminClient does not support. Both createClient (user-scoped) and createAdminClient (admin) coexist in this file.
2. **stripe-webhooks keeps Stripe type import**: `Stripe.Event` type annotation requires the Stripe import alongside getStripeClient.
3. **stripe-autopay-charge type alias updated**: `SupabaseClient` type alias changed from `ReturnType<typeof createClient>` to `ReturnType<typeof createAdminClient>` since createClient is no longer imported.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed SupabaseClient type alias in stripe-autopay-charge**
- **Found during:** Task 2
- **Issue:** Removing `import { createClient } from '@supabase/supabase-js'` broke the `type SupabaseClient = ReturnType<typeof createClient>` alias at the bottom of the file
- **Fix:** Changed to `type SupabaseClient = ReturnType<typeof createAdminClient>` which produces the same type
- **Files modified:** supabase/functions/stripe-autopay-charge/index.ts
- **Committed in:** 6b2f0762e

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Type alias fix was necessary to avoid compilation error. No scope creep.

## Known Stubs

None -- all changes are mechanical refactors replacing inline code with shared module imports.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 03 (non-Stripe Edge Functions) can proceed -- shared utilities are proven across all 9 Stripe functions
- All shared utility modules are stable and tested by consumption in this plan

## Self-Check: PASSED

- All 9 modified files exist on disk
- Both task commits (188ff6f4e, 6b2f0762e) found in git log
- Zero `new Stripe(` outside _shared/stripe-client.ts
- Zero `function captureError` in stripe-webhooks/

---
*Phase: 29-edge-function-shared-utilities*
*Completed: 2026-04-03*
