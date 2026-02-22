---
phase: 54-payments-billing-postgrest-stripe-edge-functions
plan: "03"
subsystem: payments
tags: [stripe, edge-functions, webhooks, deno, supabase, idempotency]

# Dependency graph
requires:
  - phase: 54-payments-billing-postgrest-stripe-edge-functions
    provides: Phase 54-02 stripe-connect Edge Function and PostgREST payment hooks

provides:
  - stripe_webhook_events table for idempotency tracking (Stripe event ID PK)
  - stripe-webhooks Supabase Edge Function processing 7 Stripe event types
  - Webhook signature verification via constructEventAsync()
  - Idempotency guard (23505 PK conflict → 200 without reprocessing)
  - account.updated → charges_enabled flip notification in notifications table
  - payment_intent.payment_failed → owner notification in notifications table
  - checkout.session.completed → leases.stripe_subscription_id update

affects:
  - 54-04-payments-billing
  - 57-cleanup-deletion

# Tech tracking
tech-stack:
  added: [npm:stripe@14, esm.sh/@supabase/supabase-js@2]
  patterns:
    - Stripe webhook Edge Function with constructEventAsync() signature verification
    - Idempotency via PK insert (23505 duplicate key → 200 return)
    - Delete idempotency record on failure so Stripe can retry
    - Service role only table (RLS enabled, no user policies)

key-files:
  created:
    - supabase/migrations/20260221130000_create_stripe_webhook_events.sql
    - supabase/functions/stripe-webhooks/index.ts
  modified: []

key-decisions:
  - "Migration timestamp changed from 20260221120000 to 20260221130000 — conflict with existing 20260221120000_add_maintenance_status_vendor_statuses.sql"
  - "onboarding_status logic mirrors NestJS ConnectWebhookHandler: not_started (details_submitted=false), completed (details_submitted AND charges_enabled AND payouts_enabled), in_progress (otherwise)"
  - "payment_intent.payment_failed: amount stored as DB units (not cents) so no /100 division in notification message"
  - "Failure processing: delete idempotency record on error so Stripe 72-hour retry window can reprocess"
  - "account.updated: includes past_due in requirementsDue array (in addition to currently_due and eventually_due from plan)"

patterns-established:
  - "Edge Function idempotency: INSERT with PK → catch 23505 → return 200"
  - "Webhook auth: Stripe signature only (no JWT — Stripe cannot send user JWTs)"
  - "Failure isolation: delete idempotency record → return 500 → Stripe retries"

requirements-completed:
  - PAY-03

# Metrics
duration: 15min
completed: 2026-02-21
---

# Phase 54 Plan 03: Stripe Webhooks Edge Function Summary

**Synchronous Stripe webhook Edge Function with constructEventAsync() signature verification, stripe_webhook_events idempotency table, and 7 event handlers (subscription lifecycle, Connect account, payment intents, checkout session)**

## Performance

- **Duration:** 15 min
- **Started:** 2026-02-21T00:00:00Z
- **Completed:** 2026-02-21T00:15:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created `stripe_webhook_events` table (text PK = Stripe event ID) with RLS enabled and no user-accessible policies — service role only
- Created `stripe-webhooks/index.ts` Deno Edge Function (275 lines) with Stripe signature verification via `constructEventAsync()`
- Handles all 7 required event types: `customer.subscription.created/updated/deleted`, `account.updated`, `payment_intent.succeeded/payment_failed`, `checkout.session.completed`
- Idempotency: PK insert on `stripe_webhook_events`; 23505 duplicate key error returns 200 without reprocessing; delete record on failure so Stripe retries
- Replaces NestJS BullMQ webhook queue with synchronous Edge Function leveraging Stripe's 72-hour retry window

## Task Commits

Each task was committed atomically:

1. **Task 1: Create stripe_webhook_events migration** - (feat(54-03): create stripe_webhook_events idempotency migration)
2. **Task 2: Create stripe-webhooks Edge Function** - (feat(54-03): create stripe-webhooks Supabase Edge Function)

**Plan metadata:** (docs(54-03): complete stripe-webhooks edge function plan)

## Files Created/Modified
- `supabase/migrations/20260221130000_create_stripe_webhook_events.sql` - Idempotency table with text PK, RLS enabled, indexes on processed_at and event_type
- `supabase/functions/stripe-webhooks/index.ts` - Deno Edge Function; Stripe signature verification; idempotency guard; 7 event handlers; returns 500 on failure for Stripe retry

## Decisions Made
- **Migration timestamp conflict**: Used `20260221130000` instead of plan-specified `20260221120000` — `20260221120000_add_maintenance_status_vendor_statuses.sql` already exists
- **onboarding_status logic**: Aligned with NestJS ConnectWebhookHandler: `not_started` when `!details_submitted`, `completed` when all three (details_submitted AND charges_enabled AND payouts_enabled), `in_progress` otherwise — more accurate than plan's binary `charges_enabled ? 'completed' : 'pending'`
- **requirementsDue**: Added `past_due` to the array in addition to `currently_due` and `eventually_due` from plan — mirrors NestJS handler for complete requirement tracking
- **payment_intent.payment_failed amount**: `failedPayment.amount` is already stored in DB units (dollars not cents) so no `/100` division needed in notification message
- **Failure isolation**: Delete idempotency record on processing error, return 500 — allows Stripe to retry within 72-hour window

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Migration timestamp conflict**
- **Found during:** Task 1 (Create stripe_webhook_events migration)
- **Issue:** Plan specified `20260221120000` but `20260221120000_add_maintenance_status_vendor_statuses.sql` already exists; Supabase would reject duplicate timestamps
- **Fix:** Used `20260221130000` as the migration filename — next available timestamp slot
- **Files modified:** `supabase/migrations/20260221130000_create_stripe_webhook_events.sql`
- **Verification:** `ls supabase/migrations/20260221130000_create_stripe_webhook_events.sql` confirms unique filename
- **Committed in:** Task 1 commit

**2. [Rule 2 - Missing Critical] onboarding_status uses three-state logic from NestJS handler**
- **Found during:** Task 2 (Create stripe-webhooks Edge Function)
- **Issue:** Plan used binary `charges_enabled ? 'completed' : 'pending'` — missing `not_started` state and `details_submitted` check; DB has `not_started/in_progress/completed` constraint
- **Fix:** Implemented three-state logic matching NestJS ConnectWebhookHandler and `onboarding_status` DB constraint values
- **Files modified:** `supabase/functions/stripe-webhooks/index.ts`
- **Verification:** Matches DB constraint and existing NestJS behavior

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Both auto-fixes necessary for correctness. No scope creep.

## Issues Encountered
None

## User Setup Required

**External services require manual configuration.** See [54-USER-SETUP.md](./54-USER-SETUP.md) for:
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` environment variables
- Stripe Dashboard webhook endpoint creation
- Supabase Edge Function secrets configuration

Note: `54-USER-SETUP.md` from Phase 54-02 covers these same secrets. If already configured there, no additional setup needed.

## Next Phase Readiness
- stripe-webhooks Edge Function ready for deployment once Stripe secrets are configured
- Ready for Phase 54-04: remaining payment mutations (Stripe checkout session, payment method management)
- All Stripe webhook events handled synchronously — NestJS BullMQ webhook queue can be deleted in Phase 57

---
*Phase: 54-payments-billing-postgrest-stripe-edge-functions*
*Completed: 2026-02-21*
