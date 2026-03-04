---
phase: 02-financial-fixes
plan: 01
subsystem: database
tags: [postgres, numeric, rpc, security-definer, stripe, autopay, idempotency]

# Dependency graph
requires:
  - phase: 01-rpc-database-security
    provides: SECURITY DEFINER auth guard pattern, SET search_path convention
provides:
  - numeric(10,2) amount columns on rent_due and rent_payments
  - record_rent_payment RPC (atomic payment upsert + rent_due status update)
  - set_default_payment_method RPC (atomic default swap)
  - toggle_autopay RPC (tenant-validated autopay toggle)
  - autopay retry tracking columns on rent_due
  - webhook idempotency status/error_message columns on stripe_webhook_events
  - lease_tenants responsibility_percentage CHECK constraint (1-100)
  - rent_payments service_role bypass policy (FORCE RLS fix)
affects: [02-02, 02-03, 02-04, 02-05, stripe-webhooks, stripe-autopay-charge, stripe-rent-checkout, use-payment-methods]

# Tech tracking
tech-stack:
  added: []
  patterns: [atomic-rpc-for-multi-table-writes, webhook-idempotency-status-tracking, shared-lease-proportional-payment]

key-files:
  created:
    - supabase/migrations/20260304140000_financial_fixes_schema.sql
    - supabase/migrations/20260304150000_financial_fixes_rpcs.sql
  modified: []

key-decisions:
  - "rent_payments has FORCE ROW LEVEL SECURITY — re-created service_role bypass policy (was dropped in 20251230191000)"
  - "rent_due does NOT have FORCE RLS — service_role bypasses by default, no policy needed"
  - "record_rent_payment skips auth.uid() validation (called by webhook handler via service_role)"
  - "Backfilled existing stripe_webhook_events rows to status='succeeded' (old code deleted failed ones)"

patterns-established:
  - "Atomic RPC for multi-table writes: record_rent_payment upserts + conditionally updates rent_due"
  - "Shared lease payment threshold: rent_due marked paid only when SUM(succeeded payments) >= amount"
  - "Webhook idempotency with status tracking: processing/succeeded/failed instead of insert/delete"

requirements-completed: [PAY-01, PAY-02, PAY-03, PAY-06, PAY-08, PAY-13, PAY-14, PAY-15, PAY-16, PAY-22]

# Metrics
duration: 4min
completed: 2026-03-04
---

# Phase 2 Plan 1: Financial Fixes Schema and RPCs Summary

**numeric(10,2) amount columns, three atomic RPCs (record_rent_payment, set_default_payment_method, toggle_autopay), autopay retry tracking, webhook idempotency status, and FORCE RLS service_role fix**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-04T22:16:27Z
- **Completed:** 2026-03-04T22:21:00Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments
- Changed rent_due.amount from integer to numeric(10,2) and all rent_payments amount columns to numeric(10,2) for consistent dollar storage
- Created three SECURITY DEFINER RPCs: record_rent_payment (atomic upsert + rent_due status), set_default_payment_method (atomic default swap), toggle_autopay (tenant-validated)
- Added autopay retry tracking columns (autopay_attempts, autopay_last_attempt_at, autopay_next_retry_at) on rent_due
- Added webhook idempotency status/error_message columns with CHECK constraint on stripe_webhook_events
- Added responsibility_percentage CHECK constraint (1-100) on lease_tenants
- Fixed critical bug: re-created rent_payments_service_role policy dropped by prior migration while FORCE RLS is active

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema migration** - `b55a6a076` (feat)
2. **Task 2: RPC migration** - `8fd4a66d2` (feat, co-committed with parallel session)

## Files Created/Modified
- `supabase/migrations/20260304140000_financial_fixes_schema.sql` - Column type changes, new columns, CHECK constraints, service_role policy
- `supabase/migrations/20260304150000_financial_fixes_rpcs.sql` - Three SECURITY DEFINER RPCs with GRANT EXECUTE

## Decisions Made
- rent_payments has FORCE ROW LEVEL SECURITY set (from migration 20260220080000) — the service_role policy was dropped in 20251230191000, meaning webhooks using service_role could not write to rent_payments. Re-created the policy.
- rent_due does NOT have FORCE RLS, so service_role bypasses RLS by default. No policy needed.
- record_rent_payment does NOT validate auth.uid() because it is called by the webhook handler running as service_role (not an authenticated user). The service_role key is the trust boundary.
- Backfilled existing stripe_webhook_events rows to status='succeeded' since the old code deleted failed records (so all surviving records were successful).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Task 2 commit was absorbed by a parallel agent session's commit (8fd4a66d2). The file content is correct but the commit message references a different plan. No data loss.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Schema foundation complete for all subsequent plans in Phase 2
- Edge Functions (Plan 02-02, 02-03) can now call record_rent_payment RPC
- Frontend (Plan 02-04) can now call set_default_payment_method and toggle_autopay RPCs
- Migrations need to be applied to production via `supabase db push` before Edge Function changes

---
*Phase: 02-financial-fixes*
*Completed: 2026-03-04*
