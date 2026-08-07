-- =============================================================================
-- Phase 66 - Rental Application Intake: applicant PII retention sweep
-- (APPLY-05, D-11a / D-11b / D-11c / D-11d, D-16).
--
-- Seeds the retention window into public.app_config, defines
-- public.anonymize_old_rental_applications(), and schedules it on pg_cron.
--
-- NOT APPLIED BY THE PLAN THAT AUTHORS IT. Plan 66-06 is the single blocking,
-- owner-gated apply step and runs this through Supabase MCP apply_migration;
-- the filename is reconciled afterwards to the prod-assigned timestamp returned
-- by list_migrations (the migration-mcp-prod-drift convention). Authored in
-- pure ASCII on purpose: the file's bytes pass through a model on that hop, and
-- this project has a recorded incident of MCP corrupting non-ASCII source.
--
-- -----------------------------------------------------------------------------
-- (a) THE NUMBER IS THE WHOLE DECISION. 730 DAYS, NOT 180.
--
--     66-CONTEXT.md D-11 originally set this window at 180 days. D-11 is
--     recorded there as SUPERSEDED AND WRONG; D-11a replaces it with 730 days.
--     That correction is the most consequential decision in this phase, so its
--     primary-source basis lives HERE, in the file a future change has to edit,
--     rather than only in a planning document nobody re-reads:
--
--       - HUD administrative complaint: ONE YEAR.
--         42 U.S.C. 3610(a)(1)(A)(i).
--
--       - Federal civil action: TWO YEARS.
--         42 U.S.C. 3613(a)(1)(A) - "not later than 2 years after the
--         occurrence or the termination of an alleged discriminatory housing
--         practice".
--
--       - 42 U.S.C. 3613(a)(1)(B) TOLLS that two-year clock for the entire
--         duration of any pending HUD administrative proceeding, so real
--         exposure runs past three years.
--
--     180 DAYS WAS SHORTER THAN THE SHORTEST FILING WINDOW THAT EXISTS. A sweep
--     that runs too early does not protect the applicant - it destroys the
--     landlord's own evidence that the denial was lawful, and puts them in the
--     "he said, she said" position against a complaint they could otherwise
--     have answered with a file.
--
--     ANY FUTURE PROPOSAL TO SHORTEN THIS WINDOW NEEDS A LEGAL SOURCE THAT
--     REQUIRES IT. There is none - an explicit negative search found nothing
--     capping retention - and the pressure runs the other way: CA and WA
--     practitioner guidance supports 1460 days. That is precisely why the value
--     lives in public.app_config instead of being hardcoded here. Raising it is
--     an UPDATE statement, not a migration and not a deploy.
--
-- -----------------------------------------------------------------------------
-- (b) D-11c - THERE IS NO ARCHIVE TABLE, AND THAT IS DELIBERATE.
--
--     This job knowingly DEVIATES from the project-wide archive-then-delete
--     retention norm (CLAUDE.md; cleanup_old_security_events,
--     cleanup_old_errors, cleanup_old_webhook_events, cleanup_old_notifications
--     all archive first). Do not "make this consistent with the other retention
--     jobs". Consistency here is the bug.
--
--     Archiving would preserve VERBATIM the exact applicant PII that this sweep
--     exists to remove. The row would leave rental_applications and reappear,
--     unredacted, in a second table that no cascade, no owner-facing surface and
--     no reviewer remembers. That is the Phase 52 C2 bug in a new costume: in
--     20260720015620, anonymize_deleted_user() deleted a departing owner's
--     notifications but never touched notifications_archive, leaving their
--     titles and messages in cold storage indefinitely. The strongest form of
--     that fix is not a second delete statement - it is not having a second
--     copy at all.
--
--     This is gated: the plan's acceptance test asserts ZERO occurrences of the
--     word "archive" and ZERO create-table statements in this file's executable
--     SQL, because an executor pattern-matching on the sibling retention jobs
--     will otherwise add one.
--
-- -----------------------------------------------------------------------------
-- (c) D-11b - ANONYMIZE VS DELETE IS A WASH LEGALLY. THE WINDOW IS THE CONTROL.
--
--     The original justification for anonymize-over-delete was also wrong, even
--     though the mechanism survives. A stub of (unit, date, status) cannot
--     answer "why did you deny this applicant", so anonymize-at-N and
--     delete-at-N are legally equivalent. THE WINDOW IS WHAT MATTERS, NOT THE
--     MECHANISM. Anonymize is kept anyway, for three honest reasons and no
--     invented ones:
--
--       1. codebase consistency with anonymize_deleted_user(), which is the
--          project's established PII-clearing shape;
--       2. referential integrity - converted rows point at a live tenant and
--          must not vanish (they are excluded from this sweep entirely, but the
--          mechanism has to be able to coexist with them);
--       3. non-PII aggregate self-audit - an owner can still count how many
--          applications a unit drew and how they were dispositioned.
--
-- -----------------------------------------------------------------------------
-- (d) D-11d - disposition_reason IS DELIBERATELY RETAINED ON THE STUB.
--
--     It partially restores the defensibility the stub otherwise lacks, at
--     negligible cost. It is safe to retain because it is a CLOSED VOCABULARY
--     enforced by rental_applications_disposition_reason_check
--     (20260806120000): seven fixed values, never free text, so it cannot
--     itself become PII that this sweep would then have to clear.
--
-- -----------------------------------------------------------------------------
-- (e) WHAT THE SWEEP CLEARS AND WHAT IT KEEPS.
--
--     MIXED STRATEGY, matching anonymize_deleted_user() in 20260720015620
--     exactly: placeholders for NOT NULL columns, hard NULL for nullable ones.
--     The schema in 20260806120000 was authored around this and says so in its
--     own header - the nullability of the form-required PII columns IS the
--     retention mechanism, not a schema defect. A reviewer who "tightens" any
--     of them to NOT NULL breaks APPLY-05.
--
--       PLACEHOLDER '[deleted]' (3 columns, NOT NULL, cannot be nulled):
--         applicant_first_name, applicant_last_name, applicant_email
--
--       NULL (26 columns, nullable precisely so this sweep can clear them):
--         applicant_phone, desired_move_in_date, current_street, current_city,
--         current_state, current_postal_code, current_landlord_name,
--         current_landlord_phone, reason_for_moving, gross_monthly_income,
--         employer_name, employer_role, employer_months, other_income_source,
--         other_income_amount, pet_details, vehicle_details, reference_1_name,
--         reference_1_relationship, reference_1_phone, reference_2_name,
--         reference_2_relationship, reference_2_phone, owner_notes,
--         submitted_ip, submitted_user_agent
--
--       RETAINED (non-PII stub - enough to show a decision was made and to
--       support an aggregate self-audit):
--         id, owner_user_id, link_id, unit_id, property_label, unit_label,
--         submission_id, status, decided_at, disposition_reason,
--         converted_tenant_id, converted_at, occupant_count, certified_at,
--         created_at, anonymized_at
--
--     owner_notes is cleared rather than retained: it is owner free text and
--     routinely restates applicant PII. disposition_reason exists so that
--     clearing owner_notes costs no defensibility.
-- =============================================================================

