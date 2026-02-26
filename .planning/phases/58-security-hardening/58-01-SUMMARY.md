---
phase: 58-security-hardening
plan: 01
subsystem: infra
tags: [stripe, cors, deno, supabase, edge-functions, security]

# Dependency graph
requires: []
provides:
  - "Shared CORS helper (_shared/cors.ts) for origin-restricted CORS across all browser-facing Edge Functions"
  - "Shared deno.json import map with pinned @supabase/supabase-js@2.49.4 and stripe@14.25.0"
  - "Fixed notification_type CHECK constraint compliance in stripe-webhooks"
affects: [59-payment-checkout, 60-payment-processing, 61-tenant-onboarding]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared CORS helper pattern: browser-facing functions import getCorsHeaders/handleCorsOptions from _shared/cors.ts"
    - "Webhook functions have zero CORS headers (server-to-server only)"
    - "Bare import specifiers via deno.json import map instead of URL imports"

key-files:
  created:
    - "supabase/functions/_shared/cors.ts"
    - "supabase/functions/deno.json"
  modified:
    - "supabase/functions/stripe-webhooks/index.ts"
    - "supabase/functions/docuseal-webhook/index.ts"
    - "supabase/functions/docuseal/index.ts"
    - "supabase/functions/generate-pdf/index.ts"
    - "supabase/functions/export-report/index.ts"
    - "supabase/functions/stripe-connect/index.ts"
    - "supabase/functions/stripe-billing-portal/index.ts"
    - "supabase/functions/stripe-checkout/index.ts"
    - "supabase/functions/stripe-checkout-session/index.ts"
    - "supabase/functions/tenant-invitation-validate/index.ts"
    - "supabase/functions/tenant-invitation-accept/index.ts"

key-decisions:
  - "Map notification_type values to existing CHECK constraint values instead of creating a migration"
  - "Pin @supabase/supabase-js@2.49.4 and stripe@14.25.0 as exact versions in deno.json"
  - "Fail-open CORS when FRONTEND_URL is not set to avoid breaking functions during config gap"

patterns-established:
  - "Shared CORS: browser-facing Edge Functions import getCorsHeaders(req) and handleCorsOptions(req) from ../_shared/cors.ts"
  - "Webhook isolation: webhook-only functions (stripe-webhooks, docuseal-webhook) never include CORS headers"
  - "Import map: all Edge Functions use bare specifiers resolved via supabase/functions/deno.json"

requirements-completed: [SEC-04, SEC-07, SEC-08]

# Metrics
duration: 18min
completed: 2026-02-26
---

# Phase 58 Plan 01: Edge Function Security Hardening Summary

**Fixed Stripe webhook CHECK constraint violation, restricted CORS to FRONTEND_URL origin via shared helper, pinned all Edge Function dependencies via deno.json import map**

## Performance

- **Duration:** 18 min
- **Started:** 2026-02-26T07:54:09Z
- **Completed:** 2026-02-26T08:12:38Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Fixed notification_type CHECK constraint violations in stripe-webhooks that caused Stripe retry loops (SEC-04)
- Created shared CORS helper restricting cross-origin access to configured FRONTEND_URL only (SEC-07)
- Created deno.json import map pinning @supabase/supabase-js@2.49.4 and stripe@14.25.0 (SEC-08)
- Updated all 11 Edge Functions: 9 browser-facing use shared CORS, 2 webhook-only have zero CORS

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix notification_type values, create CORS helper and deno.json import map** - `6330df578` (feat)
2. **Task 2: Update all 11 Edge Functions to use shared CORS helper and bare import specifiers** - `8d7d5d9c2` (feat)

## Files Created/Modified
- `supabase/functions/_shared/cors.ts` - Shared CORS helper with getCorsHeaders and handleCorsOptions
- `supabase/functions/deno.json` - Import map with pinned dependency versions
- `supabase/functions/stripe-webhooks/index.ts` - Fixed notification_type values, removed CORS, bare imports
- `supabase/functions/docuseal-webhook/index.ts` - Removed CORS entirely, bare imports
- `supabase/functions/docuseal/index.ts` - Shared CORS helper, bare imports
- `supabase/functions/generate-pdf/index.ts` - Shared CORS helper, bare imports
- `supabase/functions/export-report/index.ts` - Shared CORS helper, bare imports
- `supabase/functions/stripe-connect/index.ts` - Shared CORS helper, bare imports
- `supabase/functions/stripe-billing-portal/index.ts` - Shared CORS helper, bare imports
- `supabase/functions/stripe-checkout/index.ts` - Shared CORS helper, bare imports
- `supabase/functions/stripe-checkout-session/index.ts` - Shared CORS helper, bare imports
- `supabase/functions/tenant-invitation-validate/index.ts` - Shared CORS helper, bare imports
- `supabase/functions/tenant-invitation-accept/index.ts` - Shared CORS helper, bare imports

## Decisions Made
- Mapped notification_type 'stripe_connect_verified' to 'system' and 'payment_failed' to 'payment' to comply with the existing CHECK constraint -- no migration needed since title/message fields already carry the specific context
- Pinned @supabase/supabase-js at 2.49.4 and stripe at 14.25.0 (latest stable within their major versions)
- CORS helper returns empty headers (fail-open) when FRONTEND_URL is not configured, to avoid breaking functions during environment variable configuration gaps

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. FRONTEND_URL should already be set in Supabase Edge Function secrets.

## Next Phase Readiness
- All Edge Functions now use shared CORS and import map patterns
- Ready for Phase 58 Plan 02 (rate limiting / input validation) and Plan 03 (further security hardening)
- New Edge Functions in later phases should follow the established patterns: import from _shared/cors.ts and use bare specifiers

## Self-Check: PASSED

- FOUND: supabase/functions/_shared/cors.ts
- FOUND: supabase/functions/deno.json
- FOUND: .planning/phases/58-security-hardening/58-01-SUMMARY.md
- FOUND: commit 6330df578
- FOUND: commit 8d7d5d9c2

---
*Phase: 58-security-hardening*
*Completed: 2026-02-26*
