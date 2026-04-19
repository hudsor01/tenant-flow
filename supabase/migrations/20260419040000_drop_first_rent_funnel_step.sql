-- Landlord-only cleanup: funnel has no "first_rent" step now that rent_payments
-- is gone. The trigger function is orphaned (its trigger was on rent_payments),
-- the RPC returns a permanently-0 step row, and any historical rows are stale.

-- 1. Drop the orphaned trigger function (trigger already gone with rent_payments)
drop function if exists public.fn_record_first_rent_funnel_event();

-- 2. Purge historical first_rent rows from the funnel table
delete from public.onboarding_funnel_events where step_name = 'first_rent';

-- 3. Tighten the CHECK constraint so 'first_rent' can't be reinserted
alter table public.onboarding_funnel_events drop constraint onboarding_funnel_events_step_check;
alter table public.onboarding_funnel_events add constraint onboarding_funnel_events_step_check
  check (step_name = any (array['signup'::text, 'first_property'::text, 'first_tenant'::text]));

-- 4. Rewrite get_funnel_stats to return 3 steps only (signup -> first_property -> first_tenant)
create or replace function public.get_funnel_stats(
  p_from timestamp with time zone default (now() - '30 days'::interval),
  p_to   timestamp with time zone default now()
)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_result jsonb;
  v_cohort_label text;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;

  if p_from > p_to then
    raise exception 'Invalid window: p_from (%) must be <= p_to (%)', p_from, p_to;
  end if;
  if p_to > now() then
    raise exception 'Invalid window: p_to (%) cannot be in the future', p_to;
  end if;

  v_cohort_label := format(
    'owners who signed up between %s and %s',
    to_char(p_from, 'YYYY-MM-DD HH24:MI UTC'),
    to_char(p_to,   'YYYY-MM-DD HH24:MI UTC')
  );

  with cohort as (
    select owner_user_id, completed_at as signup_at
    from public.onboarding_funnel_events
    where step_name = 'signup'
      and completed_at between p_from and p_to
  ),
  step_times as (
    select
      c.owner_user_id,
      c.signup_at,
      (select completed_at from public.onboarding_funnel_events
         where owner_user_id = c.owner_user_id and step_name = 'first_property'
         limit 1) as first_property_at,
      (select completed_at from public.onboarding_funnel_events
         where owner_user_id = c.owner_user_id and step_name = 'first_tenant'
         limit 1) as first_tenant_at
    from cohort c
  ),
  counts as (
    select
      count(*)::bigint                                                as signup_count,
      count(*) filter (where first_property_at is not null)::bigint   as first_property_count,
      count(*) filter (where first_tenant_at is not null)::bigint     as first_tenant_count
    from step_times
  ),
  medians as (
    select
      percentile_cont(0.5) within group (order by
        extract(epoch from (first_property_at - signup_at)) / 86400.0
      ) filter (where first_property_at is not null) as median_days_signup_to_property,
      percentile_cont(0.5) within group (order by
        extract(epoch from (first_tenant_at - signup_at)) / 86400.0
      ) filter (where first_tenant_at is not null)   as median_days_signup_to_tenant,
      percentile_cont(0.5) within group (order by
        extract(epoch from (first_tenant_at - first_property_at)) / 86400.0
      ) filter (where first_tenant_at is not null and first_property_at is not null)
        as median_days_property_to_tenant
    from step_times
  )
  select jsonb_build_object(
    'from', p_from,
    'to',   p_to,
    'cohort_label', v_cohort_label,
    'medians_computed_at', now(),
    'steps', jsonb_build_array(
      jsonb_build_object(
        'step', 'signup',
        'step_order', 1,
        'count', c.signup_count,
        'conversion_rate_from_prior',   1.0,
        'conversion_rate_from_signup',  1.0,
        'median_days_from_prior',       null,
        'median_days_from_signup',      0.0
      ),
      jsonb_build_object(
        'step', 'first_property',
        'step_order', 2,
        'count', c.first_property_count,
        'conversion_rate_from_prior',
          round(c.first_property_count::numeric / nullif(c.signup_count, 0), 4),
        'conversion_rate_from_signup',
          round(c.first_property_count::numeric / nullif(c.signup_count, 0), 4),
        'median_days_from_prior',  m.median_days_signup_to_property,
        'median_days_from_signup', m.median_days_signup_to_property
      ),
      jsonb_build_object(
        'step', 'first_tenant',
        'step_order', 3,
        'count', c.first_tenant_count,
        'conversion_rate_from_prior',
          round(c.first_tenant_count::numeric / nullif(c.first_property_count, 0), 4),
        'conversion_rate_from_signup',
          round(c.first_tenant_count::numeric / nullif(c.signup_count, 0), 4),
        'median_days_from_prior',  m.median_days_property_to_tenant,
        'median_days_from_signup', m.median_days_signup_to_tenant
      )
    )
  )
  into v_result
  from counts c, medians m;

  return v_result;
end;
$function$;
