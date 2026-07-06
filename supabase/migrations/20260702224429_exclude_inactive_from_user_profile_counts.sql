-- CRIT-03/04 filter-audit completeness (Phase 25 review cycle 2).
--
-- get_user_profile's owner_profile counts included soft-deleted rows:
--   - units_count did not exclude units with status = 'inactive' (soft-delete
--     enabled by 20260702214657) -> a deleted unit inflated the count.
--   - properties_count did not exclude properties with status = 'inactive'
--     (properties have soft-deleted via status='inactive' pre-existing) -> a
--     deleted property inflated the count.
-- Both counts are single-table / INNER JOIN scans (no phantom-NULL rows), so a
-- plain `<> 'inactive'` predicate is correct (no IS DISTINCT FROM needed).
-- Only the two predicates change; everything else preserved verbatim.
CREATE OR REPLACE FUNCTION public.get_user_profile(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_result jsonb;
begin
  if p_user_id != (select auth.uid()) then
    raise exception 'Access denied: cannot request data for another user';
  end if;

  select jsonb_build_object(
    'id', u.id,
    'email', u.email,
    'first_name', u.first_name,
    'last_name', u.last_name,
    'full_name', u.full_name,
    'phone', u.phone,
    'avatar_url', u.avatar_url,
    'is_admin', u.is_admin,
    'status', u.status,
    'created_at', u.created_at,
    'updated_at', u.updated_at,
    'owner_profile', jsonb_build_object(
      'properties_count', (
        select count(*) from public.properties pr
        where pr.owner_user_id = p_user_id and pr.status <> 'inactive'
      ),
      'units_count', (
        select count(*) from public.units un
        join public.properties pr on pr.id = un.property_id
        where pr.owner_user_id = p_user_id and un.status <> 'inactive'
      )
    )
  ) into v_result
  from public.users u
  where u.id = p_user_id;

  return v_result;
end;
$function$;
