-- =============================================================================
-- Migration: Update get_user_plan_limits with real plan tiers
-- Created: 2026-02-18
-- Purpose: Replace hardcoded limits (100 properties for all) with plan-specific
--          limits derived from the user's active Stripe subscription.
--          Falls back to STARTER limits for local dev / no-subscription state.
-- Affected tables/functions: public.get_user_plan_limits
-- =============================================================================

-- Plan limits by tier (sourced from packages/shared/src/config/pricing.ts):
--   FREETRIAL:       1 property,  5 units,  10 tenants,   1 GB storage
--   STARTER:         5 property, 25 units,  25 tenants,  10 GB storage
--   GROWTH:         20 property,100 units, 100 tenants,  50 GB storage
--   TENANTFLOW_MAX: unlimited (9999) for all dimensions, 100 GB storage
--
-- Stripe price IDs (sourced from pricing.ts — update if prices change):
--   FREETRIAL monthly:       price_1RtWFcP3WCR53Sdo5Li5xHiC
--   STARTER  monthly/annual: price_1RtWFcP3WCR53SdoCxiVldhb / price_1RtWFdP3WCR53SdoArRRXYrL
--   GROWTH   monthly/annual: price_1SPGCNP3WCR53SdorjDpiSy5 / price_1SPGCRP3WCR53SdonqLUTJgK
--   MAX      monthly/annual: price_1SPGCjP3WCR53SdoIpidDn0T / price_1SPGCoP3WCR53SdoID50geIC

-- Drop existing function first: return type changes require drop+recreate
drop function if exists public.get_user_plan_limits(text);

create or replace function public.get_user_plan_limits(p_user_id text)
returns table(
  property_limit  integer,
  tenant_limit    integer,
  unit_limit      integer,
  storage_gb      integer,
  has_api_access  boolean,
  has_white_label boolean,
  support_level   text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stripe_customer_id text;
  v_price_id           text;
  v_plan_tier          text;
begin
  -- ------------------------------------------------------------------
  -- Step 1: Try to determine the plan tier from the Stripe subscription.
  -- The stripe schema only exists when the Supabase Stripe Sync Engine
  -- is configured. For local development it may not exist, in which case
  -- we fall through to the STARTER default below.
  -- ------------------------------------------------------------------
  if exists (select 1 from pg_namespace where nspname = 'stripe')
     and to_regclass('stripe.customers') is not null
     and to_regclass('stripe.subscriptions') is not null
  then
    -- Look up the Stripe customer linked to this user
    select id
    into v_stripe_customer_id
    from stripe.customers
    where (metadata->>'user_id')::uuid = p_user_id::uuid
    limit 1;

    if v_stripe_customer_id is not null then
      -- Get the price ID from the most-recent active or trialing subscription item
      select si.price
      into v_price_id
      from stripe.subscriptions s
      join stripe.subscription_items si on si.subscription = s.id
      where s.customer = v_stripe_customer_id
        and s.status in ('active', 'trialing')
      order by s.created desc
      limit 1;
    end if;
  end if;

  -- ------------------------------------------------------------------
  -- Step 2: Map price ID → plan tier string.
  -- Unrecognised / NULL price defaults to STARTER (generous for dev).
  -- ------------------------------------------------------------------
  v_plan_tier := case v_price_id
    -- FREETRIAL
    when 'price_1RtWFcP3WCR53Sdo5Li5xHiC' then 'FREETRIAL'
    -- STARTER (monthly + annual)
    when 'price_1RtWFcP3WCR53SdoCxiVldhb' then 'STARTER'
    when 'price_1RtWFdP3WCR53SdoArRRXYrL' then 'STARTER'
    -- GROWTH (monthly + annual)
    when 'price_1SPGCNP3WCR53SdorjDpiSy5' then 'GROWTH'
    when 'price_1SPGCRP3WCR53SdonqLUTJgK' then 'GROWTH'
    -- TENANTFLOW_MAX (monthly + annual)
    when 'price_1SPGCjP3WCR53SdoIpidDn0T' then 'TENANTFLOW_MAX'
    when 'price_1SPGCoP3WCR53SdoID50geIC' then 'TENANTFLOW_MAX'
    -- Unknown price or no subscription → STARTER defaults (permissive for dev)
    else 'STARTER'
  end;

  -- ------------------------------------------------------------------
  -- Step 3: Return limits for the resolved tier.
  -- ------------------------------------------------------------------
  return query
  select
    -- property_limit
    case v_plan_tier
      when 'FREETRIAL'     then 1
      when 'STARTER'       then 5
      when 'GROWTH'        then 20
      when 'TENANTFLOW_MAX' then 9999
      else 5
    end::integer,

    -- tenant_limit
    case v_plan_tier
      when 'FREETRIAL'     then 10
      when 'STARTER'       then 25
      when 'GROWTH'        then 100
      when 'TENANTFLOW_MAX' then 9999
      else 25
    end::integer,

    -- unit_limit
    case v_plan_tier
      when 'FREETRIAL'     then 5
      when 'STARTER'       then 25
      when 'GROWTH'        then 100
      when 'TENANTFLOW_MAX' then 9999
      else 25
    end::integer,

    -- storage_gb
    case v_plan_tier
      when 'FREETRIAL'     then 1
      when 'STARTER'       then 10
      when 'GROWTH'        then 50
      when 'TENANTFLOW_MAX' then 100
      else 10
    end::integer,

    -- has_api_access
    (v_plan_tier in ('GROWTH', 'TENANTFLOW_MAX'))::boolean,

    -- has_white_label
    (v_plan_tier = 'TENANTFLOW_MAX')::boolean,

    -- support_level
    case v_plan_tier
      when 'FREETRIAL'     then 'community'
      when 'STARTER'       then 'email'
      when 'GROWTH'        then 'priority'
      when 'TENANTFLOW_MAX' then 'dedicated'
      else 'email'
    end::text;
end;
$$;

comment on function public.get_user_plan_limits(text) is
'Returns property/tenant/unit limits for a user based on their active Stripe subscription plan.
Falls back to STARTER limits when no Stripe schema exists (local dev) or when no active subscription is found.
Plan tiers: FREETRIAL (1/10/5), STARTER (5/25/25), GROWTH (20/100/100), TENANTFLOW_MAX (9999).';
