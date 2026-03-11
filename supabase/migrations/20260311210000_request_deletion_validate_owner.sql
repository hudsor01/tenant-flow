-- request_deletion_validate_owner
-- purpose: add active-lease and pending-payment validation to request_account_deletion()
--   so owners get immediate feedback instead of waiting 30 days for the cron to reject.
--   previously the checks only existed in anonymize_deleted_user() (cron-time),
--   making the UI error handling in account-data-section unreachable.
-- affected functions: request_account_deletion()

create or replace function public.request_account_deletion()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_user_type text;
  v_has_active_leases boolean;
  v_has_pending_payments boolean;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  -- determine user type for role-specific validation
  select user_type into v_user_type
  from public.users
  where id = v_user_id;

  if v_user_type is null then
    raise exception 'user not found';
  end if;

  -- owner-specific validation (same checks as anonymize_deleted_user)
  if v_user_type = 'OWNER' then
    select exists(
      select 1
      from public.leases
      where owner_user_id = v_user_id
        and lease_status = 'active'
    ) into v_has_active_leases;

    if v_has_active_leases then
      raise exception 'Cannot delete account with active leases. Please end all leases first.';
    end if;

    select exists(
      select 1
      from public.rent_due rd
      join public.leases l on l.id = rd.lease_id
      where l.owner_user_id = v_user_id
        and rd.status not in ('paid', 'waived')
    ) into v_has_pending_payments;

    if v_has_pending_payments then
      raise exception 'Cannot delete account with pending payments.';
    end if;
  end if;

  update public.users
  set deletion_requested_at = now()
  where id = v_user_id;
end;
$$;

comment on function public.request_account_deletion() is
  'GDPR: user requests account deletion. Validates owners have no active leases or pending payments before starting 30-day grace period. Anonymization runs after grace period via process_account_deletions cron.';
