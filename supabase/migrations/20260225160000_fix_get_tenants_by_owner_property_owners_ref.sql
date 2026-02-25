-- migration: fix get_tenants_by_owner broken property_owners reference
-- purpose: rewrite to use properties.owner_user_id instead of joining
--   through the non-existent property_owners table (renamed to
--   stripe_connected_accounts in 20251220100000)
-- affected function: get_tenants_by_owner(uuid)
-- note: this function has zero callers but should still work correctly.
--   unlike get_tenants_with_lease_by_owner, this returns tenant ids
--   across ALL leases (not just active ones).

create or replace function public.get_tenants_by_owner(p_user_id uuid)
returns setof uuid
language sql
stable
security invoker
set search_path = 'public'
as $$
  -- only returns results if the caller is the same user requesting their own data
  -- auth.uid() returns the authenticated user's id from the jwt
  select distinct t.id
  from tenants t
  inner join lease_tenants lt on lt.tenant_id = t.id
  inner join leases l on l.id = lt.lease_id
  inner join units u on u.id = l.unit_id
  inner join properties p on p.id = u.property_id
  where p.owner_user_id = p_user_id
    and p_user_id = (select auth.uid());  -- authorization: only allow querying your own data
$$;

alter function public.get_tenants_by_owner(uuid) owner to postgres;

comment on function public.get_tenants_by_owner(uuid) is
  'Returns tenant IDs for properties owned by the given user (all leases).
   SECURITY INVOKER: Runs with caller permissions.
   Authorization: Only returns data when p_user_id matches auth.uid().
   Fixed in 20260225160000: removed dead property_owners join, uses properties.owner_user_id.';

-- permissions: only authenticated users can call this
revoke all on function public.get_tenants_by_owner(uuid) from public;
grant all on function public.get_tenants_by_owner(uuid) to authenticated;
