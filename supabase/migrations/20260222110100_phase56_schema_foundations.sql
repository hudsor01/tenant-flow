-- =============================================================================
-- Phase 56 Schema Foundations: pg_cron, Status Constraint Expansions, New Tables
-- =============================================================================
-- Purpose:
--   Establish the DB schema required for Phase 56 scheduled jobs and DB webhooks.
--   This migration:
--     1. Enables the pg_cron extension (required for scheduled SQL jobs)
--     2. Expands leases.lease_status CHECK constraint to include 'expired'
--     3. Expands rent_payments.status CHECK constraint to include 'late' and 'severely_delinquent'
--     4. Creates the late_fees table (daily fee records for overdue rent payments)
--     5. Creates the lease_reminders table (dedup queue for expiry notifications)
--
-- Affected tables: leases, rent_payments, late_fees (new), lease_reminders (new)
--
-- Special considerations:
--   - pg_cron must be created in the 'extensions' schema on Supabase (not pg_catalog)
--   - pg_cron jobs (cron.schedule calls) are added in Plan 02 of this phase
--   - late_fees INSERT/UPDATE/DELETE is managed exclusively by pg_cron SECURITY DEFINER
--     functions, so no INSERT/UPDATE/DELETE RLS policies are needed for authenticated users
--   - lease_reminders INSERT is managed by pg_cron SECURITY DEFINER function only
-- =============================================================================


-- =============================================================================
-- SECTION 1: Enable pg_cron extension
-- =============================================================================
-- pg_cron must be created in the 'extensions' schema on Supabase. This is the
-- required schema for all extensions on Supabase-hosted projects.
-- pg_cron enables scheduled SQL jobs (e.g. nightly lease expiry, daily late fees).

create extension if not exists pg_cron with schema extensions;


-- =============================================================================
-- SECTION 2: Expand leases.lease_status CHECK constraint to allow 'expired'
-- =============================================================================
-- Current constraint allows: draft, pending_signature, active, ended, terminated
-- Adding 'expired' for the nightly pg_cron job that marks leases past their
-- end_date as expired. This is distinct from 'ended' (owner-initiated) and
-- 'terminated' (early termination) — 'expired' means the lease term lapsed
-- without explicit action.

alter table public.leases
  drop constraint leases_lease_status_check;

alter table public.leases
  add constraint leases_lease_status_check
  check (lease_status in (
    'draft', 'pending_signature', 'active', 'ended', 'terminated', 'expired'
  ));

comment on constraint leases_lease_status_check on public.leases is
  'Valid values: draft, pending_signature, active, ended, terminated, expired. expired is set by pg_cron nightly job when end_date < now().';


-- =============================================================================
-- SECTION 3: Expand rent_payments.status CHECK constraint
-- =============================================================================
-- Current constraint allows: pending, processing, succeeded, failed, cancelled, requires_action
-- Adding:
--   'late'                 — payment is past grace period (>3 days past due_date); fees accruing
--   'severely_delinquent'  — payment is 14+ days past due_date; escalated collection status
-- Status progression: pending → late (day 4+) → severely_delinquent (day 15+)
-- These statuses are set by the pg_cron late-fee job function, not by users.

alter table public.rent_payments
  drop constraint rent_payments_status_check;

alter table public.rent_payments
  add constraint rent_payments_status_check
  check (status in (
    'pending', 'processing', 'succeeded', 'failed', 'cancelled', 'requires_action',
    'late', 'severely_delinquent'
  ));

comment on constraint rent_payments_status_check on public.rent_payments is
  'Valid values: pending, processing, succeeded, failed, cancelled, requires_action, late (>3 days past due), severely_delinquent (>14 days past due). late and severely_delinquent are set by pg_cron daily job.';


-- =============================================================================
-- SECTION 4: Create late_fees table
-- =============================================================================
-- Tracks individual daily late fee records assessed against overdue rent payments.
-- pg_cron calls a SECURITY DEFINER function that INSERTs one row per overdue
-- payment per day (after the 3-day grace period). The unique index prevents
-- a double-run of the cron job from inserting duplicate fees for the same day.

create table if not exists public.late_fees (
  id              uuid        primary key default gen_random_uuid(),
  rent_payment_id uuid        not null references public.rent_payments(id) on delete cascade,
  lease_id        uuid        not null references public.leases(id) on delete cascade,
  fee_amount      integer     not null,               -- in cents (e.g. 5000 = $50.00)
  days_overdue    integer     not null,               -- number of days past due_date when assessed (after grace period)
  assessed_date   date        not null default current_date,
  created_at      timestamptz not null default now(),

  constraint late_fees_fee_amount_check check (fee_amount > 0),
  constraint late_fees_days_overdue_check check (days_overdue > 0)
);

comment on table public.late_fees is
  'Daily late fee records assessed by pg_cron against overdue rent payments. One record per (rent_payment_id, assessed_date) after the 3-day grace period.';

comment on column public.late_fees.fee_amount is
  'Fee amount in cents (e.g. 5000 = $50.00). Flat $50 per day overdue per Phase 56 business rules.';

