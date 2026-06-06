-- Phase 4 (v4.0): Cron stagger + surgical index cleanup (PERF-01, PERF-04).
--
-- PERF-01 — Stagger the 4 pg_cron cleanup jobs that all fired at `0 3 * * *`
-- (cleanup-cron-history, cleanup-pg-net-responses, cleanup-security-events,
-- expire-trials). The 3 AM window already has :15 (cleanup-errors), :30
-- (cleanup-webhook-events), :45 (process-account-deletions) taken, so the
-- three movers go to the free :05/:10/:20 slots; cleanup-cron-history stays
-- at :00. Rescheduled via cron.alter_job (SCHEDULE-ONLY) so each job's
-- existing command (a named SECURITY DEFINER function) is preserved exactly
-- — never re-specified, never inlined.
--
-- PERF-04 — Drop ONE provably-dead index: idx_properties_property_owner_id.
-- Residue of the demolished ownership model: it was created in base_schema on
-- the old properties.property_owner_id column (since migrated out in favour of
-- owner_user_id), and a later column rename carried it onto
-- properties.stripe_connected_account_id — which is what live pg_get_indexdef
-- reported for it pre-drop. Either way it backs no live query: the only
-- column it could cover (stripe_connected_account_id) appears in code solely
-- as a SELECT projection (property-keys.ts), never in a WHERE/JOIN/ORDER BY,
-- and owner_user_id has its own dedicated index. So this index can never be
-- used by any query at any traffic level — safe to drop regardless of
-- workload. (The stripe_connected_account_id COLUMN stays; only the dead
-- index goes.)
--
-- DELIBERATELY KEPT (NOT dropped): every FK-backing, PK, and unique index,
-- and every other idx_scan=0 index. On this pre-launch low-traffic DB
-- (near-empty business tables) idx_scan=0 is canonically meaningless —
-- Postgres prefers seq scans on tiny tables, so essential indexes (incl. the
-- documents GIN full-text-search index) read as "unused" until tables grow.
-- The broader idx_scan=0 sweep is DEFERRED to a post-launch review against a
-- representative-traffic pg_stat_user_indexes window.

-- PERF-01: schedule-only reschedules (command preserved).
select cron.alter_job(
  job_id := (select jobid from cron.job where jobname = 'cleanup-pg-net-responses'),
  schedule := '5 3 * * *'
);
select cron.alter_job(
  job_id := (select jobid from cron.job where jobname = 'cleanup-security-events'),
  schedule := '10 3 * * *'
);
select cron.alter_job(
  job_id := (select jobid from cron.job where jobname = 'expire-trials'),
  schedule := '20 3 * * *'
);

-- PERF-04: drop the single provably-dead index (projection-only column).
drop index if exists public.idx_properties_property_owner_id;
