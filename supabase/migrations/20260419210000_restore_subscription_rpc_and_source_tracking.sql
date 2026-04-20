-- Phase 49: billing path restoration.
--
-- Two bugs fixed here:
--   1. `get_subscription_status(p_customer_id)` RPC was referenced by
--      `subscription-keys.ts` in the frontend but DID NOT EXIST in prod.
--      Billing UI degraded to "no subscription" for every user as a result.
--      This migration creates the RPC reading from `public.users.subscription_*`
--      columns (already populated by the stripe-webhooks handler).
--
--   2. `get_gate_conversion_stats` (shipped in v2.0 Phase 45) joined against
--      `stripe.subscriptions` — a table that does not exist in this project
--      because the Stripe Sync Engine is installed but not syncing subscription
--      objects. The admin analytics page 500s on every render.
--
--      Fix: add `public.users.subscription_source text` column and have the
--      stripe-webhooks handler populate it from `checkout.session.metadata.source`
--      (see same-phase change to checkout-session-completed.ts). Rewrite
--      `get_gate_conversion_stats` to join against users.subscription_source.

begin;

-- ============================================================================
-- 1. users.subscription_source — attribution tag from upgrade CTA
-- ============================================================================
alter table public.users
  add column if not exists subscription_source text;

comment on column public.users.subscription_source is
  'Attribution tag (e.g. "esign_gate", "reports_gate") from the upgrade CTA that drove the signup. Populated by stripe-webhooks on checkout.session.completed.';

create index if not exists idx_users_subscription_source
  on public.users (subscription_source)
  where subscription_source is not null;

-- ============================================================================
-- 2. get_subscription_status(p_customer_id) — IDOR-guarded RPC
-- ============================================================================
-- Drop-then-create to survive `supabase db reset` replay. A prior migration
-- (20260414120000_get_subscription_status_rpc.sql) defined this function with
-- `RETURNS TABLE(...)`; we're changing the return shape to jsonb. Postgres
-- rejects that via CREATE OR REPLACE (42P13 cannot change return type).
-- Prod-applied version survived because MCP apply_migration pre-processes,
-- but a fresh dev / CI replay would fail without the explicit drop.
drop function if exists public.get_subscription_status(text);

create or replace function public.get_subscription_status(p_customer_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = 'public'
as $function$
declare
  v_caller_customer_id text;
  v_row record;
begin
  -- IDOR guard: caller may only query their own customer id.
  select u.stripe_customer_id
    into v_caller_customer_id
  from public.users u
  where u.id = (select auth.uid());

  if v_caller_customer_id is null or v_caller_customer_id is distinct from p_customer_id then
    raise exception 'Access denied: p_customer_id does not match caller' using errcode = '42501';
  end if;

  select
    subscription_id,
    subscription_status,
    subscription_plan,
    subscription_current_period_end,
    subscription_cancel_at_period_end
  into v_row
  from public.users
  where stripe_customer_id = p_customer_id;

  if v_row is null then
    return null;
  end if;

  return jsonb_build_object(
    'id', v_row.subscription_id,
    'status', v_row.subscription_status,
    'price_id', v_row.subscription_plan,
    'current_period_end', v_row.subscription_current_period_end,
    'cancel_at_period_end', coalesce(v_row.subscription_cancel_at_period_end, false)
  );
end;
$function$;

comment on function public.get_subscription_status(text) is
  'Authenticated caller reads their own Stripe subscription state from public.users. IDOR-guarded: p_customer_id must match caller''s stripe_customer_id.';

grant execute on function public.get_subscription_status(text) to authenticated;

-- ============================================================================
-- 3. Rewrite get_gate_conversion_stats to join users.subscription_source
-- ============================================================================
create or replace function public.get_gate_conversion_stats(p_days integer default 30)
returns table (
  feature text,
  gate_hits bigint,
  distinct_users_hit bigint,
  upgrades_from_gate bigint,
  conversion_rate numeric
)
language plpgsql
security definer
set search_path = 'public'
as $function$
begin
  if p_days is null or p_days < 1 or p_days > 365 then
    raise exception 'p_days must be between 1 and 365';
  end if;

  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;

  return query
  with hit_counts as (
    select
      ge.feature,
      count(*)::bigint                   as gate_hits,
      count(distinct ge.user_id)::bigint as distinct_users_hit
    from public.gate_events ge
    where ge.hit_at >= now() - make_interval(days => p_days)
    group by ge.feature
  ),
  source_from_feature as (
    select 'esign'::text            as feature, 'esign_gate'::text    as source
    union all
    select 'premium_reports'::text  as feature, 'reports_gate'::text  as source
  ),
  upgrade_counts as (
    select
      sff.feature,
      count(distinct u.id)::bigint as upgrades_from_gate
    from source_from_feature sff
    left join public.users u
      on u.subscription_source = sff.source
      and u.subscription_status in ('active', 'trialing')
      and coalesce(u.subscription_updated_at, u.created_at) >= now() - make_interval(days => p_days)
    group by sff.feature
  )
  select
    sff.feature,
    coalesce(hc.gate_hits, 0)            as gate_hits,
    coalesce(hc.distinct_users_hit, 0)   as distinct_users_hit,
    coalesce(uc.upgrades_from_gate, 0)   as upgrades_from_gate,
    case
      when coalesce(hc.distinct_users_hit, 0) = 0 then null
      else round(
        coalesce(uc.upgrades_from_gate, 0)::numeric
          / hc.distinct_users_hit,
        4
      )
    end as conversion_rate
  from source_from_feature sff
  left join hit_counts hc on hc.feature = sff.feature
  left join upgrade_counts uc on uc.feature = sff.feature
  order by sff.feature;
end;
$function$;

comment on function public.get_gate_conversion_stats(integer) is
  'Admin-only paywall conversion stats. Joins public.gate_events (402s) against public.users.subscription_source (populated by stripe-webhooks on checkout.session.completed). Replaces the original version that joined the non-existent stripe.subscriptions table.';

commit;