comment on column public.late_fees.days_overdue is
  'Number of days past due_date when this fee was assessed. Must be >3 (grace period). Day 4 = first fee, day 5 = second fee, etc.';

-- Prevents duplicate fees for the same payment on the same calendar day.
-- Ensures the pg_cron job is idempotent — re-running does not create duplicate charges.
create unique index if not exists late_fees_unique_per_day
  on public.late_fees (rent_payment_id, assessed_date);

-- Performance index for querying all fees for a specific payment.
create index if not exists idx_late_fees_rent_payment_id
  on public.late_fees using btree (rent_payment_id);

-- Performance index for querying fees by lease (used in owner billing views).
create index if not exists idx_late_fees_lease_id
  on public.late_fees using btree (lease_id);

-- Enable Row Level Security — all access must go through policies below.
alter table public.late_fees enable row level security;


-- =============================================================================
-- SECTION 5: RLS policies for late_fees
-- =============================================================================
-- Late fees are written by pg_cron (SECURITY DEFINER function bypasses RLS).
-- Authenticated users can only READ fees relevant to them.
-- No INSERT/UPDATE/DELETE policies for authenticated users — managed by pg_cron only.

-- Property owners can view all late fees for leases on their properties.
-- Uses a subquery to avoid a join back to the source table (performance recommendation).
create policy "Property owners can view late fees for their leases"
  on public.late_fees
  for select
  to authenticated
  using (
    lease_id in (
      select id from public.leases
      where owner_user_id = (select auth.uid())
    )
  );

-- Tenants can view their own late fees.
-- Two-step resolution: auth.uid() → tenants.id → lease_tenants.lease_id
-- This matches the tenant identity pattern used throughout the codebase.
create policy "Tenants can view their own late fees"
  on public.late_fees
  for select
  to authenticated
  using (
    lease_id in (
      select lt.lease_id from public.lease_tenants lt
      inner join public.tenants t on t.id = lt.tenant_id
      where t.user_id = (select auth.uid())
    )
  );


-- =============================================================================
-- SECTION 6: Create lease_reminders table
-- =============================================================================
-- Deduplication queue for lease expiry notifications.
-- pg_cron inserts rows using INSERT ... ON CONFLICT DO NOTHING — the UNIQUE
-- constraint on (lease_id, reminder_type) is the idempotency guard.
-- A Supabase DB Webhook fires on INSERT, POSTing to n8n, which sends the email.
--
-- Reminder thresholds: '30_days', '7_days', '1_day' before lease end_date.
-- Once a reminder is recorded, the UNIQUE constraint ensures it is never re-sent
-- even if the pg_cron job runs multiple times on the same day.

create table if not exists public.lease_reminders (
  id              uuid        primary key default gen_random_uuid(),
  lease_id        uuid        not null references public.leases(id) on delete cascade,
  reminder_type   text        not null,   -- '30_days', '7_days', '1_day'
  sent_at         timestamptz not null default now(),
  created_at      timestamptz not null default now(),

  -- Idempotency guard: one reminder per (lease, type) ever.
  -- pg_cron uses INSERT ... ON CONFLICT DO NOTHING against this constraint.
  constraint lease_reminders_reminder_type_check
    check (reminder_type in ('30_days', '7_days', '1_day')),

  constraint lease_reminders_unique_per_lease_type
    unique (lease_id, reminder_type)
);

comment on table public.lease_reminders is
  'Dedup queue for lease expiry reminders. pg_cron inserts with ON CONFLICT DO NOTHING; DB Webhook fires on INSERT to trigger n8n notification workflow. UNIQUE(lease_id, reminder_type) prevents duplicate notifications.';

comment on column public.lease_reminders.reminder_type is
  'Notification threshold: 30_days, 7_days, or 1_day before lease end_date. Constrained to these three values.';

comment on column public.lease_reminders.sent_at is
  'Timestamp when the reminder was queued (effectively when inserted by pg_cron). n8n sends the actual email shortly after via DB Webhook.';

-- Performance index for checking if a specific lease already has a given reminder sent.
-- Used by pg_cron queries like: SELECT 1 FROM lease_reminders WHERE lease_id = $1 AND reminder_type = $2
create index if not exists idx_lease_reminders_lease_id
  on public.lease_reminders using btree (lease_id);

-- Enable Row Level Security — all access must go through policies below.
alter table public.lease_reminders enable row level security;


-- =============================================================================
-- SECTION 7: RLS policies for lease_reminders
-- =============================================================================
-- lease_reminders is an internal queue. Only property owners can view reminder
-- history (useful for debugging "did the 30-day reminder fire?").
-- No INSERT/UPDATE/DELETE policies for authenticated users — managed by pg_cron only.

-- Property owners can view the reminder history for their leases.
-- Useful for debugging and audit purposes (e.g. confirming a reminder was sent).
create policy "Property owners can view lease reminder history"
  on public.lease_reminders
  for select
  to authenticated
  using (
    lease_id in (
      select id from public.leases
      where owner_user_id = (select auth.uid())
    )
  );
