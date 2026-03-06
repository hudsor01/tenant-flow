-- gdpr anonymize cascade
-- purpose: GDPR Article 17 implementation for user account deletion
--   - adds deletion_requested_at column to users table for 30-day grace period
--   - request_account_deletion(): user requests deletion (sets timestamp)
--   - cancel_account_deletion(): user cancels within grace period
--   - anonymize_deleted_user(p_user_id): replaces PII with '[deleted]' placeholders
--   - process_account_deletions(): daily cron processes expired grace periods
-- affected tables: users, tenants, activity, notifications, user_preferences,
--   notification_settings, properties, leases, lease_tenants
-- notes:
--   - financial records (rent_payments, rent_due) are preserved intact
--   - owner deletion is blocked if active leases or pending payments exist
--   - tenant PII on users table replaced; tenants table PII (emergency contacts, ssn) cleared
--   - does NOT delete from auth.users (handled by Supabase Auth separately)

-- ============================================================================
-- part a: add deletion_requested_at column to users
-- ============================================================================

alter table public.users
  add column if not exists deletion_requested_at timestamptz;

comment on column public.users.deletion_requested_at is
  'GDPR Article 17: timestamp when user requested account deletion. Anonymization executes 30 days after this date. NULL means no deletion requested.';

-- ============================================================================
-- part b: request_account_deletion() function
-- allows authenticated user to request their own account deletion
-- sets deletion_requested_at = now() to start the 30-day grace period
-- ============================================================================

create or replace function public.request_account_deletion()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  update public.users
  set deletion_requested_at = now()
  where id = v_user_id;

  if not found then
    raise exception 'user not found';
  end if;
end;
$$;

comment on function public.request_account_deletion() is
  'GDPR: user requests account deletion. Starts 30-day grace period. Anonymization runs after grace period expires via process_account_deletions cron.';

-- ============================================================================
-- part c: anonymize_deleted_user(p_user_id) function
-- called by cron job after 30-day grace period
-- determines user type and anonymizes PII accordingly
-- ============================================================================

create or replace function public.anonymize_deleted_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_type text;
  v_has_active_leases boolean;
  v_has_pending_payments boolean;
begin
  -- determine user type
  select user_type into v_user_type
  from public.users
  where id = p_user_id;

  if v_user_type is null then
    raise exception 'user % not found', p_user_id;
  end if;

  -- ========================================================================
  -- owner deletion path
  -- ========================================================================
  if v_user_type = 'OWNER' then
    -- check for active leases (block deletion if any exist)
    select exists(
      select 1
      from public.leases
      where owner_user_id = p_user_id
        and lease_status = 'active'
    ) into v_has_active_leases;

    if v_has_active_leases then
      raise exception 'Cannot delete account with active leases. Please end all leases first.';
    end if;

    -- check for pending payments (rent_due with status != 'paid')
    select exists(
      select 1
      from public.rent_due rd
      join public.leases l on l.id = rd.lease_id
      where l.owner_user_id = p_user_id
        and rd.status not in ('paid', 'waived')
    ) into v_has_pending_payments;

    if v_has_pending_payments then
      raise exception 'Cannot delete account with pending payments.';
    end if;

    -- soft-delete all properties
    update public.properties
    set status = 'inactive'
    where owner_user_id = p_user_id;

  -- ========================================================================
  -- tenant deletion path
  -- ========================================================================
  elsif v_user_type = 'TENANT' then
    -- anonymize tenant record PII (emergency contacts, ssn)
    -- note: tenants table stores date_of_birth, ssn_last_four, emergency contacts
    -- first_name/last_name/email/phone are on the users table (handled below)
    update public.tenants
    set ssn_last_four = null,
        emergency_contact_name = null,
        emergency_contact_phone = null,
        emergency_contact_relationship = null,
        date_of_birth = null
    where user_id = p_user_id;

    -- lease_tenants: keep records for financial reference but the tenant_id FK
    -- will still point to the anonymized tenant record
    -- no PII fields on lease_tenants to anonymize

  end if;

  -- ========================================================================
  -- common anonymization (both owner and tenant)
  -- ========================================================================

  -- anonymize activity descriptions
  update public.activity
  set description = '[deleted user activity]'
  where user_id = p_user_id;

  -- delete notifications (no need to preserve)
  delete from public.notifications
  where user_id = p_user_id;

  -- delete user_preferences (no need to preserve)
  delete from public.user_preferences
  where user_id = p_user_id;

  -- delete notification_settings (no need to preserve)
  delete from public.notification_settings
  where user_id = p_user_id;

  -- anonymize user record PII
  -- note: users.email is an application column (not auth.users.email)
  update public.users
  set full_name = '[deleted user]',
      email = '[deleted-' || p_user_id::text || ']',
      first_name = null,
      last_name = null,
      phone = null,
      avatar_url = null,
      status = 'inactive'
  where id = p_user_id;

  -- financial records (rent_payments, rent_due) are intentionally preserved
  -- per business requirement: amounts, dates, and lease references remain intact
  -- for the other party's financial reporting
end;
$$;

comment on function public.anonymize_deleted_user(uuid) is
  'GDPR Article 17: anonymizes all PII for a deleted user while preserving financial records. Owner deletion is blocked if active leases or pending payments exist. Called by process_account_deletions cron after 30-day grace period.';

-- ============================================================================
-- part d: process_account_deletions() cron function
-- runs daily, finds users past 30-day grace period, anonymizes each
-- uses for update skip locked for safe concurrent execution
-- handles exceptions per-user so one failure does not block others
-- ============================================================================

create or replace function public.process_account_deletions()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user record;
  v_processed integer := 0;
  v_failed integer := 0;
begin
  for v_user in
    select id
    from public.users
    where deletion_requested_at is not null
      and deletion_requested_at < now() - interval '30 days'
      and status != 'inactive'
    for update skip locked
  loop
    begin
      perform public.anonymize_deleted_user(v_user.id);
      v_processed := v_processed + 1;
    exception when others then
      -- log failure but continue processing other users
      raise warning 'process_account_deletions: failed to anonymize user %: %', v_user.id, sqlerrm;
      v_failed := v_failed + 1;
    end;
  end loop;

  raise notice 'process_account_deletions: processed %, failed %', v_processed, v_failed;
end;
$$;

comment on function public.process_account_deletions() is
  'GDPR: daily cron function that anonymizes users who requested deletion more than 30 days ago. Processes each user independently so one failure does not block others.';

-- ============================================================================
-- part e: schedule the cron job
-- runs at 3:45 AM UTC daily (after cleanup jobs at 3:00, 3:15, 3:30)
-- ============================================================================

select cron.schedule(
  'process-account-deletions',
  '45 3 * * *',
  $$select public.process_account_deletions()$$
);

-- ============================================================================
-- part f: cancel_account_deletion() function
-- allows user to cancel deletion within the 30-day grace period
-- ============================================================================

create or replace function public.cancel_account_deletion()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  update public.users
  set deletion_requested_at = null
  where id = v_user_id;

  if not found then
    raise exception 'user not found';
  end if;
end;
$$;

comment on function public.cancel_account_deletion() is
  'GDPR: allows user to cancel account deletion within the 30-day grace period by clearing deletion_requested_at.';