-- =============================================================================
-- 1. Seed the retention window into public.app_config
--
--    public.app_config (20260504162155) is the service-role-only key/value
--    table. ON CONFLICT (key) DO NOTHING is the established seed form
--    (20260722005310 Part 3): it makes the migration re-runnable and, more
--    importantly, PRESERVES AN OPERATOR-RAISED VALUE. Re-applying this file
--    must never silently walk a jurisdiction-specific 1460 back down to 730.
--
--    Raising the window needs no migration and no deploy - that is the entire
--    point of not hardcoding it:
--      update public.app_config set value = '1460'
--       where key = 'applications.retention_days';
-- =============================================================================

insert into public.app_config (key, value) values
  ('applications.retention_days', '730')
on conflict (key) do nothing;

-- =============================================================================
-- 2. public.anonymize_old_rental_applications()
--
--    Batching shape copied from cleanup_old_notifications()
--    (20260719202447): LIMIT 10000 + FOR UPDATE SKIP LOCKED to bound lock hold
--    time and WAL pressure, GET DIAGNOSTICS for the row count, RAISE NOTICE for
--    the cron run log. The one structural difference is stated in header (b).
--
--    SECURITY DEFINER with search_path pinned to public, per CLAUDE.md. No
--    auth.uid() check: this is a cron-invoked batch job with no caller identity,
--    and the grant discipline below - not a uid guard - is what keeps it off
--    every authenticated code path.
-- =============================================================================

create or replace function public.anonymize_old_rental_applications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days  integer;
  v_count integer := 0;
