-- =============================================================================
-- Phase 66.1 - Postgres-backed rate limiting (RATE-01, RATE-02, D-01, D-10).
--
-- Creates public.rate_limit_counters, the public.check_rate_limit() SECURITY
-- DEFINER RPC that every edge function will call through
-- supabase/functions/_shared/rate-limit.ts, and a bounded
-- public.cleanup_rate_limit_counters() sweep scheduled on pg_cron at 3:25 UTC.
--
-- Context: every rate limit in this product had been a no-op for months. The
-- Upstash free-tier database backing _shared/rate-limit.ts was reaped for
-- inactivity, and because the limiter lived in a different failure domain from
-- the writes it guarded, it was written to fail OPEN. Full latency cost, zero
-- enforcement, and nothing anywhere noticed. D-01 moves the limiter into this
-- database so it shares a failure domain with the write it guards; D-02 removes
-- the fail-open branch entirely.
--
-- -----------------------------------------------------------------------------
-- (1) NOT APPLIED BY THE PLAN THAT AUTHORS IT.
--
--     Plan 66.1-01 authors this file and applies nothing. Plan 66.1-02 is the
--     single blocking, owner-gated apply and runs this through Supabase MCP
--     apply_migration; the filename is reconciled afterwards to the
--     prod-assigned timestamp returned by list_migrations (the
--     migration-mcp-prod-drift convention). 66.1-02 is therefore the FIRST time
--     any statement below is parsed by a PostgreSQL server.
--
--     Authored in pure ASCII on purpose: the file's bytes pass through a model
--     on that hop, and this project has a recorded incident of that path
--     corrupting non-ASCII source.
--
-- -----------------------------------------------------------------------------
-- (2) THE TWO GUARDS ARE THE DESIGN. DO NOT REMOVE EITHER.
--
--     INSERT ... ON CONFLICT DO UPDATE ... WHERE guards ONLY THE UPDATE PATH.
--     The first request of each new window has no conflict, so that WHERE is
--     never evaluated for it.
--
--     A one-guard version therefore admits one request past a saturated
--     previous window AT EVERY WINDOW BOUNDARY, FOREVER - and it reads as
--     completely correct in review, because the WHERE clause a reviewer looks
--     for is present. It is also completely invisible to a sequential test.
--
--     So the single statement below carries BOTH:
--
--       GUARD 1 - on the INSERT ... SELECT, comparing the weighted previous
--                 window against the limit before any row is written.
--       GUARD 2 - on the ON CONFLICT DO UPDATE, evaluated after the row lock is
--                 taken, against the freshly re-read tuple.
--
--     Verified against PostgreSQL 17.11. GUARD 1's effect directly: prev=100,
--     limit=10, 5% into the new window -> allowed = false AND zero rows written.
--
--     And the concurrency half, measured with 64 pgbench clients x 40
--     transactions = 2560 attempts against one key, limit 100:
--
--       this implementation (two guards, one statement) : 100 / 100 / 100
--       naive check-then-act, 64 clients                : 159 / 156 / 161
--       naive check-then-act, ONE client                : 100
--
--     The last row is why the acceptance test is what it is. A naive limiter
--     over-admits by 56-61% under load and passes cleanly single-threaded.
--     tests/integration/rls/rate-limit-concurrency.rls.test.ts drives 64
--     genuinely parallel callers, asserts exactly 100 admissions, asserts the
--     harness actually interleaved, and asserts GUARD 1 by BOTH allowed = false
--     and a zero row count at the current window index. That file is what
--     catches a regression here; a sequential rewrite of it certifies nothing.
--
-- -----------------------------------------------------------------------------
-- (3) THERE IS NO ARCHIVE TABLE, AND THAT IS DELIBERATE.
--
--     This is a knowing deviation from the project-wide archive-then-delete
--     retention norm (cleanup_old_security_events, cleanup_old_errors,
--     cleanup_old_webhook_events, cleanup_old_notifications all archive first).
--     Do not "make this consistent with the other retention jobs". Consistency
--     here is the bug.
--
--     These rows are ephemeral counters with no evidentiary value whatsoever,
--     and roughly half of them are keyed on IP addresses. Copying them into a
--     durable second table would MANUFACTURE A PERMANENT IP LOG out of data
--     that is otherwise gone within two windows. A reviewer pattern-matching on
--     the four sibling retention jobs will want to add one; the plan's
--     acceptance gate asserts zero archive identifiers in executable SQL for
--     exactly that reason.
--
-- -----------------------------------------------------------------------------
-- (4) public.check_rate_limit IS NOT stripe.check_rate_limit.
--
--     The Stripe FDW extension owns a same-named function in the stripe schema
--     (see 20260403183454_fix_stripe_check_rate_limit_search_path.sql). It is
--     extension-managed and entirely unrelated to this one. A bare
--     `check_rate_limit` is therefore AMBIGUOUS in this database and its
--     resolution depends on session search_path state.
--
--     Every reference in this file is schema-qualified public.*, and the
--     function pins `set search_path = public`, so no search_path state can
--     retarget it in either direction.
-- =============================================================================

