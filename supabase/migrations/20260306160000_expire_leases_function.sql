-- Migration: Rewrite expire-leases cron as named function
-- Purpose: Replace inline SQL cron job with a proper SECURITY DEFINER function
--   that uses FOR UPDATE SKIP LOCKED for concurrent safety and inserts owner
--   notifications when leases expire (per CONTEXT.md decision).
-- Affected: leases table, notifications table, cron.job (expire-leases)
-- Requirement: DB-05

-- -----------------------------------------------------------------------------
-- Step 1: Unschedule the existing inline cron job
-- The current job uses raw SQL inside cron.schedule. We replace it with a
-- named function call for better error handling, monitoring, and maintainability.
-- -----------------------------------------------------------------------------
do $$
begin
  perform cron.unschedule('expire-leases');
exception
  when others then
    raise notice 'expire-leases job not found, skipping unschedule';
end;
$$;

-- -----------------------------------------------------------------------------
-- Step 2: Create the named expire_leases() function
-- Pattern: matches calculate_late_fees() from 20260222120000_phase56_pg_cron_jobs.sql
-- - SECURITY DEFINER: runs as function owner (postgres), bypassing RLS
-- - SET search_path = public: prevents search_path injection
-- - FOR UPDATE SKIP LOCKED: safe for concurrent execution (if cron overlaps)
-- - Owner notification: inserts into notifications table for each expired lease
-- -----------------------------------------------------------------------------
create or replace function public.expire_leases()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lease record;
  v_expired_count integer := 0;
begin
  for v_lease in
    select id, owner_user_id
    from public.leases
    where lease_status = 'active'
      and end_date < current_date
    for update skip locked
  loop
    -- update lease status to expired
    update public.leases
    set lease_status = 'expired', updated_at = now()
    where id = v_lease.id;

    -- insert notification for the property owner
    -- notification_type 'lease' is a valid CHECK constraint value
    insert into public.notifications (user_id, notification_type, entity_type, entity_id, title, message)
    values (
      v_lease.owner_user_id,
      'lease',
      'lease',
      v_lease.id,
      'Lease Expired',
      'A lease has expired and needs attention.'
    );

    v_expired_count := v_expired_count + 1;
  end loop;

  raise notice 'expire_leases: expired % leases', v_expired_count;
end;
$$;

comment on function public.expire_leases() is
  'Expires active leases past their end_date. Uses FOR UPDATE SKIP LOCKED for concurrency safety. Notifies owners via notifications table. DB-05.';

-- -----------------------------------------------------------------------------
-- Step 3: Reschedule with the named function
-- Same schedule as before: 11 PM UTC daily (before midnight date boundary)
-- -----------------------------------------------------------------------------
select cron.schedule(
  'expire-leases',
  '0 23 * * *',
  $$select public.expire_leases()$$
);
