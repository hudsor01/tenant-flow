-- =============================================================================
-- Migration: Financial Fixes — Schema Changes
-- Created: 2026-03-04
-- Phase: 02-financial-fixes, Plan 01, Task 1
--
-- Purpose: Establish the data layer foundation for financial correctness.
--   1. PAY-06: Change amount columns to numeric(10,2) (dollars, not cents)
--   2. PAY-13: Add autopay retry tracking columns to rent_due
--   3. PAY-15: Add webhook idempotency status tracking to stripe_webhook_events
--   4. PAY-14: Add CHECK constraint on lease_tenants.responsibility_percentage
--   5. PAY-22: Re-create rent_payments service_role policy (FORCE RLS is set)
--   6. PAY-01: Document amount convention
--
-- Convention: All amount columns store dollars as numeric(10,2).
-- Convert to cents (multiply by 100) ONLY at the Stripe API boundary
-- in Edge Functions (stripe-rent-checkout, stripe-autopay-charge).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. PAY-06: Amount column type changes
--
-- rent_due.amount is currently integer, rent_payments amount columns are
-- various numeric types. Changing all to numeric(10,2) for consistent
-- dollar storage with two decimal places.
-- Existing data is already in dollars — no data transformation needed.
-- -----------------------------------------------------------------------------

-- rent_due: integer -> numeric(10,2)
alter table public.rent_due
  alter column amount type numeric(10,2);

-- rent_payments: ensure all amount columns are numeric(10,2)
alter table public.rent_payments
  alter column amount type numeric(10,2),
  alter column gross_amount type numeric(10,2),
  alter column platform_fee_amount type numeric(10,2),
  alter column stripe_fee_amount type numeric(10,2),
  alter column net_amount type numeric(10,2),
  alter column application_fee_amount type numeric(10,2),
  alter column late_fee_amount type numeric(10,2);

-- -----------------------------------------------------------------------------
-- 2. PAY-13: Autopay retry tracking columns on rent_due
--
-- These columns enable the pg_cron autopay retry mechanism:
--   - autopay_attempts: count of charge attempts (max 3)
--   - autopay_last_attempt_at: timestamp of most recent attempt
--   - autopay_next_retry_at: when to retry next (day 1, day 3, day 7)
-- -----------------------------------------------------------------------------

alter table public.rent_due
  add column if not exists autopay_attempts integer default 0,
  add column if not exists autopay_last_attempt_at timestamptz,
  add column if not exists autopay_next_retry_at timestamptz;

-- -----------------------------------------------------------------------------
-- 3. PAY-15: Webhook idempotency status tracking on stripe_webhook_events
--
-- Instead of deleting the idempotency record on failure (current behavior),
-- we track status so failed events can be retried by Stripe.
--   - status: 'processing' (in-flight), 'succeeded', 'failed'
--   - error_message: captures failure details for debugging
-- -----------------------------------------------------------------------------

alter table public.stripe_webhook_events
  add column if not exists status text default 'processing',
  add column if not exists error_message text;

-- check constraint: status must be one of the valid values
-- using text + CHECK (not enum) per project convention
alter table public.stripe_webhook_events
  add constraint stripe_webhook_events_status_check
    check (status in ('processing', 'succeeded', 'failed'));

-- backfill existing rows: all prior webhook events were processed successfully
-- (failed ones were deleted by the old code)
update public.stripe_webhook_events
  set status = 'succeeded'
  where status = 'processing';

-- -----------------------------------------------------------------------------
-- 4. PAY-14: Responsibility percentage constraint on lease_tenants
--
-- Ensures the percentage is a valid value between 1 and 100.
-- Default is 100 (single tenant on lease).
-- For shared leases, percentages should sum to 100 across all tenants.
-- (Sum validation is enforced at the application level, not DB level,
--  since it depends on cross-row state.)
-- -----------------------------------------------------------------------------

alter table public.lease_tenants
  add constraint lease_tenants_responsibility_percentage_range
    check (responsibility_percentage >= 1 and responsibility_percentage <= 100);

-- -----------------------------------------------------------------------------
-- 5. PAY-22: Verify and fix service_role access
--
-- FINDING: rent_payments has FORCE ROW LEVEL SECURITY set
-- (from migration 20260220080000_enable_rls_on_tables_missing_it.sql).
-- The service_role policy was dropped in 20251230191000_simplify_rls_policies.sql.
-- This means the webhook handler (using service_role key) CANNOT write to
-- rent_payments. Re-creating the service_role bypass policy.
--
-- rent_due does NOT have FORCE ROW LEVEL SECURITY set, so service_role
-- bypasses RLS by default on that table. No policy needed for rent_due.
-- -----------------------------------------------------------------------------

create policy "rent_payments_service_role"
  on public.rent_payments
  for all
  to service_role
  using (true)
  with check (true);

-- -----------------------------------------------------------------------------
-- 6. PAY-01: Amount convention documentation (see migration header comment)
--
-- All amount columns in rent_due and rent_payments store DOLLARS as
-- numeric(10,2). The Stripe API expects CENTS (integer). Conversion
-- happens at the Stripe API boundary only:
--   - stripe-rent-checkout: Math.round(amount * 100)
--   - stripe-autopay-charge: Math.round(amount * 100)
--   - stripe-webhooks (inbound): amount / 100 when storing from Stripe
-- =============================================================================
