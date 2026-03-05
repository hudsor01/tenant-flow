---
phase: 02-financial-fixes
plan: 02
subsystem: payments
tags: [stripe, webhooks, sentry, idempotency, edge-functions, deno]

# Dependency graph
requires:
  - phase: 02-financial-fixes
    plan: 01
    provides: stripe_webhook_events status/error_message columns, record_rent_payment RPC
provides:
  - Stripe SDK v20 with apiVersion 2026-02-25.clover in Edge Functions
  - Status-based webhook idempotency (processing/succeeded/failed)
  - Metadata validation with Sentry error capture (Decision #15)
  - Preserved onboarding_completed_at (set-once semantics)
  - Owner receipt email with fee breakdown (platform fee, Stripe fee, net payout)
  - Atomic payment recording via record_rent_payment RPC
  - invoice.payment_failed handler with owner email notification
  - Sentry integration (@sentry/deno@9) for Edge Functions
affects: [02-03, 02-04, 02-05, stripe-autopay-charge, stripe-rent-checkout]

# Tech tracking
tech-stack:
  added: ["@sentry/deno@9", "stripe@20 (Deno)"]
  patterns: [sentry-with-console-fallback, status-based-idempotency, set-once-timestamp]

key-files:
  created: []
  modified:
    - supabase/functions/deno.json
    - supabase/functions/stripe-webhooks/index.ts
    - supabase/functions/stripe-webhooks/_templates/owner-notification.tsx

key-decisions:
  - "Sentry with console.error fallback: if SENTRY_DSN not set, logs structured JSON instead of crashing"
  - "invoice.payment_failed skips direct subscription_status update — stripe.subscriptions table is source of truth"
  - "Stripe apiVersion cast as Stripe.LatestApiVersion for type compatibility with SDK v20"
  - "period_month/period_year empty string fallbacks kept — display-only fields, not data integrity metadata"

patterns-established:
  - "captureError helper: Sentry.captureException with structured console.error fallback"
  - "Set-once timestamp: check existing value before update, skip if already set"
  - "Fee breakdown in owner emails: retrieve balance_transaction for Stripe fee, compute net"

requirements-completed: [PAY-09, PAY-10, PAY-11, PAY-15, PAY-17, PAY-18]

# Metrics
duration: 5min
completed: 2026-03-04
---

# Phase 2 Plan 2: Stripe Webhook Fixes Summary

**Stripe SDK v20 upgrade with status-based idempotency, Sentry metadata validation, onboarding preservation, fee breakdown emails, and invoice.payment_failed handling**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-05T00:38:13Z
- **Completed:** 2026-03-05T00:43:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Upgraded Stripe SDK from v14 to v20 with new apiVersion 2026-02-25.clover format
- Replaced delete-on-failure idempotency with status tracking (processing/succeeded/failed) — failed events can now be retried
- Added metadata validation that rejects empty tenant_id/lease_id with Sentry.captureException (per Decision #15)
- Fixed onboarding_completed_at to set-once semantics — never overwrites existing value
- Added fee breakdown (platform fee, Stripe fee, net payout) to owner notification emails
- Replaced direct rent_payments INSERT with record_rent_payment RPC for atomic payment + rent_due status update
- Added invoice.payment_failed handler for platform subscription failures with owner email notification

## Task Commits

Each task was committed atomically:

1. **Task 1: Upgrade Stripe SDK** - `1aef188ad` (chore)
2. **Task 2: Fix webhook handler** - `65a11220b` (feat)

## Files Created/Modified
- `supabase/functions/deno.json` - Updated stripe to v20, added @sentry/deno@9
- `supabase/functions/stripe-webhooks/index.ts` - All 6 webhook fixes (idempotency, metadata, onboarding, fees, RPC, invoice handler)
- `supabase/functions/stripe-webhooks/_templates/owner-notification.tsx` - Added fee breakdown props and UI section

## Decisions Made
- **Sentry fallback pattern**: If SENTRY_DSN env var is not configured, captureError logs structured JSON with `sentry: true` flag so a future log drain can pick it up. This prevents crashes in environments without Sentry while maintaining the Decision #15 requirement.
- **invoice.payment_failed**: Does NOT update users.subscription_status directly since that column does not exist on users. The stripe.subscriptions table (synced by Stripe Sync Engine) is the source of truth. The email notification is the primary action.
- **apiVersion type cast**: Used `as Stripe.LatestApiVersion` since SDK v20 types may not include the exact '2026-02-25.clover' string literal. This is standard practice for Stripe SDK version alignment.
- **period_month/period_year fallbacks preserved**: These display-only fields in email templates use `?? ''` which is intentional (they are optional, not required metadata). Only tenant_id/lease_id validation was added per PAY-10.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
- **SENTRY_DSN**: Must be set as environment variable on Supabase Edge Functions for Sentry error monitoring. Without it, errors fall back to structured console.error logging. Set via `supabase secrets set SENTRY_DSN=<your-dsn>`.

## Follow-up Items
- If SENTRY_DSN is not yet configured in production, Sentry errors will only appear as structured console.error logs. Configure SENTRY_DSN to enable full Sentry integration.
- Edge Functions must be redeployed after these changes: `supabase functions deploy stripe-webhooks`

## Next Phase Readiness
- Webhook handler is now production-hardened with proper idempotency, validation, and error reporting
- Other Edge Functions (stripe-rent-checkout, stripe-autopay-charge) still use stripe@14 API patterns but will work with the shared deno.json v20 import
- Plans 02-03 through 02-05 can proceed with frontend and remaining Edge Function fixes

---
*Phase: 02-financial-fixes*
*Completed: 2026-03-04*
