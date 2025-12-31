-- Migration: Recreate functions dropped during enum-to-text migration
-- Purpose: Restore activate_lease_with_pending_subscription and get_tenants_with_lease_by_owner functions
-- These functions were dropped because they referenced enum types that are now TEXT columns

-- ============================================================================
-- STEP 1: Recreate activate_lease_with_pending_subscription function
-- ============================================================================
-- This function atomically activates a lease with pending subscription status.
-- Called after both parties (owner and tenant) have signed the lease.
-- Uses TEXT comparison instead of enum types.

create or replace function public.activate_lease_with_pending_subscription(p_lease_id uuid)
returns table(success boolean, error_message text)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_lease record;
begin
  -- Step 1: Lock the lease row to prevent concurrent modifications
  select
    id,
    lease_status,
    owner_signed_at,
    tenant_signed_at,
    stripe_subscription_status
  into v_lease
  from leases
  where id = p_lease_id
  for update;

  if not found then
    return query select false, 'Lease not found'::text;
    return;
  end if;

  -- Step 2: Validate lease state
  if v_lease.lease_status not in ('pending_owner_signature', 'pending_tenant_signature', 'pending_signatures') then
    return query select false, format('Cannot activate lease with status: %s', v_lease.lease_status)::text;
    return;
  end if;

  if v_lease.owner_signed_at is null then
    return query select false, 'Owner has not signed the lease'::text;
    return;
  end if;

  if v_lease.tenant_signed_at is null then
    return query select false, 'Tenant has not signed the lease'::text;
    return;
  end if;

  -- Step 3: Atomically update lease status
  update leases
  set
    lease_status = 'active',
    stripe_subscription_status = 'pending',
    subscription_retry_count = 0,
    subscription_failure_reason = null,
    updated_at = now()
  where id = p_lease_id;

  return query select true, null::text;
end;
$$;

alter function public.activate_lease_with_pending_subscription(uuid) owner to postgres;

comment on function public.activate_lease_with_pending_subscription(uuid) is
  'Atomically activates a lease with pending subscription status. Called after both parties sign.
   Returns success/failure. Caller should then create Stripe subscription and update status to active/failed.';

grant all on function public.activate_lease_with_pending_subscription(uuid) to authenticated;

-- ============================================================================
-- STEP 2: Recreate get_tenants_with_lease_by_owner function
-- ============================================================================
-- This function returns tenant IDs with active leases for properties owned by the given user.
-- Uses TEXT comparison instead of enum types.

create or replace function public.get_tenants_with_lease_by_owner(p_user_id uuid)
returns setof uuid
language sql
stable
set search_path to 'public'
as $$
  select distinct t.id
  from tenants t
  inner join lease_tenants lt on lt.tenant_id = t.id
  inner join leases l on l.id = lt.lease_id
  inner join units u on u.id = l.unit_id
  inner join properties p on p.id = u.property_id
  where p.owner_user_id = p_user_id
    and p_user_id = (select auth.uid())  -- Authorization: only allow querying your own data
    and l.lease_status = 'active';
$$;

alter function public.get_tenants_with_lease_by_owner(uuid) owner to postgres;

comment on function public.get_tenants_with_lease_by_owner(uuid) is
  'Returns tenant IDs with active leases for properties owned by the given user.
   SECURITY INVOKER: Runs with caller permissions.
   Authorization: Only returns data when p_user_id matches auth.uid().
   Updated to use properties.owner_user_id and TEXT lease_status comparison.';

revoke all on function public.get_tenants_with_lease_by_owner(uuid) from public;
grant all on function public.get_tenants_with_lease_by_owner(uuid) to authenticated;
