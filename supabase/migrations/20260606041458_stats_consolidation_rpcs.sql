-- Phase 3 (v4.0): Stats RPC consolidation (PERF-02, PERF-03).
--
-- Two owner-scoped SECURITY DEFINER stats RPCs mirroring the canonical
-- get_maintenance_stats pattern exactly (jsonb return, search_path locked
-- to public, auth.uid() identity guard, owner_user_id scope, authenticated-
-- only EXECUTE).
--
--  - get_unit_stats: moves the rent total into SQL via
--    sum(rent_amount) filter (...), eliminating the previous UNBOUNDED
--    client-side rent_amount fetch (PERF-02). rent_amount is dollars
--    numeric — NOT converted to cents.
--  - get_tenant_stats: counts active/inactive against tenants.status,
--    replacing the previous BROKEN users.status left-join embed filter
--    (PERF-03 — a deliberate correctness fix; the active/inactive counts
--    MAY differ from the old buggy numbers, which is intended, not a
--    regression). total is unaffected.
--
-- The derived UnitStats/TenantStats fields (vacant, occupancyRate,
-- averageRent, totalTenants, activeTenants, newThisMonth, etc.) are
-- computed in the typed mappers on the frontend, not here.

create or replace function public.get_unit_stats(p_user_id uuid)
  returns jsonb
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
begin
  -- SEC-01: validate caller identity (RLS is bypassed in definer context)
  if p_user_id != (select auth.uid()) then
    raise exception 'Unauthorized';
  end if;

  return (
    select jsonb_build_object(
      'total', count(*) filter (where status != 'inactive'),
      'occupied', count(*) filter (where status = 'occupied'),
      'available', count(*) filter (where status = 'available'),
      'maintenance', count(*) filter (where status = 'maintenance'),
      'totalActualRent',
        coalesce(sum(rent_amount) filter (where status != 'inactive'), 0)
    )
    from units
    where owner_user_id = p_user_id
  );
end;
$function$;

revoke all on function public.get_unit_stats(uuid) from public;
grant execute on function public.get_unit_stats(uuid) to authenticated;

create or replace function public.get_tenant_stats(p_user_id uuid)
  returns jsonb
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
begin
  -- SEC-01: validate caller identity (RLS is bypassed in definer context)
  if p_user_id != (select auth.uid()) then
    raise exception 'Unauthorized';
  end if;

  return (
    select jsonb_build_object(
      'total', count(*),
      'active', count(*) filter (where status = 'active'),
      'inactive', count(*) filter (where status = 'inactive')
    )
    from tenants
    where owner_user_id = p_user_id
  );
end;
$function$;

revoke all on function public.get_tenant_stats(uuid) from public;
grant execute on function public.get_tenant_stats(uuid) to authenticated;
