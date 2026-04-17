-- Phase 44 / Plan 2 / ANALYTICS-04 -- Admin-only funnel stats RPC
-- Decision: D2 -- signup-cohort semantics (cohort = owners who signed up in
--                window; step counts include their downstream events at ANY time)
-- Pitfall 5 mitigation: return includes `cohort_label` so UI displays the cohort
-- definition next to the numbers, preventing misinterpretation.
--
-- Admin gate: is_admin() guard raises 'Unauthorized' for non-admin callers.
-- Grant pattern matches launch_readiness_instrumentation template: execute
-- granted to authenticated, access controlled by in-function is_admin() check.

create or replace function public.get_funnel_stats(
  p_from timestamptz default now() - interval '30 days',
  p_to timestamptz default now()
) returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_result jsonb;
  v_cohort_label text;
begin
  -- Admin gate (identical to email-deliverability RPC pattern in Plan 1)
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;

  -- Window validation
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
         limit 1) as first_tenant_at,
      (select completed_at from public.onboarding_funnel_events
         where owner_user_id = c.owner_user_id and step_name = 'first_rent'
         limit 1) as first_rent_at
    from cohort c
  ),
  counts as (
    select
      count(*)::bigint                                                as signup_count,
      count(*) filter (where first_property_at is not null)::bigint   as first_property_count,
      count(*) filter (where first_tenant_at is not null)::bigint     as first_tenant_count,
      count(*) filter (where first_rent_at is not null)::bigint       as first_rent_count
    from step_times
  ),
  medians as (
    select
      -- days from signup to each step (from_signup)
      percentile_cont(0.5) within group (order by
        extract(epoch from (first_property_at - signup_at)) / 86400.0
      ) filter (where first_property_at is not null) as median_days_signup_to_property,
      percentile_cont(0.5) within group (order by
        extract(epoch from (first_tenant_at - signup_at)) / 86400.0
      ) filter (where first_tenant_at is not null)   as median_days_signup_to_tenant,
      percentile_cont(0.5) within group (order by
        extract(epoch from (first_rent_at - signup_at)) / 86400.0
      ) filter (where first_rent_at is not null)     as median_days_signup_to_rent,
      -- days between consecutive steps (from_prior)
      percentile_cont(0.5) within group (order by
        extract(epoch from (first_tenant_at - first_property_at)) / 86400.0
      ) filter (where first_tenant_at is not null and first_property_at is not null)
        as median_days_property_to_tenant,
      percentile_cont(0.5) within group (order by
        extract(epoch from (first_rent_at - first_tenant_at)) / 86400.0
      ) filter (where first_rent_at is not null and first_tenant_at is not null)
        as median_days_tenant_to_rent
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
      ),
      jsonb_build_object(
        'step', 'first_rent',
        'step_order', 4,
        'count', c.first_rent_count,
        'conversion_rate_from_prior',
          round(c.first_rent_count::numeric / nullif(c.first_tenant_count, 0), 4),
        'conversion_rate_from_signup',
          round(c.first_rent_count::numeric / nullif(c.signup_count, 0), 4),
        'median_days_from_prior',  m.median_days_tenant_to_rent,
        'median_days_from_signup', m.median_days_signup_to_rent
      )
    )
  )
  into v_result
  from counts c, medians m;

  return v_result;
end;
$$;

grant execute on function public.get_funnel_stats(timestamptz, timestamptz) to authenticated;

comment on function public.get_funnel_stats(timestamptz, timestamptz) is
  'Admin-only. Returns signup-cohort funnel stats (D2): for owners whose signup is in [p_from, p_to], counts + conversion rates + median-days-to-step for first_property/first_tenant/first_rent (measured at ANY time, not only within window). Always returns 4 step rows even when cohort is empty. Guarded by is_admin(); raises Unauthorized otherwise.';
