-- =============================================================================
-- migration: add RENT_PAYMENTS_ENABLED gate to calculate_late_fees()
-- purpose: defense-in-depth. `calculate_late_fees` runs daily at 00:01 UTC
--   and mutates `rent_payments.status` + inserts `late_fees` rows even though
--   no money moves. This is the same class of unsupervised state mutation
--   that motivated PR #593's autopay gate.
--
-- Primary kill-switch (NOT applied by this migration; operator decision):
--   SELECT cron.unschedule('calculate-late-fees');
--
-- This migration adds a second gate so that if the job is ever rescheduled,
-- it short-circuits unless app.settings.RENT_PAYMENTS_ENABLED = 'true'.
-- Reuses the same Postgres config var as process_autopay_charges() — one
-- toggle flips both.
--
-- Postgres-level toggle (manual, when ready to re-enable both rent flows):
--   ALTER DATABASE postgres SET "app.settings.RENT_PAYMENTS_ENABLED" = 'true';
-- And to turn back off:
--   ALTER DATABASE postgres SET "app.settings.RENT_PAYMENTS_ENABLED" = 'false';
-- Default (unset) is OFF.
--
-- depends on:
--   20260222120000_phase56_pg_cron_jobs.sql (function this replaces)
--   20260417120000_autopay_rent_payments_enabled_gate.sql (sibling gate, PR #593)
-- =============================================================================

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
  v_rent_enabled text;
begin
  -- RENT_PAYMENTS_ENABLED gate (defense-in-depth).
  v_rent_enabled := current_setting('app.settings.RENT_PAYMENTS_ENABLED', true);
  if coalesce(v_rent_enabled, '') <> 'true' then
    raise notice 'calculate_late_fees: RENT_PAYMENTS_ENABLED is not "true" (value=%), skipping', coalesce(v_rent_enabled, '<unset>');
    return;
  end if;

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
  'pg_cron job: runs daily at 00:01 UTC when scheduled. Gated by '
  'app.settings.RENT_PAYMENTS_ENABLED (must equal "true" to execute). '
  'Assesses $50/day late fees on rent_payments overdue >3 days. Sets '
  'status=late (4-14 days) or severely_delinquent (>14 days). Inserts '
  'one late_fees record per payment per day.';
