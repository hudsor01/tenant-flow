-- =============================================================================
-- Phase 66 - Rental Application Intake: extend the GDPR cascade to the two new
-- tables (APPLY-05, D-12).
--
-- Adds exactly two statements to public.anonymize_deleted_user(uuid):
--
--   delete from public.rental_applications      where owner_user_id = p_user_id;
--   delete from public.rental_application_links where owner_user_id = p_user_id;
--
-- Everything else in this file is the pre-existing body, reproduced so that
-- CREATE OR REPLACE does not silently destroy it.
--
-- -----------------------------------------------------------------------------
-- (a) READ THIS BEFORE APPLYING. THE REPO COPY IS NOT AUTHORITATIVE.
--
--     CREATE OR REPLACE FUNCTION REPLACES THE WHOLE BODY. It does not merge, it
--     does not patch, and it does not conflict. Any statement present in the
--     live function but absent from this file is SILENTLY DELETED from
--     production the moment this migration runs - with no error, no warning and
--     no diff to review afterwards. A missing line here is a silent regression
--     of a shipped GDPR fix, not a merge conflict somebody notices.
--
--     The body below was transcribed from the repo's most recent recorded
--     definition, 20260720015620_retention_gdpr_and_writer_hardening.sql:25-64.
--     THAT COPY MAY ALREADY BE STALE RELATIVE TO PRODUCTION. This project has a
--     documented pattern of migrations being applied to prod through Supabase
--     MCP with prod-assigned timestamps and of repo/prod drift generally, so the
--     repo's newest file is evidence about the live body, not proof of it.
--
--     THEREFORE, MANDATORY IN PLAN 66-06 BEFORE THIS FILE IS APPLIED:
--
--       1. Fetch the live definition:
--            select pg_get_functiondef('public.anonymize_deleted_user(uuid)'::regprocedure);
--       2. Diff it against the body below.
--       3. IF THE LIVE BODY DIFFERS IN ANY WAY, THE LIVE BODY WINS. Update this
--          file to the live body plus the two new deletes, then apply. Do not
--          apply this file as written on the assumption the repo is current, and
--          do not "resolve" the difference in favour of the repo.
--
--     This is the reconcile step, not a suggestion. It is the only thing
--     standing between this migration and a repeat of the class of bug it
--     exists to fix.
--
-- -----------------------------------------------------------------------------
-- (b) WHY TWO LINES AND NOT FOUR - AND WHY THAT IS THE POINT.
--
--     The bug this cascade class already shipped once in this codebase: C2, in
--     20260720015620. anonymize_deleted_user() deleted a departing owner's rows
--     from public.notifications but never touched public.notifications_archive,
--     so their notification titles and messages sat in cold storage
--     indefinitely under a user who had exercised their right to erasure. The
--     fix was one line - a second delete against a second table nobody
--     remembered existed.
--
--     Phase 66 refuses to create that second table at all (D-11c; see
--     20260806122000_rental_applications_retention.sql header (b)). There is no
--     rental_applications_archive and no rental_application_links_archive, so
--     the cascade for two new tables is complete at two statements rather than
--     four. That is the strongest available form of the C2 fix: not a second
--     delete, but nothing to delete from.
--
-- -----------------------------------------------------------------------------
-- (c) WHY HARD DELETE HERE, WHEN THE NIGHTLY SWEEP ANONYMIZES.
--
--     anonymize_old_rental_applications() anonymizes because the LANDLORD still
--     exists and may still have to defend the decision - the stub is retained
--     for referential integrity and aggregate self-audit (D-11b).
--
--     None of that survives account deletion. Applications belong to a
--     departing owner: their fair-housing defence value dies with the account,
--     because there is no longer an owner to defend and no proceeding they can
--     be produced in. What remains is pure applicant PII held by nobody. So it
--     is removed outright rather than anonymized, which is also what makes the
--     order below correct - rental_applications.link_id is ON DELETE SET NULL
--     against rental_application_links, so deleting applications first avoids a
--     pointless set-null pass over rows that are about to disappear anyway.
--
--     Consistent with the rest of this function: it preserves financial records
--     intact, and it does NOT delete from auth.users - Supabase Auth handles
--     that separately.
--
-- -----------------------------------------------------------------------------
-- (d) THE ACTIVE-LEASE GUARD IS DELIBERATELY UNCHANGED.
--
--     anonymize_deleted_user() raises if the owner still has active leases.
--     APPLICATIONS ADD NO SUCH BLOCK, and no application-shaped clause was added
--     to that guard. An unreviewed application is not an obligation to anyone -
--     blocking deletion on one would trap an owner whose only outstanding item
--     is an application they never opened, which is a right-to-erasure failure
--     dressed up as a safety check.
--
-- -----------------------------------------------------------------------------
-- (e) NOT APPLIED BY THE PLAN THAT AUTHORS IT.
--
--     Plan 66-06 is the single blocking, owner-gated apply step; it runs this
--     through Supabase MCP apply_migration after performing step (a), then
--     reconciles this filename to the prod-assigned timestamp returned by
--     list_migrations. Authored in pure ASCII because the file's bytes pass
--     through a model on that hop.
--
--     Grants are untouched: 20260416193000 already revoked
--     anonymize_deleted_user(uuid) from everyone and granted it to service_role
--     only. CREATE OR REPLACE preserves the existing ACL, so re-granting here
--     would be noise at best and a widening at worst.
-- =============================================================================

create or replace function public.anonymize_deleted_user(p_user_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_has_active_leases boolean;
begin
  if not exists (select 1 from public.users where id = p_user_id) then
    raise exception 'user % not found', p_user_id;
  end if;

  select exists(
    select 1 from public.leases
    where owner_user_id = p_user_id and lease_status = 'active'
  ) into v_has_active_leases;

  if v_has_active_leases then
    raise exception 'Cannot delete account with active leases. Please end all leases first.';
  end if;

  update public.properties set status = 'inactive' where owner_user_id = p_user_id;
  update public.activity set description = '[deleted user activity]' where user_id = p_user_id;
  delete from public.notifications where user_id = p_user_id;
  delete from public.notifications_archive where user_id = p_user_id;
  delete from public.user_preferences where user_id = p_user_id;
  delete from public.notification_settings where user_id = p_user_id;

  -- Phase 66 (D-12). Applications belong to a departing owner; see header (c).
  -- Applications first: link_id is ON DELETE SET NULL against
  -- rental_application_links, so the reverse order would set-null rows that are
  -- being deleted in the same statement block.
  delete from public.rental_applications where owner_user_id = p_user_id;
  delete from public.rental_application_links where owner_user_id = p_user_id;

  update public.users
  set full_name = '[deleted user]',
      email = '[deleted-' || p_user_id::text || ']',
      first_name = null,
      last_name = null,
      phone = null,
      avatar_url = null,
      status = 'inactive'
  where id = p_user_id;
end;
$function$;