-- =============================================================================
-- 1. public.rate_limit_counters
--
--    One row per (bucket key, window index). The approximated sliding window
--    needs at most two rows per key alive at any instant: the current window
--    and the previous one it is weighted against.
-- =============================================================================

create table public.rate_limit_counters (
  bucket_key    text        not null,
  window_index  bigint      not null,
  request_count integer     not null,
  expires_at    timestamptz not null,
  constraint rate_limit_counters_pkey primary key (bucket_key, window_index),
  constraint rate_limit_counters_request_count_check check (request_count >= 0),
  -- Bounds the key space against a hostile p_bucket_key, and it is the ONLY
  -- bound that covers every key. 66.1-04's MAX_FORWARDED_IP_LENGTH (45) applies
  -- solely to an address arriving on the trusted-forward path; the other key
  -- sources -- an explicit options.identifier such as a token hash, and the
  -- connection-address fallback -- never pass through it. So this CHECK is the
  -- floor for all of them, not a backstop behind a tighter edge-side rule.
  constraint rate_limit_counters_bucket_key_check
    check (length(bucket_key) between 1 and 512)
)
-- HOT updates need free space on the page to reuse. Measured: 99.6% of updates
-- were HOT at fillfactor 70 over 660k updates. Without headroom every increment
-- migrates the tuple to a new page and re-inserts both index entries.
with (fillfactor = 70);

-- THE ABSENCE OF AN INDEX ON request_count IS LOAD-BEARING, NOT AN OMISSION.
-- HOT updates require that the updated column is not referenced by any index,
-- and request_count is the only column this table ever updates. expires_at is
-- indexed but never updated, so that index costs one entry per INSERT (a key's
-- first request in a window) and nothing per UPDATE (every request after it).
-- The cost is amortised in the right direction. Adding an index on
-- request_count, or dropping fillfactor = 70, turns every increment into a page
-- migration plus index churn on what will be the hottest-written table here.
create index rate_limit_counters_expires_at_idx
  on public.rate_limit_counters (expires_at);

-- This table's whole life is UPDATE churn. Default autovacuum thresholds are
-- tuned for tables that mostly grow, and would let dead tuples accumulate
-- between the once-daily sweep.
alter table public.rate_limit_counters set (
  autovacuum_vacuum_scale_factor  = 0.02,
  autovacuum_analyze_scale_factor = 0.05,
  autovacuum_vacuum_cost_delay    = 0
);

-- bucket_key HOLDS RAW IP ADDRESSES, NOT HASHES, AND THAT IS A DECISION.
-- House precedent: security_events.ip_address and user_errors.ip_address both
-- store raw addresses. Two things make it acceptable here and they are the two
-- things a future change must preserve: the retention bound is at most two
-- windows (an hour, at the largest configured window), and the table is
-- service_role-only with no archive copy.
--
-- CORRECTED BY 20260822122606: THE FIRST PRECONDITION WAS NEVER IMPLEMENTED.
-- `expires_at` is an inert marker. The only deletion path is
-- cleanup_rate_limit_counters(), and its only caller is the 03:25 UTC cron job,
-- so real retention is up to ~24h rather than two windows. That migration fixed
-- the LIVE table comment; this line fixes the repo copy, which is the one a
-- change-author reads and the one framed as an invariant to preserve. Anyone
-- relying on the retention bound as the privacy argument must either tighten the
-- sweep or hash the key -- the second precondition (service_role-only, no
-- archive copy) still holds and is doing all the work on its own. Hashing would make production abuse
-- triage impossible for a table whose entire purpose IS abuse response - an
-- operator investigating a flood cannot act on a digest.
alter table public.rate_limit_counters enable row level security;

