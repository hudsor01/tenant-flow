-- Rollback for 20260816010000_rate_limit_counters.sql (Phase 66.1 / RATE-01, RATE-02).
-- Run manually if you need to remove the Postgres-backed rate limiter.
--
-- Written BEFORE the apply, on purpose. A reversal discovered mid-incident is a
-- reversal that does not exist. Plan 66.1-02 authors this file in its read-only
-- pre-flight task, ahead of the owner gate that authorises the apply.
--
-- -----------------------------------------------------------------------------
-- THE STATEMENT ORDER IS LOAD-BEARING. DO NOT REORDER.
--
-- 1. cron.unschedule FIRST.
--    Dropping cleanup_rate_limit_counters() while the job row still exists
--    leaves pg_cron invoking a missing function every night at 3:25 UTC. It
--    fails with "function public.cleanup_rate_limit_counters() does not exist",
--    the failure lands only in cron.job_run_details where nobody is looking, and
--    it outlives every memory of this phase. Unscheduling first makes the drop
--    unobservable instead.
--
-- 2/3. Drop the two functions before the table.
--    Not strictly required (neither function is bound to the table by a
--    dependency Postgres enforces), but it keeps the teardown in exact reverse
--    order of the migration's construction, which is the property that makes
--    this script readable a year from now.
--
-- 4. Dropping the table takes its index and ALL FOUR RLS policies with it.
--    rate_limit_counters_expires_at_idx and the four per-operation
--    service_role policies are dependent objects; they need no explicit drop and
--    listing them here would only create statements that fail on a partial
--    rollback.
--
-- 5. Delete the schema_migrations row LAST.
--    This is what makes a re-apply CLEAN. Without it, `supabase db push` and
--    `db diff` still believe 20260816010000 is applied, so the migration is
--    never re-attempted -- and if it is force-applied anyway it fails on
--    `create table` or silently duplicates the cron job. The version literal
--    below must match the version production actually recorded: if the repo
--    filename is ever reconciled to a different prod-assigned timestamp, update
--    this literal in the same commit as the rename.
--
-- -----------------------------------------------------------------------------
-- WHEN THIS IS SAFE TO RUN, AND WHEN IT IS NOT.
--
-- Waves 2 through 4 (this plan, 66.1-03, 66.1-04): SAFE AND FREE. Nothing
-- deployed references any of these objects. The five live edge functions still
-- carry the Upstash module, so dropping the limiter changes the behaviour of
-- zero production code paths.
--
-- After 66.1-05 ships the rewritten _shared/rate-limit.ts: DESTRUCTIVE. The new
-- module fails CLOSED by design -- there is no fail-open branch left. Once it is
-- deployed, dropping check_rate_limit makes every limiter call return PGRST202,
-- which the module treats as DENY, which hard-429s five public surfaces
-- including the product's only public unauthenticated write surface. Documented
-- rather than blocked, because the script must stay runnable during exactly the
-- window in which it is needed.
--
-- Every statement is guarded (`if exists` / `where exists`), so this script is
-- idempotent and safe to run against a partially-applied database -- which is
-- its other job: clearing the residue of a half-completed apply so the retry is
-- clean rather than confusing.
-- =============================================================================

-- 1. Unschedule before anything is dropped.
select cron.unschedule('cleanup-rate-limit-counters') where exists (
  select 1 from cron.job where jobname = 'cleanup-rate-limit-counters'
);

-- 2. The sweep function.
drop function if exists public.cleanup_rate_limit_counters();

-- 3. The limiter itself. Fully qualified by identity arguments so this cannot
--    resolve to stripe.check_rate_limit, the unrelated extension-managed
--    function of the same name (see the migration header, section 4).
drop function if exists public.check_rate_limit(text, integer, integer);

-- 4. The counter table. Takes rate_limit_counters_expires_at_idx and all four
--    service_role policies with it.
drop table if exists public.rate_limit_counters;

-- 5. The applied-migration record. Keep this literal in sync with the filename.
delete from supabase_migrations.schema_migrations where version = '20260816010000';
