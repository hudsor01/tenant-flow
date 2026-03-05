---
phase: 02-financial-fixes
plan: 03
subsystem: payments
tags: [stripe, edge-functions, autopay, idempotency, retry, email, pg_cron, deno]

# Dependency graph
requires:
  - phase: 02-financial-fixes
    plan: 01
    provides: autopay retry tracking columns (autopay_attempts, autopay_next_retry_at), responsibility_percentage CHECK constraint
  - phase: 02-financial-fixes
    plan: 02
    provides: Stripe SDK v20 in deno.json, apiVersion 2026-02-25.clover pattern
provides:
  - Per-tenant checkout with correct redirect URLs (stripe-rent-checkout)
  - Per-tenant autopay with idempotency, retry tracking, and failure notifications (stripe-autopay-charge)
  - Updated pg_cron function with dual cursors (due-date + retry) and per-tenant amounts
  - Autopay failure email notifications (tenant on every attempt, owner on final)
affects: [02-04, 02-05, stripe-rent-checkout, stripe-autopay-charge, process_autopay_charges]

# Tech tracking
tech-stack:
  added: []
  patterns: [per-tenant-portion-calculation, stripe-idempotency-key, autopay-retry-schedule, failure-notification-emails]

key-files:
  created:
    - supabase/migrations/20260304160000_autopay_cron_retry.sql
  modified:
    - supabase/functions/stripe-rent-checkout/index.ts
    - supabase/functions/stripe-autopay-charge/index.ts

key-decisions:
  - "Autopay idempotency key format: rent_due_id + tenant_id (scoped per-tenant for shared leases)"
  - "Amount safety net: Edge Function independently computes tenant portion and warns on mismatch with passed value"
  - "Retry schedule: +2 days after attempt 1, +4 days after attempt 2 (day 1, day 3, day 7)"
  - "pg_cron duplicate check scoped to tenant_id + rent_due_id (not just rent_due_id) for shared lease correctness"

patterns-established:
  - "Per-tenant portion: rent_due.amount * lease_tenants.responsibility_percentage / 100, computed at both pg_cron and Edge Function layers"
  - "Stripe idempotency key: rent_due_id_tenant_id prevents double-charging same tenant for same rent period"
  - "Autopay retry: Edge Function tracks attempts and computes next retry date, pg_cron picks up retries via autopay_next_retry_at"
  - "Failure notifications: sendEmail (never throws) with structured tags for email analytics"

requirements-completed: [PAY-08, PAY-13, PAY-14, PAY-21]

# Metrics
duration: 5min
completed: 2026-03-05
---

# Phase 2 Plan 3: Rent Checkout and Autopay Edge Functions Summary

**Per-tenant portion checkout with Stripe {CHECKOUT_SESSION_ID} redirects, autopay idempotency keys, pg_cron retry logic (day 1/3/7), and tenant+owner failure notification emails**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-05T00:46:09Z
- **Completed:** 2026-03-05T00:51:00Z
- **Tasks:** 2
- **Files created/modified:** 3

## Accomplishments
- stripe-rent-checkout now computes per-tenant portion from lease_tenants.responsibility_percentage and uses correct Stripe {CHECKOUT_SESSION_ID} redirect template
- stripe-autopay-charge adds idempotency key, independently verifies tenant portion, tracks retry attempts, and sends failure notification emails
- pg_cron process_autopay_charges function updated with two cursors (due-date + retry) and per-tenant amount calculation
- Both Edge Functions upgraded to apiVersion 2026-02-25.clover

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix stripe-rent-checkout** - `6f1d2de12` (feat)
2. **Task 2: Fix stripe-autopay-charge + pg_cron retry** - `72f98f3ec` (feat)

## Files Created/Modified
- `supabase/functions/stripe-rent-checkout/index.ts` - Per-tenant portion from responsibility_percentage, {CHECKOUT_SESSION_ID} success_url, apiVersion upgrade
- `supabase/functions/stripe-autopay-charge/index.ts` - Idempotency key, portion verification, retry tracking, tenant/owner failure emails via sendEmail
- `supabase/migrations/20260304160000_autopay_cron_retry.sql` - Replaced process_autopay_charges with dual-cursor version (due-date + retry) using per-tenant amounts

## Decisions Made
- **Idempotency key format**: `${rent_due_id}_${tenant_id}` scoped per-tenant so shared leases get independent idempotency per tenant.
- **Amount safety net**: The Edge Function independently computes the tenant portion from lease_tenants and logs a warning if the passed amount diverges, always using the computed value. This guards against pg_cron bugs.
- **Retry schedule**: +2 days after attempt 1 (day 3), +4 days after attempt 2 (day 7). The Edge Function computes next_retry_at; pg_cron queries by that column.
- **Duplicate check scoping**: pg_cron and Edge Function both check for existing payments scoped to tenant_id + rent_due_id (not just rent_due_id), preventing false positives on shared leases where one tenant paid but another hasn't.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed catch block variable scoping for retry tracking**
- **Found during:** Task 2 (stripe-autopay-charge implementation)
- **Issue:** Body parsing was inside try block, making destructured fields inaccessible in catch block for retry tracking
- **Fix:** Moved body parsing before the try block with separate try/catch for JSON parse errors
- **Files modified:** supabase/functions/stripe-autopay-charge/index.ts
- **Verification:** Variables (tenant_id, rent_due_id, etc.) accessible in catch block for handleAutopayFailure call
- **Committed in:** 72f98f3ec (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential for retry tracking to work on payment failures. No scope creep.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. RESEND_API_KEY must already be configured (from existing setup) for failure notification emails to send.

## Next Phase Readiness
- Both Edge Functions are now production-hardened with per-tenant portions, idempotency, and retry logic
- Plans 02-04 and 02-05 can proceed with frontend payment hooks and billing UI
- Migrations need to be applied to production via `supabase db push` before Edge Function deployment
- Edge Functions need redeployment: `supabase functions deploy stripe-rent-checkout` and `supabase functions deploy stripe-autopay-charge`

---
*Phase: 02-financial-fixes*
*Completed: 2026-03-05*
