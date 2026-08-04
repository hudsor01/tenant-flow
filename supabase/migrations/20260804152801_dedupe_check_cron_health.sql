-- Dedupe cron-failure reporting.
--
-- `check_cron_health()` runs hourly (cron.job `check-cron-health`, `0 * * * *`)
-- and scans a 25-hour window of `cron.job_run_details` for failures, inserting a
-- `user_errors` row and firing `pg_notify` for every match. With no
-- already-reported guard, a SINGLE failed run was re-reported on every
-- subsequent hourly pass — up to 25 times.
--
-- Measured on the retained historical incident (2026-03-23 -> 2026-04-04):
--   select count(*), count(distinct (context->>'job' || '|' || context->>'start_time'))
--   from public.user_errors_archive where error_code = 'CRON_FAILURE';
--   -> 13,587 rows for 744 distinct failures = 18.3x inflation, with a measured
--      ceiling of exactly 25 rows for one failure, matching the 25h window.
-- Those rows are 89.9% of the entire 15,107-row archive.
--
-- Impact of leaving it: the next real cron failure produces a ~25x duplicated
-- Sentry/pg_notify alert storm instead of one alert, and floods `user_errors` —
-- the same table genuine landlord-facing errors land in — with system noise that
-- buries real reports and pushes the daily archive batch toward its LIMIT 10000.
--
-- WHY THE CAST IS LOAD-BEARING. The dedupe key is (job, start_time), stored in
-- `context` by `jsonb_build_object`, which renders timestamptz as an ISO-8601
-- STRING with microseconds:
--     context->>'start_time'  =  '2026-03-23T18:17:00.0005+00:00'
--     start_time::text        =  '2026-03-23 18:17:00.0005+00'
-- Those are different strings, so a naive text comparison NEVER matches and the
-- guard would silently do nothing while looking correct. Verified against real
-- archived rows before writing this migration: the text compare returned false
-- and the cast compare returned true on every sampled row. Compare as
-- timestamptz, never as text.

-- Supporting index. `user_errors` carries only a pkey and a `user_id` index, so
-- the NOT EXISTS below would otherwise seq-scan ~9.3k rows per failure row.
-- Partial on the error code because CRON_FAILURE rows are rare (currently 0),
-- which makes this index tiny and the lookup near-free.
create index if not exists idx_user_errors_cron_failure_dedupe
  on public.user_errors ((context ->> 'job'), created_at desc)
  where error_code = 'CRON_FAILURE';

create or replace function public.check_cron_health()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_failed record;
begin
  -- check for failed jobs in the last 25 hours (catches daily jobs)
  for v_failed in
    select j.jobname, d.status, d.return_message, d.start_time
    from cron.job_run_details d
    join cron.job j on j.jobid = d.jobid
    where d.start_time > now() - interval '25 hours'
      and d.status = 'failed'
      -- Report each (job, start_time) failure exactly once. Without this the
      -- hourly schedule re-reports every failure still inside the 25h window.
      -- The lookback is 26h — one hour wider than the scan window — so a
      -- failure at the very edge of the window cannot slip past the guard and
      -- be reported a second time.
      and not exists (
        select 1
        from public.user_errors ue
        where ue.error_code = 'CRON_FAILURE'
          and ue.created_at > now() - interval '26 hours'
          and ue.context ->> 'job' = j.jobname
          -- timestamptz compare, NOT text: see the header note.
          and (ue.context ->> 'start_time')::timestamptz = d.start_time
      )
    order by d.start_time desc
  loop
    -- insert error into user_errors for Sentry pickup via existing monitoring
    -- user_id is NULL (system-generated error, not user-triggered)
    insert into public.user_errors (
      error_type, error_code, error_message, context
    ) values (
      'application',
      'CRON_FAILURE',
      format('Cron job "%s" failed: %s', v_failed.jobname, v_failed.return_message),
      jsonb_build_object('job', v_failed.jobname, 'start_time', v_failed.start_time)
    );

    -- fire pg_notify for immediate alerting (external listener can forward to Sentry/Slack)
    perform pg_notify('cron_failure', json_build_object(
      'job', v_failed.jobname,
      'error', v_failed.return_message,
      'time', v_failed.start_time
    )::text);
  end loop;
end;
$function$;
