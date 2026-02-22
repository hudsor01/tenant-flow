-- =============================================================================
-- Phase 56 pg_cron Jobs: Late Fee Calculation, Lease Reminder Queue, Lease Expiry
-- =============================================================================
-- Purpose:
--   Create three SECURITY DEFINER Postgres functions and register them as
--   pg_cron scheduled jobs. These functions implement the core background
--   automation for Phase 56, replacing any NestJS cron logic.
--
-- Affected tables: rent_payments, late_fees, leases, lease_reminders
-- Depends on:
--   - Migration 20260222110100_phase56_schema_foundations.sql (pg_cron enabled,
--     late_fees + lease_reminders tables, expanded CHECK constraints)
--
-- Jobs registered:
--   1. calculate-late-fees     — daily at 00:01 UTC (SCHED-01)
--   2. queue-lease-reminders   — daily at 06:00 UTC (SCHED-02)
--   3. expire-leases           — nightly at 23:00 UTC (SCHED-03)
--
-- Special considerations:
--   - All functions are SECURITY DEFINER to run as function owner (postgres),
--     bypassing RLS so they can INSERT/UPDATE fee and reminder records
--   - set search_path = public is required alongside SECURITY DEFINER to prevent
--     search_path injection attacks
--   - cron.schedule() is idempotent — calling with the same job name replaces
--     the existing schedule. No prior unschedule() call is needed.
--   - FOR UPDATE SKIP LOCKED on rent_payments prevents row contention if the
--     cron job ever overlaps itself (e.g. after a long-running manual test)
--   - All times are UTC
-- =============================================================================


-- ============================================================
-- Section 1: Late Fee Calculation Function (SCHED-01)
-- ============================================================
-- Runs daily at 00:01 UTC to assess $50/day late fees on overdue rent payments.
--
-- Business rules (per CONTEXT.md locked decisions):
--   - Grace period: 3 days. Payments due >3 days ago begin accruing fees.
--   - Fee amount: $50/day flat = 5000 cents per cron run per payment.
--   - Daily accumulation: one late_fees record per payment per calendar day.
--     The unique index on (rent_payment_id, assessed_date) prevents duplicates.
--   - Status escalation:
--       > 3 days overdue (day 4+):   status = 'late'
--       > 14 days overdue (day 15+): status = 'severely_delinquent'
--   - Fees accumulate EVERY day (including on severely_delinquent payments)
--     until the payment is resolved. This is the expected accumulation behavior.
--   - FOR UPDATE SKIP LOCKED prevents row contention on concurrent/overlapping runs.

create or replace function public.calculate_late_fees()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment record;
  v_days_overdue integer;
  v_new_status text;
begin
  -- loop over overdue payments using skip locked to avoid contention on re-run
  for v_payment in
    select
      rp.id,
      rp.lease_id,
      rp.due_date,
      rp.status,
      (current_date - rp.due_date) as days_overdue
    from public.rent_payments rp
    where
      rp.status in ('pending', 'late', 'severely_delinquent')
      and rp.due_date < (current_date - interval '3 days')
      -- include severely_delinquent: fees accumulate every day until payment is resolved
      -- (context.md locked decision: "Daily — each day past grace period creates a new fee record; fees accumulate")
    for update skip locked
  loop
    v_days_overdue := current_date - v_payment.due_date;

    -- insert a late fee record for today (unique index prevents duplicates on same day)
    insert into public.late_fees (
      rent_payment_id,
      lease_id,
      fee_amount,
      days_overdue,
      assessed_date
    )
    values (
      v_payment.id,
      v_payment.lease_id,
      5000,            -- $50.00 in cents
      v_days_overdue,
      current_date
    )
    on conflict (rent_payment_id, assessed_date) do nothing;

    -- determine new status based on days overdue
    if v_days_overdue > 14 then
      v_new_status := 'severely_delinquent';
    else
      v_new_status := 'late';
    end if;

    -- update payment status only if it has changed (avoids unnecessary writes)
    if v_payment.status != v_new_status then
      update public.rent_payments
      set
        status = v_new_status,
        updated_at = now()
      where id = v_payment.id;
    end if;
  end loop;