-- One policy per operation per role (CLAUDE.md), matching the
-- security_events_archive precedent in 20260306170000. Never a single
-- `for all` policy.
create policy "rate_limit_counters_select_service_role"
  on public.rate_limit_counters for select to service_role using (true);
create policy "rate_limit_counters_insert_service_role"
  on public.rate_limit_counters for insert to service_role with check (true);
create policy "rate_limit_counters_update_service_role"
  on public.rate_limit_counters for update to service_role using (true) with check (true);
create policy "rate_limit_counters_delete_service_role"
  on public.rate_limit_counters for delete to service_role using (true);

revoke all on table public.rate_limit_counters from public, anon, authenticated;

comment on table public.rate_limit_counters is
  'RATE-01 sliding-window rate-limit counters, one row per (bucket_key, window_index). Written only by public.check_rate_limit(), swept by public.cleanup_rate_limit_counters(). service_role-only, no second copy anywhere: bucket_key holds raw client IPs for a bounded life of at most two windows. fillfactor 70 with request_count deliberately unindexed so increments stay HOT.';

-- =============================================================================
-- 2. public.check_rate_limit(text, integer, integer)
--
--    Approximated sliding window, reproducing the weighting the deleted Upstash
--    Ratelimit.slidingWindow used, so the configured limits at all five call
--    sites keep the meaning they were chosen with.
--
--    SECURITY DEFINER with search_path pinned to public, per CLAUDE.md. No
--    auth.uid() check: the only intended caller is an edge function holding the
--    service-role key, and the grant discipline below - not a uid guard - is
--    what keeps this off every browser-reachable code path.
-- =============================================================================

create or replace function public.check_rate_limit(
  p_bucket_key   text,
  p_max_requests integer,
  -- p_window_ms IS integer, NOT bigint, ON PURPOSE. Hit during verification:
  -- with a bigint parameter a plain SQL literal (check_rate_limit('k', 100,
  -- 3600000)) fails function resolution with "No function matches the given
  -- name and argument types", because the literal types as integer. PostgREST
  -- casts from JSON so the RPC path is unaffected either way, but every
  -- psql-based test, RLS integration test and manual select would need an
  -- explicit cast. integer caps the window at ~24 days, three orders of
  -- magnitude above the largest window in use (1 hour). Internal arithmetic
  -- still promotes to bigint via v_window_ms.
  p_window_ms    integer
)
returns table (
  allowed     boolean,
  limit_value integer,
  remaining   integer,
  reset_at_ms bigint
)
language plpgsql
security definer
set search_path = public
-- Bounds the hot-key contention case. Without this a flood on one key queues
-- callers behind the row lock until the statement or gateway times out; with
-- it, a contended call raises 55P03 in 250ms and the edge function (66.1-03)
-- treats that as DENY. Shedding load under flood is the correct fail-closed
-- behaviour. Note that denied requests take the row lock too, so the ATTACK
-- rate sets contention, not the configured limit.
set lock_timeout = '250ms'
as $$
declare
  v_window_ms     bigint;
  v_now_ms        bigint;
  v_window_index  bigint;
  v_elapsed_ratio numeric;
  v_prev_count    integer;
  v_prev_weighted integer;
  v_new_count     integer;
  v_reset_ms      bigint;