begin
  -- Both fallbacks are load-bearing and neither is redundant:
  --   nullif(value, '') covers a row that EXISTS with an empty string, which is
  --     how every other seeded config key in this project starts life;
  --   the coalesce below covers the row being ABSENT entirely, which is the
  --     state of any database this migration has not reached yet.
  -- Without both, v_days is NULL, make_interval() returns NULL, the comparison
  -- is never true, and the sweep silently anonymizes nothing forever - a
  -- fail-open with no error, no exception and no log line to notice (T-66-23).
  select coalesce(nullif(value, '')::integer, 730) into v_days
  from public.app_config
  where key = 'applications.retention_days';

  v_days := coalesce(v_days, 730);

  with due as (
    select id
    from public.rental_applications
    -- (1) already-swept rows must not be re-swept: the update is idempotent in
    --     effect but would burn a whole 10000-row batch re-clearing rows that
    --     hold nothing, starving the rows that still do.
    where anonymized_at is null
      -- (2) a converted application is NEVER anonymized by this sweep. Its
      --     applicant became a tenant, and that tenant record - not this clock
      --     - governs the data. Dropping this condition would clear PII the
      --     live tenant relationship still needs.
      and converted_tenant_id is null
      -- (3) coalesce(decided_at, created_at): a DECIDED application is clocked
      --     from the decision, an IGNORED one from submission. The
      --     rental_applications_decided_at_check constraint (20260806120000)
      --     guarantees a terminal-status row always has decided_at set, so a
      --     rejected application can never be aged off its submission date and
      --     swept early.
      and coalesce(decided_at, created_at) < now() - make_interval(days => v_days)
    -- Bounded batch. rental_applications_retention_idx is partial on exactly
    -- (anonymized_at is null and converted_tenant_id is null), so conditions
    -- (1) and (2) are satisfied by the index predicate itself.
    limit 10000
    for update skip locked
  )
  update public.rental_applications ra
  set applicant_first_name     = '[deleted]',
      applicant_last_name      = '[deleted]',
      applicant_email          = '[deleted]',
      applicant_phone          = null,
      desired_move_in_date     = null,
      current_street           = null,
      current_city             = null,
      current_state            = null,
      current_postal_code      = null,
      current_landlord_name    = null,
      current_landlord_phone   = null,
      reason_for_moving        = null,
      gross_monthly_income     = null,
      employer_name            = null,
      employer_role            = null,
      employer_months          = null,
      other_income_source      = null,
      other_income_amount      = null,
      pet_details              = null,
      vehicle_details          = null,
      reference_1_name         = null,
      reference_1_relationship = null,
      reference_1_phone        = null,
      reference_2_name         = null,
      reference_2_relationship = null,
      reference_2_phone        = null,
      -- Owner free text. Routinely restates applicant PII, so it goes; the
      -- closed-vocabulary disposition_reason survives in its place (D-11d).
      owner_notes              = null,
      submitted_ip             = null,
      submitted_user_agent     = null,
      anonymized_at            = now()
  from due
  where ra.id = due.id;

  get diagnostics v_count = row_count;

  raise notice 'anonymize_old_rental_applications: anonymized % row(s) at % day(s)',
    v_count, v_days;

  return v_count;
end;
$$;

comment on function public.anonymize_old_rental_applications() is
  'APPLY-05 retention sweep. Clears 29 applicant PII columns in place on non-converted rental_applications older than app_config applications.retention_days (default 730) measured from coalesce(decided_at, created_at), and stamps anonymized_at. 730 days, not 180: HUD complaint window is 1 year (42 U.S.C. 3610(a)(1)(A)(i)) and the federal civil window is 2 years (42 U.S.C. 3613(a)(1)(A)), tolled by 3613(a)(1)(B). Batched at 10000 rows with FOR UPDATE SKIP LOCKED. Writes no second copy of the data it clears (D-11c). Converted rows are excluded - the tenant record governs them. service_role-only.';

-- Grant discipline. Matches the newest retention/batch-job precedent in this
-- project (claim_lease_reminders, 20260722005310): revoked from PUBLIC and from
-- both Supabase client roles explicitly, granted only to service_role, which is
-- the identity pg_cron runs this under. No authenticated user can trigger a
-- cross-tenant PII wipe.
revoke all on function public.anonymize_old_rental_applications() from public, anon, authenticated;
grant execute on function public.anonymize_old_rental_applications() to service_role;

-- =============================================================================
-- 3. Schedule the sweep
--
--    Named SECURITY DEFINER function, never inline SQL in cron.schedule
--    (CLAUDE.md). The third argument is a single function call and nothing else.
--
--    SLOT CHOICE - D-16, verified against production 2026-08-06. Fifteen jobs
--    are active and the 3 AM UTC window is dense: minutes 0, 5, 10, 15, 20, 30,
--    45 and 50 are taken (cleanup-cron-history, cleanup-pg-net-responses,
--    cleanup-security-events, cleanup-errors, expire-trials,
--    cleanup-webhook-events, process-account-deletions, cleanup-notifications).
--    Free minutes: 25, 35, 40 and 55. This job takes :35.
--
--    THE ORDERING JUSTIFICATION IS NOT REPEATED HERE BECAUSE IT IS FALSE.
--    66-RESEARCH.md proposed :55 and justified it as running AFTER
--    process-account-deletions so the GDPR cascade lands first. At :35 that is
--    simply untrue: process-account-deletions is scheduled at :45
--    (20260306180000_gdpr_anonymize_cascade.sql:230, restated in
--    20260606205922_cron_stagger_index_cleanup.sql:6, and consistent with
--    D-16's live reading), so THIS JOB RUNS TEN MINUTES BEFORE IT, not after.
--
--    That is fine, and no justification is invented to pretend otherwise. The
--    two jobs converge on the same end state in either order: the cascade in
--    20260806123000 HARD DELETES a departing owner's applications, so a sweep
--    running first merely anonymizes rows the cascade then removes, and a sweep
--    running second finds nothing left to anonymize. The only requirement on
--    this slot is that it be free, and :35 is.
--
--    IDEMPOTENCE. cron.schedule upserts by jobname on current pg_cron, but the
--    explicit unschedule guard (form copied from 20260516054659) makes the
--    re-apply behaviour independent of that, and leaves no duplicate job row if
--    this file is ever applied twice.
-- =============================================================================

select cron.unschedule('anonymize-rental-applications') where exists (
  select 1 from cron.job where jobname = 'anonymize-rental-applications'
);

select cron.schedule(
  'anonymize-rental-applications',
  '35 3 * * *',
  $$select public.anonymize_old_rental_applications()$$
);
