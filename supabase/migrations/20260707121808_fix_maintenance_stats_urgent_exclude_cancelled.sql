-- Phase 27 review c7: the Urgent KPI counted cancelled-urgent requests
-- (priority='urgent' AND status <> 'completed' → cancelled slips through), keeping
-- the red "needs attention" beam lit for terminally-cancelled items and diverging
-- from the urgent() LIST factory which excludes cancelled
-- (.not(status,in,("completed","cancelled"))). Unify: exclude cancelled too.
-- CREATE OR REPLACE (2-arg signature already exists) preserves grants.
CREATE OR REPLACE FUNCTION public.get_maintenance_stats(
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
      'urgent', count(*) filter (where priority = 'urgent' and status not in ('completed', 'cancelled')),
      'total', count(*)
    )
    from maintenance_requests
    where owner_user_id = p_user_id
  );
end;
$function$;