end;
$$;

comment on function public.calculate_late_fees() is
  'pg_cron job: runs daily at 00:01 UTC. Assesses $50/day late fees on rent_payments overdue >3 days. Sets status=late (4-14 days) or severely_delinquent (>14 days). Inserts one late_fees record per payment per day.';


-- ============================================================
-- Section 2: Lease Reminder Queue Function (SCHED-02)
-- ============================================================
-- Runs daily at 06:00 UTC to queue lease expiry reminder notifications.
--
-- Business rules:
--   - Checks active leases expiring in exactly 30, 7, or 1 day(s).
--   - Inserts a lease_reminders row for each matching threshold.
--   - INSERT ON CONFLICT DO NOTHING: the UNIQUE(lease_id, reminder_type) constraint
--     is the idempotency guard. Re-runs are completely safe — duplicates are silently
--     discarded at the DB level.
--   - The DB Webhook on lease_reminders INSERT (configured in Plan 03) fires n8n
--     to send the actual notification email.
--   - Uses explicit threshold checks (not CASE/ELSIF) so multiple thresholds can
--     be queued in a single function run (e.g., if a lease is exactly 30 days away,
--     the 7-day and 1-day checks would still run for other leases in the same loop).

create or replace function public.queue_lease_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lease record;
  v_days_until_expiry integer;
begin
  for v_lease in
    select id, end_date
    from public.leases
    where
      lease_status = 'active'
      and end_date >= current_date
      and end_date <= (current_date + interval '30 days')
  loop
    v_days_until_expiry := v_lease.end_date - current_date;

    -- check each threshold independently so multiple reminders can be queued
    -- if more than one threshold matches in the same function run

    -- 30-day reminder: queue when lease expires in exactly 30 days
    if v_days_until_expiry = 30 then
      insert into public.lease_reminders (lease_id, reminder_type)
      values (v_lease.id, '30_days')
      on conflict (lease_id, reminder_type) do nothing;
    end if;

    -- 7-day reminder: queue when lease expires in exactly 7 days
    if v_days_until_expiry = 7 then
      insert into public.lease_reminders (lease_id, reminder_type)
      values (v_lease.id, '7_days')
      on conflict (lease_id, reminder_type) do nothing;
    end if;

    -- 1-day reminder: queue when lease expires in exactly 1 day
    if v_days_until_expiry = 1 then
      insert into public.lease_reminders (lease_id, reminder_type)
      values (v_lease.id, '1_day')
      on conflict (lease_id, reminder_type) do nothing;
    end if;
  end loop;
end;
$$;

comment on function public.queue_lease_reminders() is
  'pg_cron job: runs daily at 06:00 UTC. Inserts lease_reminders rows for active leases expiring in exactly 30, 7, or 1 day(s). UNIQUE constraint prevents duplicates — safe to re-run. DB Webhook on lease_reminders INSERT fires n8n notification.';


-- ============================================================
-- Section 3: Register pg_cron Schedules
-- ============================================================
-- cron.schedule() replaces any existing job with the same name — idempotent.
-- No prior cron.unschedule() call is needed.
-- All times are UTC.

-- sched-01: late fee calculation — daily at 00:01 utc
-- runs just after midnight so late fees appear before business hours
select cron.schedule(
  'calculate-late-fees',
  '1 0 * * *',
  $$select public.calculate_late_fees()$$
);

-- sched-02: lease reminder queue — daily at 06:00 utc
-- runs in the morning so n8n notifications are delivered during business hours
select cron.schedule(
  'queue-lease-reminders',
  '0 6 * * *',
  $$select public.queue_lease_reminders()$$
);

-- sched-03: lease expiry status update — nightly at 23:00 utc
-- sets lease_status='expired' for active leases past their end_date
-- direct sql — no function wrapper needed for this simple update
select cron.schedule(
  'expire-leases',
  '0 23 * * *',
  $$
    update public.leases
    set
      lease_status = 'expired',
      updated_at = now()
    where
      end_date < current_date
      and lease_status = 'active'
  $$
);
