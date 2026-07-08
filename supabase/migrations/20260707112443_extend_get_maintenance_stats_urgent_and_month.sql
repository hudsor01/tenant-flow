-- MAINT-07 (Phase 27 review c2): the maintenance stat cards were computed
-- client-side from the paginated list() (capped at 50 rows), so they under-report
-- for owners with >50 requests. Move the counts to the RPC (CLAUDE.md mandates
-- single-RPC stats). Add `urgent` and `completed_this_month`; the latter takes a
-- caller-supplied local month-start (timestamptz) so "this month" stays correct in
-- the owner's timezone rather than UTC. DROP+CREATE because the signature changes;
-- the new param defaults so any 1-arg caller keeps working. Grants replicated.
DROP FUNCTION IF EXISTS public.get_maintenance_stats(uuid);

CREATE FUNCTION public.get_maintenance_stats(
  p_user_id uuid,
  p_month_start timestamptz DEFAULT date_trunc('month', now())
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  -- SEC-01: Validate caller identity
  if p_user_id != (select auth.uid()) then
    raise exception 'Unauthorized';
  end if;

  return (
    select jsonb_build_object(
      'open', count(*) filter (where status = 'open'),
      'assigned', count(*) filter (where status = 'assigned'),
      'in_progress', count(*) filter (where status = 'in_progress'),
      'needs_reassignment', count(*) filter (where status = 'needs_reassignment'),
      'completed', count(*) filter (where status = 'completed'),
      'completed_this_month', count(*) filter (where status = 'completed' and completed_at >= p_month_start),
      'cancelled', count(*) filter (where status = 'cancelled'),
      'on_hold', count(*) filter (where status = 'on_hold'),
      'urgent', count(*) filter (where priority = 'urgent' and status <> 'completed'),
      'total', count(*)
    )
    from maintenance_requests
    where owner_user_id = p_user_id
  );
end;
$function$;

REVOKE ALL ON FUNCTION public.get_maintenance_stats(uuid, timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.get_maintenance_stats(uuid, timestamptz) TO authenticated, service_role;