begin
  if p_bucket_key is null or length(p_bucket_key) = 0 or length(p_bucket_key) > 512 then
    raise exception 'check_rate_limit: p_bucket_key must be 1..512 characters';
  end if;
  if p_max_requests is null or p_max_requests < 1 then
    raise exception 'check_rate_limit: p_max_requests must be >= 1';
  end if;
  if p_window_ms is null or p_window_ms < 1000 then
    raise exception 'check_rate_limit: p_window_ms must be >= 1000';
  end if;

  v_window_ms     := p_window_ms::bigint;
  v_now_ms        := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_window_index  := v_now_ms / v_window_ms;
  v_elapsed_ratio := (v_now_ms % v_window_ms)::numeric / v_window_ms::numeric;
  v_reset_ms      := (v_window_index + 1) * v_window_ms;

  -- UNLOCKED READ, DELIBERATELY. The previous window is frozen: every backend
  -- reads the same server clock, so no session that can still be writing
  -- window N-1 exists once any session has entered window N. There is nothing
  -- for a lock to protect here.
  select c.request_count into v_prev_count
  from public.rate_limit_counters c
  where c.bucket_key   = p_bucket_key
    and c.window_index = v_window_index - 1;

  -- Upstash's weighting, reproduced exactly:
  --   floor((1 - elapsed_fraction) * previous_window_count)
  v_prev_weighted := floor((1 - v_elapsed_ratio) * coalesce(v_prev_count, 0))::integer;

  insert into public.rate_limit_counters as c
    (bucket_key, window_index, request_count, expires_at)
  select
    p_bucket_key,
    v_window_index,
    1,
    -- Needed as the "previous window" for all of window N+1, so it must
    -- outlive the end of N+1. Deterministic from the window boundary rather
    -- than from now(), unlike Upstash's PEXPIRE(window*2 + 1000).
    to_timestamp(((v_window_index + 2) * v_window_ms)::numeric / 1000.0)
  -- GUARD 1. Without this, the FIRST request of a new window is admitted
  -- unconditionally even when the weighted previous window already exceeds the
  -- limit -- the INSERT path never consults the limit at all. This is the
  -- single easiest bug to ship here. Verified: prev=100, limit=10, 5% into the
  -- new window -> allowed=false AND zero rows written.
  where v_prev_weighted < p_max_requests
  on conflict (bucket_key, window_index) do update
    set request_count = c.request_count + 1
    -- GUARD 2. Evaluated AFTER the row lock is taken, against the freshly
    -- re-read tuple. This is the atomicity.
    where c.request_count + v_prev_weighted < p_max_requests
  returning c.request_count into v_new_count;

  -- NULL means one of: guard 1 skipped the insert, or guard 2 rejected the
  -- update. Both are "denied", and neither wrote anything.
  if v_new_count is null then
    return query select false, p_max_requests, 0, v_reset_ms;
    return;
  end if;

  return query select
    true,
    p_max_requests,
    greatest(p_max_requests - (v_new_count + v_prev_weighted), 0),
    v_reset_ms;
end;
$$;

comment on function public.check_rate_limit(text, integer, integer) is
  'Approximated sliding-window rate limiter (RATE-01). Reproduces the weighting Upstash''s Ratelimit.slidingWindow used: floor((1 - elapsed_fraction) * previous_window_count) + current_window_count, compared against the limit. The decision and the increment are one statement: ON CONFLICT DO UPDATE takes the row lock before evaluating its WHERE, so concurrent callers serialize and no read-then-write window exists. A denied request writes nothing and burns no budget. service_role-only; the SECURITY DEFINER context is what lets edge functions call it without exposing a griefing surface to anon.';

-- GRANT DISCIPLINE. THE REVOKE IS NOT OPTIONAL AND ITS POSITION IS LOAD-BEARING.
--
-- PostgreSQL AUTO-GRANTS EXECUTE TO PUBLIC at function creation, and the anon
-- role inherits PUBLIC. So a grant-only (or grant-then-revoke) file leaves this
-- function callable by any unauthenticated browser holding the publishable key,
-- NO MATTER WHAT THE BODY DOES.
--
-- "It is SECURITY DEFINER and checks nothing about the caller, so it must be
-- safe" is exactly the reasoning that produces the bug. The impact here is not
-- information disclosure: an anon caller who can reach the limiter can burn any
-- victim's bucket to zero and deny service to real applicants on the product's
-- only public unauthenticated write surface, with no credentials and no trace
-- (T-66.1-03, T-66.1-04). Pinned by
-- tests/integration/rls/anon-rpc-grants.rls.test.ts.
revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

-- =============================================================================
-- 3. public.cleanup_rate_limit_counters()
--
--    Batching shape copied from cleanup_old_notifications() (20260719202447)
--    and the Phase 66 sweep (20260807003630): LIMIT 10000 + FOR UPDATE SKIP
--    LOCKED to bound lock hold time and WAL pressure, GET DIAGNOSTICS for the
--    row count, RAISE NOTICE for the cron run log.
--
--    If this job fails entirely the limiter keeps working - lookups are
--    O(log n) on the primary key and measured 0.032 ms at 200k rows - so the
--    failure mode is storage cost, not a broken control (T-66.1-05). That
--    asymmetry is why once-daily is sufficient and why the LOOP, not the
--    frequency, is the mitigation.
-- =============================================================================

