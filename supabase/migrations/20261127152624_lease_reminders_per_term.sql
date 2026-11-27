-- Lease reminders are per lease TERM, not per lease.
--
-- Renewing a lease moves the same row's end_date forward
-- (renew-lease-dialog -> leases.end_date). lease_reminders was unique on
-- (lease_id, reminder_type) and queue_lease_reminders inserted
-- `on conflict (lease_id, reminder_type) do nothing`, so a lease that had its
-- 30/7/1-day reminders for one term never got them again for the next: no
-- in-app notification and no email before the renewed term ended.
--
-- Each reminder now records the end date it is for. The key becomes
-- (lease_id, reminder_type, lease_end_date): one reminder of each kind per
-- end date, so a re-run of the queue on the same day still inserts nothing,
-- and a new end date gets its own three. send-lease-reminders expires a
-- queued reminder whose end date no longer matches the lease (renewed or
-- terminated between the 06:00 queue and the 06:30 drain) instead of sending
-- a date that no longer holds.

alter table public.lease_reminders add column lease_end_date date;

-- Existing rows: the queue inserts a reminder on the day the lease is exactly
-- 30, 7 or 1 day(s) from its end (current_date, UTC), so its end date then was
-- the insert date plus that offset.
update public.lease_reminders
set lease_end_date = (created_at at time zone 'UTC')::date
  + case reminder_type
      when '30_days' then 30
      when '7_days' then 7
      else 1
    end
where lease_end_date is null;

alter table public.lease_reminders alter column lease_end_date set not null;

alter table public.lease_reminders
  drop constraint lease_reminders_unique_per_lease_type;
alter table public.lease_reminders
  add constraint lease_reminders_unique_per_lease_term
  unique (lease_id, reminder_type, lease_end_date);

comment on column public.lease_reminders.lease_end_date is
  'The lease end date this reminder is for. A renewal moves leases.end_date, so the next term queues its own reminders; send-lease-reminders expires a queued row whose date no longer matches the lease.';

create or replace function public.queue_lease_reminders()
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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
      insert into public.lease_reminders (lease_id, reminder_type, lease_end_date)
      values (v_lease.id, '30_days', v_lease.end_date)
      on conflict (lease_id, reminder_type, lease_end_date) do nothing;
    end if;

    -- 7-day reminder: queue when lease expires in exactly 7 days
    if v_days_until_expiry = 7 then
      insert into public.lease_reminders (lease_id, reminder_type, lease_end_date)
      values (v_lease.id, '7_days', v_lease.end_date)
      on conflict (lease_id, reminder_type, lease_end_date) do nothing;
    end if;

    -- 1-day reminder: queue when lease expires in exactly 1 day
    if v_days_until_expiry = 1 then
      insert into public.lease_reminders (lease_id, reminder_type, lease_end_date)
      values (v_lease.id, '1_day', v_lease.end_date)
      on conflict (lease_id, reminder_type, lease_end_date) do nothing;
    end if;
  end loop;
end;
$function$;

revoke all on function public.queue_lease_reminders() from public, anon, authenticated;
