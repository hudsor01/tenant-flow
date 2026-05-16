-- Quota audit: bound the two tables that were growing unboundedly and
-- driving the project's grace-period banner.
--
-- 1) `cron.job_run_details` — pg_cron's per-execution history. Audit on
--    2026-05-16 found 71,694 rows / 34 MB, dominated by a now-deleted
--    every-minute job (jobid=22) that ran 61,792 times Mar–Apr. pg_cron
--    never trims this table on its own. A 71,463-row delete cleaned up
--    the historical mess; this migration keeps the slate clean going
--    forward via a 7-day retention cron.
--
-- 2) `net._http_response` — pg_net's response cache. Audit found 30 rows
--    holding 15 MB (99% dead-tuple bloat — autovacuum can reclaim row
--    space but not return disk to the OS without VACUUM FULL). pg_net
--    leaves responses in the table forever by default. Same 7-day
--    retention strategy applies.
--
-- Both jobs sit in the standard 3 AM UTC cleanup window so they share
-- the maintenance flush with the other retention crons. SECURITY DEFINER
-- + `SET search_path = public` follows the CLAUDE.md cron job convention.
-- Both functions run inside an autonomous statement, so the row deletes
-- can be reclaimed by routine autovacuum without holding a long lock.

begin;

-- ============================================================================
-- 1. cron_job_run_details_cleanup — keep the last 7 days of pg_cron history.
-- ============================================================================
create or replace function public.cleanup_cron_job_run_details()
returns integer
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  deleted_count integer;
begin
  delete from cron.job_run_details
  where start_time < now() - interval '7 days';

  get diagnostics deleted_count = row_count;

  raise notice 'cleanup_cron_job_run_details: deleted % row(s)', deleted_count;
  return deleted_count;
end;
$function$;

comment on function public.cleanup_cron_job_run_details() is
  '7-day retention on cron.job_run_details. pg_cron does not trim this table itself; without retention the project accumulated 71k+ rows / 34 MB before the 2026-05-16 audit.';

select cron.unschedule('cleanup-cron-history') where exists (
  select 1 from cron.job where jobname = 'cleanup-cron-history'
);

select cron.schedule(
  'cleanup-cron-history',
  '0 3 * * *',
  $$select public.cleanup_cron_job_run_details();$$
);

-- ============================================================================
-- 2. pg_net_http_response_cleanup — keep the last 7 days of HTTP responses.
-- ============================================================================
create or replace function public.cleanup_pg_net_http_responses()
returns integer
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  deleted_count integer;
begin
  delete from net._http_response
  where created < now() - interval '7 days';

  get diagnostics deleted_count = row_count;

  raise notice 'cleanup_pg_net_http_responses: deleted % row(s)', deleted_count;
  return deleted_count;
end;
$function$;

comment on function public.cleanup_pg_net_http_responses() is
  '7-day retention on net._http_response (pg_net response cache). pg_net keeps responses forever by default; without retention the table sat at 15 MB of bloat for ~30 actual rows.';

select cron.unschedule('cleanup-pg-net-responses') where exists (
  select 1 from cron.job where jobname = 'cleanup-pg-net-responses'
);

select cron.schedule(
  'cleanup-pg-net-responses',
  '0 3 * * *',
  $$select public.cleanup_pg_net_http_responses();$$
);

commit;