create or replace function public.cleanup_rate_limit_counters()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch integer;
  v_total integer := 0;
  v_iter  integer := 0;
begin
  -- Bounded batches, matching cleanup_old_notifications / the Phase 66 sweep.
  -- The LOOP is the one deviation and it is deliberate: this table churns at
  -- minute granularity, so a single 10k batch per day cannot keep up under any
  -- load worth rate limiting - an adversarial distributed scan runs two orders
  -- of magnitude ahead of it and the table would simply never drain. 50
  -- iterations caps one run at 500k rows.
  loop
    v_iter := v_iter + 1;

    with due as (
      select bucket_key, window_index
      from public.rate_limit_counters
      where expires_at < now()
      limit 10000
      for update skip locked
    )
    delete from public.rate_limit_counters c
    using due
    where c.bucket_key   = due.bucket_key
      and c.window_index = due.window_index;

    get diagnostics v_batch = row_count;
    v_total := v_total + v_batch;

    exit when v_batch < 10000 or v_iter >= 50;
  end loop;

  raise notice 'cleanup_rate_limit_counters: deleted % row(s) in % batch(es)', v_total, v_iter;
  return v_total;
end;
$$;

comment on function public.cleanup_rate_limit_counters() is
  'Deletes expired public.rate_limit_counters rows. No archive table: these are ephemeral counters with no audit value, and expires_at is at most two windows past the row''s creation. Bounded at 10000 rows per batch with FOR UPDATE SKIP LOCKED, capped at 50 batches per run. service_role-only.';

-- Same reasoning as the check_rate_limit grants above: PostgreSQL auto-grants
-- EXECUTE to PUBLIC at creation and anon inherits PUBLIC, so the revoke must
-- come first and must name both Supabase client roles explicitly. The pg_cron
-- job runs as `postgres` -- the role that scheduled it, verified against
-- cron.job.username in production -- and the function is SECURITY DEFINER, so it
-- executes as its owner regardless. The service_role grant below is for manual
-- and edge-function invocation, not for the sweep.
revoke all on function public.cleanup_rate_limit_counters() from public, anon, authenticated;
grant execute on function public.cleanup_rate_limit_counters() to service_role;

-- =============================================================================
-- 4. Schedule the sweep
--
--    Named SECURITY DEFINER function, never inline SQL in cron.schedule
--    (CLAUDE.md). The third argument is a single function call and nothing else,
--    so the logic stays versioned in this repository instead of in a cron row.
--
--    SLOT CHOICE - minute :25, verified against production 2026-08-06. The
--    3 AM UTC window is dense: minutes 0, 5, 10, 15, 20, 30, 45 and 50 are
--    taken (cleanup-cron-history, cleanup-pg-net-responses,
--    cleanup-security-events, cleanup-errors, expire-trials,
--    cleanup-webhook-events, process-account-deletions, cleanup-notifications),
--    and minute :35 is now Phase 66's anonymize-rental-applications
--    (20260807003630). Free minutes were 25, 40 and 55; this job takes :25 and
--    the fallbacks, in order, are :40 then :55.
--
--    THAT READING IS ASSUMPTION A5 AND IT IS RATED MEDIUM RISK: it was taken on
--    2026-08-06 and another phase can land a job in the meantime. Plan 66.1-02
--    re-queries cron.job immediately before applying this file and moves the
--    minute if :25 is no longer free.
--
--    IDEMPOTENCE. cron.schedule upserts by jobname on current pg_cron, but the
--    explicit unschedule guard (form copied from 20260516054659 and
--    20260807003630) makes the re-apply behaviour independent of that, and
--    leaves no duplicate job row if this file is ever applied twice.
-- =============================================================================

select cron.unschedule('cleanup-rate-limit-counters') where exists (
  select 1 from cron.job where jobname = 'cleanup-rate-limit-counters'
);

select cron.schedule(
  'cleanup-rate-limit-counters',
  '25 3 * * *',
  $$select public.cleanup_rate_limit_counters()$$
);
