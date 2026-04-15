-- Migration: get_deliverability_stats admin RPC
-- Purpose: Admin-only per-template aggregate over public.email_deliverability.
--   Returns typed setof row (not jsonb) so pnpm db:types produces a proper
--   tuple-of-objects TS shape for the admin UI.
-- Affected functions: public.get_deliverability_stats(integer)
-- Requirements: ANALYTICS-02
-- Decisions: D3 (30-day default, 1..365 range), D7 (category first, type fallback
--   — enforced at ingest in the resend-webhook Edge Function, not in this RPC;
--   the RPC groups by whatever template_tag the ingest stored).

create or replace function public.get_deliverability_stats(
  p_days integer default 30
)
returns table (
  template_tag text,
  sent_count bigint,
  delivered_count bigint,
  bounced_count bigint,
  complained_count bigint,
  opened_count bigint,
  bounce_rate numeric,
  complaint_rate numeric
)
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  -- D3: p_days range guard (cheap validation runs before is_admin check)
  if p_days is null or p_days < 1 or p_days > 365 then
    raise exception 'p_days must be between 1 and 365';
  end if;

  -- Admin guard (T-44-04 mitigation)
  if not is_admin() then
    raise exception 'Unauthorized';
  end if;

  -- Per-template aggregates over the trailing p_days window.
  -- sent_count = count(distinct message_id) — deduplicates across event types
  -- and approximates "attempted sends" without adding email.sent to the CHECK
  -- constraint (see 44-RESEARCH.md line 577 note).
  --
  -- bounce_rate / complaint_rate use nullif(sent_count, 0) so a zero-denominator
  -- returns NULL from the division, which we coalesce to 0 — never errors,
  -- never leaks NULL to the UI.
  return query
  select
    ed.template_tag,
    count(distinct ed.message_id) as sent_count,
    count(*) filter (where ed.event_type = 'email.delivered') as delivered_count,
    count(*) filter (where ed.event_type = 'email.bounced') as bounced_count,
    count(*) filter (where ed.event_type = 'email.complained') as complained_count,
    count(*) filter (where ed.event_type = 'email.opened') as opened_count,
    coalesce(
      round(
        (count(*) filter (where ed.event_type = 'email.bounced')::numeric
          / nullif(count(distinct ed.message_id), 0)) * 100,
        2
      ),
      0
    ) as bounce_rate,
    coalesce(
      round(
        (count(*) filter (where ed.event_type = 'email.complained')::numeric
          / nullif(count(distinct ed.message_id), 0)) * 100,
        2
      ),
      0
    ) as complaint_rate
  from public.email_deliverability ed
  where ed.event_at >= now() - make_interval(days => p_days)
  group by ed.template_tag
  order by sent_count desc;
end;
$$;

-- Authenticated role calls the RPC; is_admin() guard enforces role check
-- server-side. grant execute to authenticated is safe because the guard runs
-- before any data is returned.
grant execute on function public.get_deliverability_stats(integer) to authenticated;

comment on function public.get_deliverability_stats(integer) is
  'Admin-only per-template deliverability aggregates over trailing p_days window. Requires is_admin(). p_days range 1..365 (D3). sent_count = distinct message_id count (D7 note). ANALYTICS-02.';
