-- Let acceptance tests assert cron scheduling without exposing the cron schema.
--
-- WHY. rental-applications-retention R10 asserts the retention sweep occupies a
-- unique cron slot, and it SKIPS because PostgREST does not expose `cron` -- the
-- same wall storage-metering hit against `storage`. A skipped security test and
-- a passing one are indistinguishable in a summary line, which is the failure
-- mode this whole review exists to remove, so the answer is to make the fact
-- reachable rather than to accept the skip.
--
-- Same shape as seed_storage_object_for_test and the metering functions:
-- SECURITY DEFINER in `public`, service_role only. Exposing `cron` to PostgREST
-- would widen that surface permanently for every caller to answer two read-only
-- questions.
--
-- Returns counts, never job bodies or command text: a cron command can carry a
-- secret, and this needs to answer "how many" rather than "what runs".
create or replace function public.cron_job_slot_counts(
  p_jobname  text,
  p_schedule text
)
returns table (named_job_count bigint, other_jobs_same_slot bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from cron.job where jobname = p_jobname),
    (select count(*) from cron.job
      where schedule = p_schedule and jobname is distinct from p_jobname);
$$;

comment on function public.cron_job_slot_counts(text, text) is
  'TEST/OPS READ ONLY. Counts cron jobs by name and by schedule slot so acceptance tests can assert a job is registered exactly once on an uncontended slot without the cron schema being exposed to PostgREST. Returns counts only -- never job bodies, which can contain secrets. service_role-only.';

revoke all on function public.cron_job_slot_counts(text, text) from public, anon, authenticated;
grant execute on function public.cron_job_slot_counts(text, text) to service_role;
