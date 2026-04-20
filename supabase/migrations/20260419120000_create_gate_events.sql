-- Phase 45 (v2.0 Revenue Gates): track paywall-gate hits server-side so admin
-- analytics can compute conversion = subscriptions_tagged / gate_hits.
--
-- Write path: service-role Edge Functions insert on a 402 (see
-- _shared/tier-gate.ts). No authenticated INSERT — this is telemetry.
-- Read path: admin-only RPC get_gate_conversion_stats().

create table if not exists public.gate_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  feature text not null,
  current_plan text,
  current_status text,
  hit_at timestamptz not null default now(),
  constraint gate_events_feature_check
    check (feature = any (array['esign'::text, 'premium_reports'::text]))
);

create index idx_gate_events_feature_hit_at on public.gate_events (feature, hit_at desc);
create index idx_gate_events_user_id on public.gate_events (user_id);

alter table public.gate_events enable row level security;

-- Admin reads only. Service role writes (no RLS policy needed for service role).
create policy "admins can read gate_events"
  on public.gate_events for select
  to authenticated
  using (public.is_admin());

comment on table public.gate_events is
  'Paywall-gate hits (402 responses). Written by _shared/tier-gate.ts; read by admin analytics RPC get_gate_conversion_stats.';

-- Admin RPC: gate_hits, upgrades_from_gate, conversion_rate per feature
-- within a trailing-days window. Joins gate_events against stripe.subscriptions
-- matched by metadata.source so upgrades are attributable.
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
      count(*)::bigint                 as gate_hits,
      count(distinct ge.user_id)::bigint as distinct_users_hit
    from public.gate_events ge
    where ge.hit_at >= now() - make_interval(days => p_days)
    group by ge.feature
  ),
  source_from_feature as (
    -- Map feature name to metadata.source tag. Keep in sync with
    -- _shared/tier-gate.ts upgrade_source values.
    select 'esign'::text            as feature, 'esign_gate'::text    as source
    union all
    select 'premium_reports'::text  as feature, 'reports_gate'::text  as source
  ),
  upgrade_counts as (
    select
      sff.feature,
      count(distinct s.id)::bigint as upgrades_from_gate
    from source_from_feature sff
    left join stripe.subscriptions s
      on s.metadata ->> 'source' = sff.source
      and s.created >= extract(epoch from now() - make_interval(days => p_days))::bigint
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
  'Admin-only. Returns gate_hits / distinct_users_hit / upgrades_from_gate / conversion_rate per paywall feature over trailing p_days window. conversion_rate = upgrades / distinct_users_hit (unique users that saw the gate, not total hit count).';

grant execute on function public.get_gate_conversion_stats(integer) to authenticated;
