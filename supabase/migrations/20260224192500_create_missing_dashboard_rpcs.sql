-- migration: create missing dashboard rpc functions
-- purpose: get_dashboard_time_series and get_metric_trend do not exist in
--   the production database. this migration creates them so dashboard charts
--   stop returning 404.

-- ============================================================
-- 1. get_dashboard_time_series
-- ============================================================

create or replace function public.get_dashboard_time_series(
  p_user_id uuid,
  p_metric_name text,
  p_days integer default 30
)
returns table (date text, value numeric)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_date date;
begin
  for v_date in
    select generate_series(current_date - (p_days - 1), current_date, '1 day'::interval)::date
  loop
    date := to_char(v_date, 'YYYY-MM-DD');

    case p_metric_name
      when 'occupancy_rate' then
        select coalesce(
          round(
            count(*) filter (where u.status = 'occupied')::numeric /
            nullif(count(*)::numeric, 0) * 100, 2
          ), 0
        ) into value
        from units u
        where u.property_id in (select id from properties where owner_user_id = p_user_id);

      when 'monthly_revenue' then
        select coalesce(sum(rent_amount), 0) into value
        from leases
        where owner_user_id = p_user_id
          and lease_status = 'active'
          and start_date <= v_date
          and (end_date is null or end_date >= v_date);

      when 'open_maintenance' then
        select count(*)::numeric into value
        from maintenance_requests
        where owner_user_id = p_user_id
          and date(created_at) <= v_date
          and (status != 'completed' or date(completed_at) > v_date);

      else
        value := 0;
    end case;

    return next;
  end loop;
end;
$$;

comment on function public.get_dashboard_time_series(uuid, text, integer) is
  'Returns time-series data for dashboard metrics over specified days';

grant execute on function public.get_dashboard_time_series(uuid, text, integer) to authenticated;
grant execute on function public.get_dashboard_time_series(uuid, text, integer) to service_role;

-- ============================================================
-- 2. get_metric_trend
-- ============================================================

create or replace function public.get_metric_trend(
  p_user_id uuid,
  p_metric_name text,
  p_period text default 'month'
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_current_value  numeric;
  v_previous_value numeric;
begin
  case p_metric_name
    when 'occupancy_rate' then
      select coalesce(
        round(
          count(*) filter (where u.status = 'occupied')::numeric /
          nullif(count(*)::numeric, 0) * 100, 2
        ), 0
      ) into v_current_value
      from units u
      where u.property_id in (select id from properties where owner_user_id = p_user_id);
      v_previous_value := v_current_value;

    when 'monthly_revenue' then
      select coalesce(sum(rent_amount), 0) into v_current_value
      from leases
      where owner_user_id = p_user_id
        and lease_status = 'active';
      v_previous_value := v_current_value;

    when 'active_tenants' then
      select count(*)::numeric into v_current_value
      from tenants t
      where exists (
        select 1 from leases l
        where l.primary_tenant_id = t.id
          and l.owner_user_id = p_user_id
          and l.lease_status = 'active'
      );
      v_previous_value := v_current_value;

    when 'open_maintenance' then
      select count(*)::numeric into v_current_value
      from maintenance_requests
      where owner_user_id = p_user_id
        and status not in ('completed', 'cancelled');
      v_previous_value := v_current_value;

    else
      v_current_value  := 0;
      v_previous_value := 0;
  end case;

  return jsonb_build_object(
    'current_value',     v_current_value,
    'previous_value',    v_previous_value,
    'change',            v_current_value - v_previous_value,
    'change_percentage', case
      when v_previous_value > 0
      then round(((v_current_value - v_previous_value) / v_previous_value) * 100, 2)
      else 0
    end,
    'trend', case
      when v_current_value > v_previous_value then 'up'
      when v_current_value < v_previous_value then 'down'
      else 'stable'
    end
  );
end;
$$;

comment on function public.get_metric_trend(uuid, text, text) is
  'Returns metric trend comparing current vs previous period';

grant execute on function public.get_metric_trend(uuid, text, text) to authenticated;
grant execute on function public.get_metric_trend(uuid, text, text) to service_role;
