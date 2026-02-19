-- Migration: 20260219100000_implement_check_user_feature_access.sql
--
-- Purpose: Replace the check_user_feature_access stub with real plan-tier logic.
-- The function is called by the backend SubscriptionGuard. Previously it returned
-- true unconditionally, bypassing the paywall for all features.
--
-- Feature → minimum plan tier mapping:
--   basic_properties   → any (FREETRIAL, STARTER, GROWTH, TENANTFLOW_MAX)
--   maintenance        → any plan
--   financial_reports  → any plan
--   api_access         → GROWTH or TENANTFLOW_MAX
--   white_label        → TENANTFLOW_MAX only
--   (unknown features) → true (permissive default, avoid accidental lockouts)

create or replace function public.check_user_feature_access(
  p_user_id text,
  p_feature text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stripe_customer_id text;
  v_price_id           text;
  v_plan_tier          text;
begin
  -- Resolve Stripe subscription to a plan tier (same logic as get_user_plan_limits)
  if exists (select 1 from pg_namespace where nspname = 'stripe')
     and to_regclass('stripe.customers') is not null
     and to_regclass('stripe.subscriptions') is not null
  then
    select id into v_stripe_customer_id
    from stripe.customers
    where (metadata->>'user_id')::uuid = p_user_id::uuid
    limit 1;

    if v_stripe_customer_id is not null then
      select si.price into v_price_id
      from stripe.subscriptions s
      join stripe.subscription_items si on si.subscription = s.id
      where s.customer = v_stripe_customer_id
        and s.status in ('active', 'trialing')
      order by s.created desc
      limit 1;
    end if;
  end if;

  -- Map price ID to plan tier
  v_plan_tier := case v_price_id
    when 'price_1RtWFcP3WCR53Sdo5Li5xHiC' then 'FREETRIAL'
    when 'price_1RtWFcP3WCR53SdoCxiVldhb' then 'STARTER'
    when 'price_1RtWFdP3WCR53SdoArRRXYrL' then 'STARTER'
    when 'price_1SPGCNP3WCR53SdorjDpiSy5' then 'GROWTH'
    when 'price_1SPGCRP3WCR53SdonqLUTJgK' then 'GROWTH'
    when 'price_1SPGCjP3WCR53SdoIpidDn0T' then 'TENANTFLOW_MAX'
    when 'price_1SPGCoP3WCR53SdoID50geIC' then 'TENANTFLOW_MAX'
    else 'STARTER' -- no subscription → treat as starter level
  end;

  -- Return access based on feature and tier
  return case p_feature
    when 'basic_properties'  then true  -- available on all plans
    when 'maintenance'       then true  -- available on all plans
    when 'financial_reports' then true  -- available on all plans
    when 'api_access'        then v_plan_tier in ('GROWTH', 'TENANTFLOW_MAX')
    when 'white_label'       then v_plan_tier = 'TENANTFLOW_MAX'
    else true  -- unknown feature: permissive default (avoid accidental lockouts)
  end;
end;
$$;

comment on function public.check_user_feature_access(text, text) is
  'Returns true if the user''s Stripe plan tier grants access to the named feature.
   Features: basic_properties, maintenance, financial_reports (all tiers);
   api_access (GROWTH+); white_label (TENANTFLOW_MAX only).
   Unknown features return true (permissive default).';

grant execute on function public.check_user_feature_access(text, text) to service_role;
